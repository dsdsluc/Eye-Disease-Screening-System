"""Model definition for the multi-disease fundus screening baseline (plans/
plan.txt Phase 2). Single timm backbone + linear head over 8 ODIR-5K
categories (normal/diabetes/glaucoma/cataract/amd/hypertension/myopia/other)
-- NOT an ensemble like DRModel, and NOT true multi-label (see scripts/
train_multidisease.py's docstring: the ODIR-5K derived per-eye labels used
here are single-dominant-condition per eye, so this is 8-way single-label
classification, a "quick baseline" in the sense plans/plan.txt Phase 2 asked
for, not a calibrated multi-label detector).
"""
import timm
import torch
from torch import nn

from inference.config import MULTIDISEASE_CHECKPOINT_PATH, MULTIDISEASE_CONFIG


class MultiDiseaseModel(nn.Module):
    def __init__(self, backbone_name: str, num_classes: int, dropout: float = 0.3):
        super().__init__()
        self.backbone = timm.create_model(backbone_name, pretrained=False, num_classes=0)
        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(self.backbone.num_features, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self.backbone(x)
        return self.classifier(features)  # raw logits; caller applies softmax


def load_multidisease_model(device: torch.device, half: bool = False) -> MultiDiseaseModel:
    model = MultiDiseaseModel(
        MULTIDISEASE_CONFIG["backbone"],
        num_classes=len(MULTIDISEASE_CONFIG["labels"]),
        dropout=MULTIDISEASE_CONFIG.get("dropout", 0.3),
    )
    checkpoint = torch.load(MULTIDISEASE_CHECKPOINT_PATH, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])

    model.to(device)
    if half:
        model.half()
    model.eval()
    return model
