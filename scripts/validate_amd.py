"""Smoke test for the AMD screening engine (plans/plan_AMD.txt) -- runs
AmdEngine (gamma+CLAHE enhancement + classifier, inference/amd_engine.py)
end-to-end on the 10 sample images exported by plans/Fundas_AMD_Training
.ipynb's last cell (amd_test/, labels.json has real ground truth from the
val split).

NOTE: n=10 is far too small to be a real accuracy measurement -- this is
only confirming the engine runs without crashing and that predictions look
directionally sane, NOT validating the model (see config/amd/config.json's
"notes" for why this model's own reported val_f1 is already suspect).

Usage:
    .venv\\Scripts\\python scripts\\validate_amd.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from inference.amd_engine import AmdEngine  # noqa: E402

SAMPLES_DIR = Path(__file__).resolve().parent.parent / "amd_test"


def main():
    labels_path = SAMPLES_DIR / "labels.json"
    if not labels_path.exists():
        print(f"No labels.json found at {labels_path} -- nothing to validate.")
        return
    manifest = json.loads(labels_path.read_text(encoding="utf-8"))

    engine = AmdEngine()
    print(f"Device: {engine.device}  Backbone: {engine.backbone_name}")
    print(f"gamma={engine.gamma}  clahe_clip_limit={engine.clahe_clip_limit}  tile={engine.clahe_tile_grid_size}")
    print(f"model_version={engine.model_version!r}  is_experimental={engine.is_experimental}\n")

    correct = 0
    for entry in manifest:
        image_path = SAMPLES_DIR / entry["filename"]
        result = engine.predict(image_path)
        is_correct = result["label"] == entry["true_label"]
        correct += is_correct
        mark = "OK" if is_correct else "WRONG"
        print(
            f"[{mark}] {entry['filename']}  true={entry['true_label']:6s}  "
            f"pred={result['label']:6s}  prob_amd={result['prob_amd']:.4f}"
        )

    print(f"\n{correct}/{len(manifest)} correct on this tiny sample.")
    print("Reminder: n=10 is a smoke test, NOT a validation -- see plan_AMD.txt.")


if __name__ == "__main__":
    main()
