"""Smoke test for the cataract screening engine (plans/plan_cataract.txt)
-- runs CataractEngine (eye-ROI auto-crop + classifier, inference/
cataract_engine.py) end-to-end on the 10 sample images exported by
plans/Fundas_Cataract_Training.ipynb's last cell (cataract_test/,
labels.json has real ground truth from the val split).

NOTE: n=10 is far too small to be a real accuracy measurement -- this only
confirms the engine runs without crashing. It also confirms whether the
eye-ROI auto-crop actually FIRES on these images (expected: NO, since they
are already tight close-up crops with little/no surrounding face for the
face detector to key off of -- see inference/cataract_engine.py docstring).

Usage:
    .venv\\Scripts\\python scripts\\validate_cataract.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from inference.cataract_engine import CataractEngine  # noqa: E402

SAMPLES_DIR = Path(__file__).resolve().parent.parent / "cataract_test"


def main():
    labels_path = SAMPLES_DIR / "labels.json"
    if not labels_path.exists():
        print(f"No labels.json found at {labels_path} -- nothing to validate.")
        return
    manifest = json.loads(labels_path.read_text(encoding="utf-8"))

    engine = CataractEngine()
    print(f"Device: {engine.device}")
    print(f"model_version={engine.model_version!r}  is_experimental={engine.is_experimental}\n")

    correct = 0
    n_cropped = 0
    for entry in manifest:
        image_path = SAMPLES_DIR / entry["filename"]
        result = engine.predict(image_path)
        is_correct = result["label"] == entry["true_label"]
        correct += is_correct
        n_cropped += result["eye_crop_applied"]
        mark = "OK" if is_correct else "WRONG"
        print(
            f"[{mark}] {entry['filename']}  true={entry['true_label']:9s}  "
            f"pred={result['label']:9s}  prob_cataract={result['prob_cataract']:.4f}  "
            f"eye_crop_applied={result['eye_crop_applied']}"
        )

    print(f"\n{correct}/{len(manifest)} correct on this tiny sample. Eye-crop fired on {n_cropped}/{len(manifest)}.")
    print("Reminder: n=10 is a smoke test, NOT a validation -- see plan_cataract.txt.")


if __name__ == "__main__":
    main()
