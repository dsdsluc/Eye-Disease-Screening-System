"""Per-backbone inference + weighted ensemble, with all 20 models kept warm in VRAM.

See plans/archetechture.txt section 2.3/7: the first version reloaded all 20
checkpoints from disk on every predict() call (~30s/image, disk I/O bound).
Total weights are 9.6 GB in fp32 which doesn't fit the 8GB card alongside the
CUDA context, but at fp16 (~4.8GB) all 20 fit comfortably in the ~7.4GB free
VRAM -- so we load once (in InferenceEngine.__init__) and keep every model
resident for the life of the process; predict() then only does forward passes.

Second pass (see plans/archetechture.txt section 7): even warm, predict() was
still doing 20 sequential batch=1 forward calls, each followed by a `.item()`
that forces a host<->device sync -- so the GPU could never pipeline fold N+1's
kernels while fold N's were in flight. A backbone's 5 folds share architecture
and (per call) input, so model.py's stack_fold_models/batched_fold_forward
vmaps over the stacked fold weights instead: 4 batched forward passes (one per
backbone) instead of 20 sequential ones, and one `.tolist()` at the end of
predict() instead of 20 mid-loop `.item()` calls.
"""
from pathlib import Path

import cv2
import numpy as np
import torch

from inference import gradcam
from inference.config import BACKBONES, BEST_THRESHOLDS, BEST_WEIGHTS, NUM_FOLDS
from inference.model import DRModel, StackedFoldModels, batched_fold_forward, load_fold_model, stack_fold_models
from inference.preprocessing import load_and_crop, preprocess_for_backbone

# Grad-CAM is inherently blurry (upsampled from a 5x5/7x7 feature map), so
# there's nothing gained from encoding it at the original photo's resolution
# (often 2000px+) -- that only bloats the response/DB row. Downscale first.
EXPLAIN_DISPLAY_SIZE = 512


def _score_to_grade(score: float) -> int:
    grade = 0
    for threshold in BEST_THRESHOLDS:
        if score >= threshold:
            grade += 1
    return grade


class InferenceEngine:
    def __init__(self, device: str | None = None, half: bool | None = None):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        # fp16 only makes sense on GPU (and is what makes all 20 models fit in VRAM at once).
        self.half = self.device.type == "cuda" if half is None else half

        self._cache: dict[str, list[DRModel]] = {}
        self._stacked: dict[str, StackedFoldModels] = {}
        self._load_all_models()

    def _load_all_models(self) -> None:
        for backbone_name in BACKBONES:
            self._cache[backbone_name] = [
                load_fold_model(backbone_name, fold, self.device, half=self.half)
                for fold in range(NUM_FOLDS)
            ]
            # Stacked once here (not per predict() call) since the fold weights
            # never change after load -- only the input tensor varies per request.
            self._stacked[backbone_name] = stack_fold_models(self._cache[backbone_name])
        if self.device.type == "cuda":
            torch.cuda.empty_cache()  # defragment after the big batch of allocations

    def predict(self, image_path: str | Path) -> dict:
        cropped = load_and_crop(image_path)

        # One vmapped forward pass per backbone (NUM_FOLDS folds at once) instead
        # of NUM_FOLDS sequential batch=1 calls, and a single .tolist() at the end
        # instead of one .item() per fold -- .item() forces a host<->device sync,
        # so calling it 20 times serialized what the GPU could otherwise pipeline.
        fold_score_tensors = []
        with torch.no_grad():
            for backbone_name in BACKBONES:
                tensor = preprocess_for_backbone(cropped, backbone_name).unsqueeze(0).to(self.device)
                if self.half:
                    tensor = tensor.half()
                fold_score_tensors.append(batched_fold_forward(self._stacked[backbone_name], tensor))

        all_scores = torch.stack(fold_score_tensors).tolist()  # single sync, shape (num_backbones, NUM_FOLDS)
        per_fold_scores = {b: scores for b, scores in zip(BACKBONES, all_scores)}
        backbone_scores = {b: float(np.mean(scores)) for b, scores in per_fold_scores.items()}

        final_score = float(sum(backbone_scores[b] * w for b, w in zip(BACKBONES, BEST_WEIGHTS)))
        grade = _score_to_grade(final_score)

        return {
            "grade": grade,
            "score": final_score,
            "backbone_scores": backbone_scores,
            "per_fold_scores": per_fold_scores,
        }

    def explain(self, image_path: str | Path) -> dict:
        """Grad-CAM heatmap for the same image/ensemble predict() scores.

        Combined the same way the score is (per-backbone CAM averaged across
        its 5 folds, then a BEST_WEIGHTS-weighted sum across backbones), so
        the heatmap always reflects the same weighting as the grade it's
        explaining. Runs in eval() with autograd enabled -- this must NOT be
        wrapped in torch.no_grad(), unlike predict().
        """
        cropped = load_and_crop(image_path)
        h, w = cropped.shape[:2]
        scale = EXPLAIN_DISPLAY_SIZE / max(h, w)
        display = cv2.resize(cropped, (round(w * scale), round(h * scale)), interpolation=cv2.INTER_AREA)
        out_hw = display.shape[:2]

        backbone_cams = []
        for backbone_name in BACKBONES:
            tensor = preprocess_for_backbone(cropped, backbone_name).unsqueeze(0).to(self.device)
            if self.half:
                tensor = tensor.half()
            backbone_cams.append(gradcam.backbone_cam(self._cache[backbone_name], tensor, out_hw=out_hw))

        combined = sum(cam * w for cam, w in zip(backbone_cams, BEST_WEIGHTS))
        combined = np.clip(combined, 0, 1)

        return {"heatmap_png": gradcam.overlay_to_data_uri(display, combined)}
