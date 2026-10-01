"""Image-quality gatekeeper engine (plans/plan.txt Phase 1, plans/prep.txt,
plans/archetechture.txt section 10) -- wraps the QuickQual recipe (see
inference/quality_model.py's docstring for attribution/license context).

Preprocessing MUST match what quickqual_dn121_512.pkl was trained on, since
we're reusing their classifier as-is rather than fitting our own: their
README states inputs are "cropped to square without large black borders" at
512x512+, which is exactly what inference.preprocessing.load_and_crop already
produces for the DR pipeline (same dark-border crop, reused here) -- so,
unlike the original plans/prep.txt section 3.1 draft (which assumed a
purpose-built model free to look at the raw upload), this gatekeeper runs
the SAME crop as DR and must not skip it, or the feature vector lands off
the classifier's training distribution.

gate_mode stays a per-call decision, not baked into the engine (plans/
prep.txt section 1.1 wants both fail-open and fail-closed available).
"""
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from torchvision.transforms import functional as F

from inference.config import QUALITY_CONFIG
from inference.preprocessing import load_and_crop
from inference.quality_model import QUALITY_LABELS, load_quality_backbone, load_quality_classifier

GATE_MODES = ("fail_open", "fail_closed")

_NORM_MEAN = (0.5, 0.5, 0.5)
_NORM_STD = (0.5, 0.5, 0.5)
_RESIZE_SHORT_SIDE = 512  # matches QuickQual's `F.resize(img, 512)` (aspect-preserving)


def _preprocess(cropped_rgb: np.ndarray, device: torch.device) -> torch.Tensor:
    img = Image.fromarray(cropped_rgb)
    img = F.resize(img, _RESIZE_SHORT_SIDE)
    tensor = F.to_tensor(img)
    tensor = F.normalize(tensor, _NORM_MEAN, _NORM_STD)
    return tensor.unsqueeze(0).to(device)


class QualityEngine:
    def __init__(self, device: str | None = None):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.backbone = load_quality_backbone(self.device)
        self.classifier = load_quality_classifier()
        self.default_gate_mode = QUALITY_CONFIG.get("gate_mode", "fail_open")

    def check(self, image_path: str | Path, gate_mode: str | None = None) -> dict:
        gate_mode = gate_mode or self.default_gate_mode
        if gate_mode not in GATE_MODES:
            raise ValueError(f"Unknown gate_mode {gate_mode!r}, expected one of {GATE_MODES}")

        cropped = load_and_crop(image_path)
        tensor = _preprocess(cropped, self.device)

        with torch.no_grad():
            features = self.backbone(tensor).squeeze(0).cpu().reshape(1, -1).numpy()
        probs = self.classifier.predict_proba(features)[0]  # column order: QUALITY_LABELS

        label = QUALITY_LABELS[int(np.argmax(probs))]
        # "usable" always passes through regardless of gate_mode (plans/
        # prep.txt 1.2): it's the flagged-but-shown middle tier, not a
        # rejection tier.
        blocked = gate_mode == "fail_closed" and label == "reject"

        return {
            "label": label,
            "probs": dict(zip(QUALITY_LABELS, (float(p) for p in probs))),
            "gate_mode": gate_mode,
            "blocked": blocked,
        }
