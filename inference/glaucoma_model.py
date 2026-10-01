"""Model definition for the glaucoma specialist screen (plans/plan.txt Phase
3, plans/prep.txt, plans/Fundas_Glaucoma_Training.ipynb). Single timm
backbone + linear head producing 1 raw logit (sigmoid = P(glaucoma)) --
binary, NOT the 8-way multi-label head used by inference/multidisease_model.py.

Trained on ACRIMA + ORIGA + RIM-ONE, all three of which turned out to be
tight crops centered on the optic disc rather than full 45-degree fundus
photos (see plans/plan_glaucoma.txt section 1) -- this model's input MUST be
an optic-disc-centered crop, never a raw full fundus photo. inference/
glaucoma_engine.py handles producing that crop (via automatic optic disc
localization, plans/plan_glaucoma.txt section 2.1, "Huong A") before calling
this model; this module only defines the classifier itself.
"""
import timm
import torch
from torch import nn

from inference.config import GLAUCOMA_CHECKPOINT_PATH, GLAUCOMA_CONFIG


class GlaucomaModel(nn.Module):
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


def load_glaucoma_model(device: torch.device, half: bool = False) -> GlaucomaModel:
    model = GlaucomaModel(
        GLAUCOMA_CONFIG["backbone"],
        dropout=GLAUCOMA_CONFIG.get("dropout", 0.3),
    )
    checkpoint = torch.load(GLAUCOMA_CHECKPOINT_PATH, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])

    model.to(device)
    if half:
        model.half()
    model.eval()
    return model
