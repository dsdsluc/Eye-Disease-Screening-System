"""Grad-CAM for the DR-grading ensemble.

Each backbone's DRModel wraps `timm.create_model(..., num_classes=0)` (see
model.py) + a Dropout->Linear regressor. `DRModel.forward` calls
`self.backbone(x)`, which timm pools internally before returning -- that
discards exactly the spatial map Grad-CAM needs. So this bypasses
`DRModel.forward` and calls `backbone.forward_features` (pre-pool spatial
map) + `backbone.forward_head(..., pre_logits=True)` (the same pooling,
kept separate) directly, so the spatial map stays around for the gradient.

Combined the same way the score itself is combined (see inference.py): CAM
per fold -> mean across a backbone's 5 folds -> weighted sum across the 4
backbones using the same BEST_WEIGHTS used for the score -- so the heatmap
and the grade it's explaining are always the product of the same weighting.
"""
import base64

import cv2
import numpy as np
import torch
import torch.nn.functional as F

from inference.model import DRModel


def _single_model_cam(model: DRModel, tensor: torch.Tensor) -> np.ndarray:
    """(H, W) float32 array in [0, 1] at the backbone's own feature-map
    resolution (5x5 for the Inception family, 7x7 for SE-ResNeXt)."""
    feat_map = model.backbone.forward_features(tensor)
    pooled = model.backbone.forward_head(feat_map, pre_logits=True)
    score = model.regressor(pooled).squeeze()

    # autograd.grad (not .backward()) so we never populate .grad on any of
    # the model's own parameters -- those 20 models stay resident in VRAM
    # for the whole process, and per-parameter grad buffers would roughly
    # double their footprint for no reason since we only need d(score)/d(feat_map).
    grads = torch.autograd.grad(score, feat_map)[0].float()
    activations = feat_map.detach().float()

    weights = grads.mean(dim=(2, 3), keepdim=True)  # (1, C, 1, 1)
    cam = F.relu((weights * activations).sum(dim=1)).squeeze(0)  # (H, W)

    cam_min, cam_max = cam.min(), cam.max()
    if (cam_max - cam_min).item() < 1e-8:
        return np.zeros(cam.shape, dtype=np.float32)
    cam = (cam - cam_min) / (cam_max - cam_min)
    return cam.detach().cpu().numpy()


def backbone_cam(fold_models: list[DRModel], tensor: torch.Tensor, out_hw: tuple[int, int]) -> np.ndarray:
    """Grad-CAM averaged across one backbone's folds, resized to out_hw = (H, W)."""
    cams = [_single_model_cam(model, tensor) for model in fold_models]
    avg = np.mean(cams, axis=0)
    resized = cv2.resize(avg, (out_hw[1], out_hw[0]), interpolation=cv2.INTER_CUBIC)
    return np.clip(resized, 0, 1)


def overlay_to_data_uri(base_rgb: np.ndarray, cam: np.ndarray, alpha: float = 0.45) -> str:
    """base_rgb: HxWx3 uint8 original (cropped) photo. cam: HxW float in [0, 1],
    same size. Returns a data: URI PNG, ready to use directly as an <img src>."""
    heat_u8 = np.uint8(255 * cam)
    heat_color_bgr = cv2.applyColorMap(heat_u8, cv2.COLORMAP_JET)
    heat_color_rgb = cv2.cvtColor(heat_color_bgr, cv2.COLOR_BGR2RGB)

    overlay = (base_rgb.astype(np.float32) * (1 - alpha) + heat_color_rgb.astype(np.float32) * alpha).astype(
        np.uint8
    )
    ok, buf = cv2.imencode(".png", cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
    if not ok:
        raise RuntimeError("Failed to encode heatmap overlay as PNG")
    b64 = base64.b64encode(buf.tobytes()).decode("ascii")
    return f"data:image/png;base64,{b64}"
