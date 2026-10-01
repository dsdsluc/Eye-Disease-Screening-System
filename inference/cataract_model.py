"""Model definition for the cataract specialist screen (plans/plan_
cataract.txt) -- single timm backbone + linear head producing 1 raw logit
(sigmoid = P(cataract)), same binary shape as inference/glaucoma_model.py
and inference/amd_model.py.

Trained on anterior/external eye photos (NOT fundus) from a Google-Image-
Search-collected Kaggle dataset -- see config/cataract/config.json's
"known_caveats" for the full list of confounds investigated (resolution,
sharpness, color, composition) before this checkpoint was accepted, and the
still-unresolved inference-time limitation around the training-time blur
equalization not being reproducible at inference (label-conditional).
"""
import timm
import torch
from torch import nn

from inference.config import CATARACT_CHECKPOINT_PATH, CATARACT_CONFIG


class CataractModel(nn.Module):
    def __init__(self, backbone_name: str, dropout: float = 0.3):
        super().__init__()
        self.backbone = timm.create_model(backbone_name, pretrained=False, num_classes=0)
        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(self.backbone.num_features, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self.backbone(x)
        return self.classifier(features).squeeze(-1)  # raw logit; caller applies sigmoid


def load_cataract_model(device: torch.device, half: bool = False) -> CataractModel:
    model = CataractModel(
        CATARACT_CONFIG["backbone"],
        dropout=CATARACT_CONFIG.get("dropout", 0.3),
    )
    checkpoint = torch.load(CATARACT_CHECKPOINT_PATH, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])

    model.to(device)
    if half:
        model.half()
    model.eval()
    return model
