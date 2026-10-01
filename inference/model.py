"""Model definition matching the checkpoints' state_dict keys exactly.

Confirmed by inspecting models/*/fold_0_best.pth: every checkpoint has
'backbone.*' (timm feature extractor, num_classes=0) and 'regressor.1.*'
(a Linear after a Dropout) keys, i.e. the training code built each model as

    backbone   = timm.create_model(name, pretrained=..., num_classes=0)
    regressor  = nn.Sequential(nn.Dropout(p), nn.Linear(backbone.num_features, 1))

and trained it as a single-value regression (later thresholded into 5 classes,
matching the "optimized_qwk" ensemble method in config/ensemble/metadata.json).
"""
import copy

import timm
import torch
from torch import nn
from torch.func import functional_call, stack_module_state, vmap

from inference.config import BACKBONE_METADATA, fold_checkpoint_path


class DRModel(nn.Module):
    def __init__(self, backbone_name: str, dropout: float):
        super().__init__()
        self.backbone = timm.create_model(backbone_name, pretrained=False, num_classes=0)
        self.regressor = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(self.backbone.num_features, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self.backbone(x)
        return self.regressor(features).squeeze(1)


def load_fold_model(
    backbone_name: str, fold: int, device: torch.device, half: bool = False
) -> DRModel:
    dropout = BACKBONE_METADATA[backbone_name]["dropout"]
    model = DRModel(backbone_name, dropout)

    ckpt_path = fold_checkpoint_path(backbone_name, fold)
    # weights_only=False: these are our own training checkpoints (trusted source),
    # not weights_only=True-compatible because they also bundle optimizer/scheduler state.
    checkpoint = torch.load(ckpt_path, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])

    model.to(device)
    if half:
        model.half()
    model.eval()
    return model


# A backbone's NUM_FOLDS models are architecturally identical (same
# backbone_name/dropout) and, in predict(), always fed the same input image --
# calling them one at a time is NUM_FOLDS sequential batch=1 forward passes,
# which is mostly kernel-launch/dispatch overhead rather than GPU compute.
# Stack their weights once at load time so predict() can instead run all
# folds of a backbone as a single vmapped forward pass. This is the
# ensembling recipe from the torch.func docs: params/buffers are stacked
# along a new leading dim and vmapped over (in_dims=0), while the shared
# input is broadcast to every fold (in_dims=None).
StackedFoldModels = tuple[dict[str, torch.Tensor], dict[str, torch.Tensor], DRModel]


def stack_fold_models(models: list[DRModel]) -> StackedFoldModels:
    params, buffers = stack_module_state(models)
    base_model = copy.deepcopy(models[0]).to("meta")
    base_model.eval()
    return params, buffers, base_model


def batched_fold_forward(stacked: StackedFoldModels, x: torch.Tensor) -> torch.Tensor:
    """Run every fold of one backbone in one forward pass; returns shape (NUM_FOLDS,)."""
    params, buffers, base_model = stacked

    def _run(p: dict[str, torch.Tensor], b: dict[str, torch.Tensor]) -> torch.Tensor:
        return functional_call(base_model, (p, b), (x,))

    return vmap(_run, in_dims=(0, 0))(params, buffers).reshape(-1)
