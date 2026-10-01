"""Image-quality gatekeeper (plans/plan.txt Phase 1) -- reuses QuickQual's
published method (not its weights file, which carries no OSS license -- see
plans/archetechture.txt section 10 for the license research and the "local/
personal use, not commercial" scope this was cleared for):
https://github.com/justinengelmann/QuickQual (Engelmann & MacGillivray, 2023)
"QuickQual: Lightweight, convenient retinal image quality scoring with
off-the-shelf pretrained models". Built on Fu et al.'s EyeQ dataset/labels:
https://github.com/HzFu/EyeQ

The recipe (verbatim from QuickQual's README/notebook, which is what makes
this a "download and use" component rather than something we trained):
  - Feature extractor: `timm.create_model("densenet121.tv_in1k", pretrained=True,
    num_classes=0)` -- stock ImageNet weights, no EyeQ-specific fine-tuning at
    all. Frozen, eval mode.
  - Classifier: an sklearn Pipeline (StandardScaler + SVC(probability=True))
    trained BY QUICKQUAL'S AUTHORS on EyeQ features, shipped as
    quickqual_dn121_512.pkl (downloaded manually into models/quality/ --
    see plans/archetechture.txt section 10 for the exact release URL).
  - predict_proba's column order is fixed by how they trained it:
    [Good, Usable, Bad] -- QUALITY_LABELS below must stay in this order.
"""
import joblib
import timm
import torch
from torch import nn

from inference.config import QUALITY_CHECKPOINT_PATH, QUALITY_CONFIG

# Order predict_proba returns columns in -- fixed by the pickled classifier,
# NOT configurable. "bad" is QuickQual's name for EyeQ's "Reject" class; kept
# as "reject" here to match this project's own gate_mode vocabulary
# (plans/prep.txt section 1.2).
QUALITY_LABELS = ("good", "usable", "reject")


def load_quality_backbone(device: torch.device) -> nn.Module:
    model = timm.create_model(QUALITY_CONFIG["backbone"], pretrained=True, num_classes=0)
    model.to(device)
    model.eval()
    return model


def load_quality_classifier():
    # joblib.load on a scikit-learn Pipeline pickled with an older sklearn
    # (1.2.2) logs an InconsistentVersionWarning under our 1.7.2 -- verified
    # predict_proba still numerically works (see the ad-hoc check run while
    # wiring this up); only its __repr__/get_params path is broken across
    # that version gap, which this codebase never calls.
    return joblib.load(QUALITY_CHECKPOINT_PATH)
