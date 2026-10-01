"""Model definition for the AMD specialist screen (plans/plan.txt Phase 3,
plans/plan_AMD.txt). Single timm backbone + linear head producing 1 raw
logit (sigmoid = P(amd)) -- same binary shape as inference/glaucoma_model.py.

Trained on AMDNet23 (Kaggle, compiled from 6 public sources), whose author
pre-processed every image with gamma correction + CLAHE before publishing
it (exact parameters unknown). inference/amd_engine.py applies its own
gamma+CLAHE approximation before calling this model to reduce the resulting
train/inference distribution mismatch -- this module only defines the
classifier itself.

NOT end-to-end validated (plans/plan_AMD.txt) -- training log shows classic
overfitting (train_loss collapsed to ~0.0001, val_recall pinned at 1.0 for
most epochs) on a small, 6-source dataset. Deployed anyway per explicit user
decision (not a priority feature for this project); config/amd/config.json's
"notes" carries the full caveat for anything downstream that surfaces this
model's confidence to a user.
"""
import timm
import torch
from torch import nn

from inference.config import AMD_CHECKPOINT_PATH, AMD_CONFIG


class AmdModel(nn.Module):
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


def load_amd_model(device: torch.device, half: bool = False) -> AmdModel:
    model = AmdModel(
        AMD_CONFIG["backbone"],
        dropout=AMD_CONFIG.get("dropout", 0.3),
    )
    checkpoint = torch.load(AMD_CHECKPOINT_PATH, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])

    model.to(device)
    if half:
        model.half()
    model.eval()
    return model
