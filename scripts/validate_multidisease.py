"""Smoke test for the multi-disease screening engine (plans/plan_
multidisease.txt section 3.4). test_images/ only carries DR-grade labels
(0_No_DR .. 4_Proliferative_DR), NOT ground truth for the 8 ODIR-5K disease
categories this model predicts -- so this script does NOT measure accuracy,
it only confirms MultiDiseaseEngine loads and runs end-to-end and that the
output shape/probabilities look sane (probs sum to ~1, top_label matches the
max of probs).

To re-check the real 62.2% val accuracy number, you'd need the ODIR-5K val
split used on Colab (plans/ggcolab.txt) -- not present locally (plans/
plan.txt Phase 2 notes data/odir5k_raw/ was deleted after training).

Usage:
    .venv\\Scripts\\python scripts\\validate_multidisease.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from inference.multidisease_engine import MultiDiseaseEngine  # noqa: E402

TEST_IMAGES_DIR = Path(__file__).resolve().parent.parent / "test_images"


def main():
    engine = MultiDiseaseEngine()
    print(f"Device: {engine.device}  Backbone: {engine.backbone_name}")
    print(f"model_version={engine.model_version!r}  is_experimental={engine.is_experimental}\n")

    n = 0
    for grade_dir in sorted(TEST_IMAGES_DIR.iterdir()):
        if not grade_dir.is_dir():
            continue
        for image_path in sorted(grade_dir.glob("*")):
            if image_path.suffix.lower() not in (".jpg", ".jpeg", ".png"):
                continue
            result = engine.predict(image_path)
            n += 1

            prob_sum = sum(result["probs"].values())
            assert abs(prob_sum - 1.0) < 1e-4, f"probs don't sum to 1: {prob_sum}"
            assert result["top_label"] == result["top3"][0]["label"]
            assert result["top_label"] == max(result["probs"], key=result["probs"].get)

            top3_str = ", ".join(f"{e['label']}={e['prob']:.2f}" for e in result["top3"])
            print(f"[{grade_dir.name}] {image_path.name}: top3=[{top3_str}]")

    print(f"\n{n} images processed, all shape/consistency checks passed.")
    print("Reminder: this is NOT an accuracy measurement (see docstring).")


if __name__ == "__main__":
    main()
