"""AMD (age-related macular degeneration) screening engine (plans/plan.txt
Phase 3, plans/plan_AMD.txt) -- wraps the AMDNet23-trained binary classifier
(inference/amd_model.py) with a gamma-correction + CLAHE enhancement step,
since the training images were pre-processed this way by the dataset author
before we ever saw them (plans/plan_AMD.txt, AMDNet23 description). Skipping
this step would mean classifying on a visibly different color/contrast
distribution than the model learned from -- confirmed by eye when previewing
training images (2026-09-02): AMDNet23 samples showed inconsistent, often
unnatural color casts (greenish, washed-out yellow, magenta) compared to
this system's own raw fundus uploads (test_images/).

Unlike glaucoma's optic-disc auto-crop (a geometric correction), this is a
color/contrast correction -- no external localization model needed, just
OpenCV. Applied AFTER load_and_crop (so the black background border doesn't
skew CLAHE's local histogram) and BEFORE preprocess_for_backbone.

The exact gamma/CLAHE parameters AMDNet23's author used were never
published -- config/amd/config.json's gamma/clahe_* values are a reasonable,
commonly-used approximation (gamma=1.2, CLAHE clipLimit=2.0 on the LAB
L-channel), not a verified replication. See config/amd/config.json's "notes"
for the full caveat: this model is NOT end-to-end validated and its training
log shows signs of overfitting -- deployed anyway per explicit user decision,
not because the numbers are trusted the way glaucoma's are.
"""
from pathlib import Path

import cv2
import numpy as np
import torch

from inference.amd_model import load_amd_model
from inference.config import AMD_CONFIG
from inference.preprocessing import load_and_crop, preprocess_for_backbone

LABELS = AMD_CONFIG["labels"]  # ["normal", "amd"]


def _gamma_correct(rgb: np.ndarray, gamma: float) -> np.ndarray:
    inv_gamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in range(256)], dtype=np.uint8)
    return cv2.LUT(rgb, table)


def _clahe(rgb: np.ndarray, clip_limit: float, tile_grid_size: tuple[int, int]) -> np.ndarray:
    # CLAHE on the L channel only (LAB space) so contrast is boosted without
    # distorting hue/saturation -- standard approach for fundus preprocessing.
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tuple(tile_grid_size))
    l_channel = clahe.apply(l_channel)
    lab = cv2.merge((l_channel, a_channel, b_channel))
    return cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)


class AmdEngine:
    def __init__(self, device: str | None = None):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.backbone_name = AMD_CONFIG["backbone"]
        self.gamma = AMD_CONFIG.get("gamma", 1.2)
        self.clahe_clip_limit = AMD_CONFIG.get("clahe_clip_limit", 2.0)
        self.clahe_tile_grid_size = tuple(AMD_CONFIG.get("clahe_tile_grid_size", [8, 8]))
        self.model_version = AMD_CONFIG.get("trained_on", "unknown")
        self.is_experimental = AMD_CONFIG.get("is_experimental", True)

        self.model = load_amd_model(self.device)

    def _enhance(self, cropped_rgb: np.ndarray) -> np.ndarray:
        enhanced = _gamma_correct(cropped_rgb, self.gamma)
        enhanced = _clahe(enhanced, self.clahe_clip_limit, self.clahe_tile_grid_size)
        return enhanced

    @torch.no_grad()
    def predict(self, image_path: str | Path) -> dict:
        cropped = load_and_crop(image_path)
        enhanced = self._enhance(cropped)

        tensor = preprocess_for_backbone(enhanced, self.backbone_name)
        tensor = tensor.unsqueeze(0).to(self.device)

        logit = self.model(tensor)
        prob_amd = torch.sigmoid(logit).item()
        label = LABELS[1] if prob_amd >= 0.5 else LABELS[0]

        return {
            "label": label,
            "prob_amd": float(prob_amd),
            "model_version": self.model_version,
            "is_experimental": self.is_experimental,
        }
