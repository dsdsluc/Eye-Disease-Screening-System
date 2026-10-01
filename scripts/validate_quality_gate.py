"""Sanity-check the QuickQual-based quality gatekeeper against the synthetic
degraded set from scripts/build_quality_dataset.py (real photos + synthetic
blur/darken -- NOT real EyeQ, see that script's docstring for why). Mirrors
scripts/validate_test_images.py's shape for the DR ensemble.

This does NOT measure real-world accuracy (see plans/archetechture.txt
section 10) -- it only confirms the wired-up engine correctly separates
"obviously fine" from "obviously wrecked" versions of the same photos, as a
smoke test before trusting it on real uploads.

Usage:
    .venv\\Scripts\\python scripts\\validate_quality_gate.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from inference.quality_engine import QualityEngine  # noqa: E402

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "quality_raw" / "val"


def main():
    engine = QualityEngine()
    print(f"Device: {engine.device}\n")

    correct = 0
    total = 0
    per_label_correct = {}
    per_label_total = {}

    for label_dir in sorted(DATA_DIR.iterdir()):
        if not label_dir.is_dir():
            continue
        true_label = label_dir.name
        per_label_correct.setdefault(true_label, 0)
        per_label_total.setdefault(true_label, 0)
        for image_path in sorted(label_dir.glob("*.jpg")):
            result = engine.check(image_path)
            pred_label = result["label"]
            total += 1
            per_label_total[true_label] += 1
            if pred_label == true_label:
                correct += 1
                per_label_correct[true_label] += 1
            status = "OK" if pred_label == true_label else "MISS"
            print(f"[{status}] {image_path.name}: true={true_label} pred={pred_label} probs={result['probs']}")

    print(f"\nOverall accuracy: {correct}/{total} = {correct / total:.2%}")
    for label in per_label_total:
        c, t = per_label_correct[label], per_label_total[label]
        print(f"  {label}: {c}/{t} = {c / t:.2%}")


if __name__ == "__main__":
    main()
