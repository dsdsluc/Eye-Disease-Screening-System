"""Multi-disease fundus screening engine (plans/plan.txt Phase 2, plans/
plan_multidisease.txt) -- wraps the single-backbone ODIR-5K baseline defined
in inference/multidisease_model.py.

Deliberately NOT modeled on InferenceEngine's ensemble/vmap machinery (see
archetechture.txt section 7.2): there is exactly one backbone and no folds
here, so a plain forward pass is all there is. It IS modeled on
QualityEngine's shape (load once at startup, keep resident, plain .predict()
method) since both are single-model side tasks separate from the DR
ensemble.

This engine only reports a probability distribution over 8 single-label
categories -- it does NOT decide pass/fail or blocked/not-blocked like
QualityEngine's gate_mode, because plans/plan_multidisease.txt section 2
deliberately keeps this feature decoupled from the main DR flow: callers
(the future web/ route, per plans/plan_multidisease.txt section 4) decide
how to surface the result, and MUST show the experimental-accuracy
disclaimer carried in MULTIDISEASE_CONFIG rather than trusting a raw label.
"""
from pathlib import Path

import numpy as np
import torch

from inference.config import MULTIDISEASE_CONFIG
from inference.multidisease_model import load_multidisease_model
from inference.preprocessing import load_and_crop, preprocess_for_backbone

LABELS: list[str] = MULTIDISEASE_CONFIG["labels"]


class MultiDiseaseEngine:
    def __init__(self, device: str | None = None):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.backbone_name = MULTIDISEASE_CONFIG["backbone"]
        self.model = load_multidisease_model(self.device)
        self.model_version = MULTIDISEASE_CONFIG.get("trained_on", "unknown")
        self.is_experimental = MULTIDISEASE_CONFIG.get("is_experimental", True)

    @torch.no_grad()
    def predict(self, image_path: str | Path) -> dict:
        cropped = load_and_crop(image_path)
        tensor = preprocess_for_backbone(cropped, self.backbone_name)
        tensor = tensor.unsqueeze(0).to(self.device)

        logits = self.model(tensor)
        probs = torch.softmax(logits, dim=1).squeeze(0).cpu().numpy()

        order = np.argsort(probs)[::-1]
        top3 = [{"label": LABELS[i], "prob": float(probs[i])} for i in order[:3]]

        return {
            "top_label": top3[0]["label"],
            "top_prob": top3[0]["prob"],
            "top3": top3,
            "probs": {label: float(p) for label, p in zip(LABELS, probs)},
            "model_version": self.model_version,
            "is_experimental": self.is_experimental,
        }
