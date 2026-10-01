"""Central place to read the JSON/npy files already checked into config/."""
import json
from pathlib import Path

import numpy as np

ROOT_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = ROOT_DIR / "config"
MODELS_DIR = ROOT_DIR / "models"

with open(CONFIG_DIR / "config.json", encoding="utf-8") as f:
    MODEL_CONFIG = json.load(f)

BACKBONES: list[str] = MODEL_CONFIG["backbones"]
NUM_FOLDS: int = MODEL_CONFIG["num_folds"]
IMAGE_SIZE: int = MODEL_CONFIG["image_size"]

with open(CONFIG_DIR / "model_manifest.json", encoding="utf-8") as f:
    MODEL_MANIFEST = json.load(f)

BACKBONE_METADATA = {}
for backbone in BACKBONES:
    with open(CONFIG_DIR / backbone / "metadata.json", encoding="utf-8") as f:
        BACKBONE_METADATA[backbone] = json.load(f)

with open(CONFIG_DIR / "ensemble" / "metadata.json", encoding="utf-8") as f:
    ENSEMBLE_METADATA = json.load(f)

# best_weights[i] / best_thresholds correspond to BACKBONES order in config.json.
BEST_WEIGHTS = np.load(CONFIG_DIR / "ensemble" / ENSEMBLE_METADATA["weights_file"])
BEST_THRESHOLDS = np.load(CONFIG_DIR / "ensemble" / ENSEMBLE_METADATA["thresholds_file"])

# Image-quality gatekeeper (plans/plan.txt Phase 1) -- a separate single-model
# task from the DR ensemble above, its own config/models subtree so it can be
# retrained/swapped independently (see plans/archetechture.txt section 9.1's
# config/<task>/<backbone>/ layout proposal).
with open(CONFIG_DIR / "quality" / "config.json", encoding="utf-8") as f:
    QUALITY_CONFIG = json.load(f)

QUALITY_CHECKPOINT_PATH = MODELS_DIR / "quality" / QUALITY_CONFIG["checkpoint"]

# Multi-disease fundus screening (plans/plan.txt Phase 2) -- another separate
# single-model task, own config/models subtree (same config/<task>/<backbone>/
# pattern as quality above and proposed in plans/archetechture.txt section 9.1).
with open(CONFIG_DIR / "multidisease" / "config.json", encoding="utf-8") as f:
    MULTIDISEASE_CONFIG = json.load(f)

MULTIDISEASE_CHECKPOINT_PATH = MODELS_DIR / "multidisease" / MULTIDISEASE_CONFIG["checkpoint"]

# Glaucoma specialist screen (plans/plan.txt Phase 3, plans/prep.txt) -- same
# config/<task>/<backbone>/ pattern as quality/multidisease above.
with open(CONFIG_DIR / "glaucoma" / "config.json", encoding="utf-8") as f:
    GLAUCOMA_CONFIG = json.load(f)

GLAUCOMA_CHECKPOINT_PATH = MODELS_DIR / "glaucoma" / GLAUCOMA_CONFIG["checkpoint"]

# AMD specialist screen (plans/plan.txt Phase 3, plans/plan_AMD.txt) -- same
# config/<task>/<backbone>/ pattern as quality/multidisease/glaucoma above.
# NOT end-to-end validated (see config's own "notes") -- deployed anyway per
# explicit user decision, plans/plan_AMD.txt.
with open(CONFIG_DIR / "amd" / "config.json", encoding="utf-8") as f:
    AMD_CONFIG = json.load(f)

AMD_CHECKPOINT_PATH = MODELS_DIR / "amd" / AMD_CONFIG["checkpoint"]

# Cataract specialist screen (plans/plan_cataract.txt) -- same config/
# <task>/<backbone>/ pattern as the others above, EXCEPT this is the only
# task that does NOT use fundus photos (anterior/external eye photo
# instead) -- see inference/cataract_engine.py, which does not reuse
# inference/preprocessing.py's load_and_crop for that reason.
with open(CONFIG_DIR / "cataract" / "config.json", encoding="utf-8") as f:
    CATARACT_CONFIG = json.load(f)

CATARACT_CHECKPOINT_PATH = MODELS_DIR / "cataract" / CATARACT_CONFIG["checkpoint"]

# Modality gatekeeper (inference/modality_gate.py, plans/archetechture.txt
# "Van de B") -- zero-shot CLIP, no checkpoint of its own (pretrained weights
# auto-downloaded/cached by open_clip on first use), just the text prompts.
with open(CONFIG_DIR / "modality_gate" / "config.json", encoding="utf-8") as f:
    MODALITY_GATE_CONFIG = json.load(f)


def fold_checkpoint_path(backbone: str, fold: int) -> Path:
    return MODELS_DIR / backbone / f"fold_{fold}_best.pth"


def manifest_entry(backbone: str, fold: int) -> dict:
    for entry in MODEL_MANIFEST["models"]:
        if entry["backbone"] == backbone and entry["fold"] == fold:
            return entry
    raise KeyError(f"No manifest entry for {backbone} fold {fold}")
