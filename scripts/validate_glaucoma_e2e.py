"""End-to-end validation of the DEPLOYED glaucoma pipeline (plans/
plan_glaucoma.txt section 3) on real full-fundus photos with real glaucoma
labels -- something that never existed before this script: every accuracy
number published so far (89.8% val_accuracy, 87.3% val_f1, in config/
glaucoma/config.json) was measured on ACRIMA/ORIGA/RIM-ONE, which are all
pre-cropped tight around the optic disc (plans/plan_glaucoma.txt section 1).
This script calls GlaucomaEngine.predict() UNCHANGED (the same code path
inference/main.py's /glaucoma-screen endpoint uses) on full 45-degree
fundus photos, so the auto-crop step (fundus_image_toolbox optic disc
localization + od_crop_fraction) actually runs for real, the same as it
would for an actual user upload.

Dataset: EyePACS-AIROGS-light-V2 test split (Kaggle: deathtrooper/glaucoma-
dataset-eyepacs-airogs-light-v2), 385 RG (referable glaucoma) + 385 NRG
(non-referable glaucoma) -- confirmed via a real sample image (not just the
dataset description) to be genuine full-fundus photos, not disc-cropped
like ACRIMA/ORIGA/RIM-ONE (plans/plan_glaucoma.txt section 2).

Usage:
    .venv\\Scripts\\python scripts\\validate_glaucoma_e2e.py [--limit N]
"""
import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from inference.glaucoma_engine import GlaucomaEngine  # noqa: E402

RAW_ROOT = Path(__file__).resolve().parent.parent / "data" / "glaucoma_validation_raw"
DATA_ROOT = RAW_ROOT / "eyepac-light-v2-512-jpg" / "test"
KAGGLE_REF = "deathtrooper/glaucoma-dataset-eyepacs-airogs-light-v2"


def ensure_dataset():
    """Downloads the (~524MB) dataset on first run only -- not kept in the
    repo/committed anywhere, matching how data/odir5k_raw/ was handled
    (plans/plan.txt Phase 2): re-download when needed instead of storing a
    large raw dataset locally between uses."""
    if DATA_ROOT.exists():
        return
    import kaggle

    print(f"Dataset not found locally -- downloading {KAGGLE_REF} (~524MB, one-time)...")
    kaggle.api.authenticate()
    kaggle.api.dataset_download_files(KAGGLE_REF, path=str(RAW_ROOT), unzip=True, quiet=False)


def load_rows(limit_per_class: int | None):
    rows = []
    for folder, label in (("RG", 1), ("NRG", 0)):
        paths = sorted((DATA_ROOT / folder).glob("*.jpg"))
        if limit_per_class:
            paths = paths[:limit_per_class]
        rows.extend((p, label) for p in paths)
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Max images per class (default: all 385)")
    parser.add_argument(
        "--od-crop-fraction",
        type=float,
        default=None,
        help="Override config/glaucoma/config.json's od_crop_fraction for this run (for re-sweeping later).",
    )
    args = parser.parse_args()

    ensure_dataset()
    rows = load_rows(args.limit)
    print(f"Validating on {len(rows)} images ({sum(1 for _, l in rows if l == 1)} RG / {sum(1 for _, l in rows if l == 0)} NRG)")

    engine = GlaucomaEngine()
    if args.od_crop_fraction is not None:
        engine.od_crop_fraction = args.od_crop_fraction
    print(f"Device: {engine.device}  od_crop_fraction: {engine.od_crop_fraction}\n")

    tp = fp = tn = fn = 0
    failures = []
    start = time.time()

    for i, (path, true_label) in enumerate(rows, start=1):
        try:
            result = engine.predict(path)
        except Exception as e:
            failures.append({"file": path.name, "error": str(e)})
            continue

        pred_glaucoma = result["label"] == "glaucoma"
        if true_label == 1 and pred_glaucoma:
            tp += 1
        elif true_label == 1 and not pred_glaucoma:
            fn += 1
        elif true_label == 0 and pred_glaucoma:
            fp += 1
        else:
            tn += 1

        if i % 100 == 0:
            print(f"  {i}/{len(rows)} processed...")

    elapsed = time.time() - start
    total = tp + fp + tn + fn
    accuracy = (tp + tn) / total if total else 0.0
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0

    print(f"\nElapsed: {elapsed:.1f}s ({elapsed / max(total, 1):.3f}s/image)")
    print(f"Confusion: TP={tp} FP={fp} TN={tn} FN={fn}  (failures: {len(failures)})")
    print(f"accuracy={accuracy:.4f}  precision={precision:.4f}  recall={recall:.4f}  f1={f1:.4f}")

    print("\nFor comparison, config/glaucoma/config.json (measured on pre-cropped")
    print("ACRIMA/ORIGA/RIM-ONE, NOT this end-to-end pipeline):")
    print("  val_accuracy=0.8982  val_precision=0.8727  val_recall=0.8727  val_f1=0.8727")

    out = {
        "dataset": "EyePACS-AIROGS-light-V2 test split",
        "n_images": total,
        "n_failures": len(failures),
        "confusion": {"tp": tp, "fp": fp, "tn": tn, "fn": fn},
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "od_crop_fraction": engine.od_crop_fraction,
        "failures": failures,
    }
    out_path = Path(__file__).resolve().parent.parent / "data" / "glaucoma_e2e_validation_result.json"
    out_path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"\nSaved: {out_path}")


if __name__ == "__main__":
    main()
