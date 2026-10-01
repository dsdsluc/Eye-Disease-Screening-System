"""Glaucoma specialist screening engine (plans/plan.txt Phase 3, plans/
plan_glaucoma.txt) -- wraps the ACRIMA+ORIGA+RIM-ONE binary classifier
(inference/glaucoma_model.py) PLUS an automatic optic-disc-crop step, since
that classifier was trained on images tightly cropped around the optic disc,
not full 45-degree fundus photos like the rest of this system (plans/
plan_glaucoma.txt section 1 -- confirmed by visually inspecting real training
samples, not a theoretical concern).

"Huong A" from plans/plan_glaucoma.txt section 2.1: instead of retraining on
a full-fundus dataset, localize the optic disc in the incoming full fundus
photo (fundus_image_toolbox's pretrained fovea/OD localization model, MIT
licensed, weights from Zenodo -- see requirements.txt) and crop a window
around it before handing the image to the existing glaucoma classifier. The
crop fraction (config/glaucoma/config.json's od_crop_fraction) was picked by
visually comparing auto-cropped test_images/ photos against real ACRIMA/
RIM-ONE training samples side by side (2026-08-31) -- not measured from the
source datasets' own documented crop convention, since none publish one.
"""
from pathlib import Path

import numpy as np
import torch
from PIL import Image

from fundus_image_toolbox.fovea_od_localization import load_fovea_od_model
from inference.config import GLAUCOMA_CONFIG
from inference.glaucoma_model import load_glaucoma_model
from inference.preprocessing import load_and_crop, preprocess_for_backbone

LABELS = GLAUCOMA_CONFIG["labels"]  # ["normal", "glaucoma"]


class GlaucomaEngine:
    def __init__(self, device: str | None = None):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.backbone_name = GLAUCOMA_CONFIG["backbone"]
        self.od_crop_fraction = GLAUCOMA_CONFIG.get("od_crop_fraction", 0.35)
        self.model_version = GLAUCOMA_CONFIG.get("trained_on", "unknown")
        self.is_experimental = GLAUCOMA_CONFIG.get("is_experimental", True)

        # od_model returns (model, checkpoint_path) -- see fundus_image_toolbox
        # .fovea_od_localization.train_multi.load_model.
        self.od_model, _ = load_fovea_od_model(device=str(self.device))
        self.model = load_glaucoma_model(self.device)

    def _crop_optic_disc(self, cropped_rgb: np.ndarray, od_x: float, od_y: float) -> np.ndarray:
        h, w = cropped_rgb.shape[:2]
        side = int(min(w, h) * self.od_crop_fraction)
        x0 = int(max(0, min(w - side, od_x - side / 2)))
        y0 = int(max(0, min(h - side, od_y - side / 2)))
        return cropped_rgb[y0: y0 + side, x0: x0 + side]

    @torch.no_grad()
    def predict(self, image_path: str | Path) -> dict:
        cropped = load_and_crop(image_path)  # full fundus, black border removed

        _f_x, _f_y, od_x, od_y = self.od_model.predict(Image.fromarray(cropped))
        disc_crop = self._crop_optic_disc(cropped, float(od_x), float(od_y))

        tensor = preprocess_for_backbone(disc_crop, self.backbone_name)
        tensor = tensor.unsqueeze(0).to(self.device)

        logit = self.model(tensor)
        prob_glaucoma = torch.sigmoid(logit).item()
        label = LABELS[1] if prob_glaucoma >= 0.5 else LABELS[0]

        return {
            "label": label,
            "prob_glaucoma": float(prob_glaucoma),
            "optic_disc_center": {"x": float(od_x), "y": float(od_y)},
            "model_version": self.model_version,
            "is_experimental": self.is_experimental,
        }
