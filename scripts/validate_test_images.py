"""Run every image in test_images/<grade>_<label>/ through the ensemble and
compare predicted grade against the folder name (ground truth), reporting
accuracy and Quadratic Weighted Kappa (QWK) -- the same metric the ensemble
thresholds were optimized for.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from inference.engine import InferenceEngine  # noqa: E402

TEST_DIR = Path(__file__).resolve().parent.parent / "test_images"


def quadratic_weighted_kappa(y_true, y_pred, num_classes=5):
    import numpy as np

    O = np.zeros((num_classes, num_classes))
    for t, p in zip(y_true, y_pred):
        O[t, p] += 1

    hist_true = np.bincount(y_true, minlength=num_classes)
    hist_pred = np.bincount(y_pred, minlength=num_classes)
    E = np.outer(hist_true, hist_pred) / len(y_true)

    W = np.zeros((num_classes, num_classes))
    for i in range(num_classes):
        for j in range(num_classes):
            W[i, j] = (i - j) ** 2 / (num_classes - 1) ** 2

    return 1 - (W * O).sum() / (W * E).sum()


def main():
    engine = InferenceEngine()
    print(f"Device: {engine.device}\n")

    y_true, y_pred = [], []
    rows = []

    grade_dirs = sorted(TEST_DIR.iterdir())
    for grade_dir in grade_dirs:
        if not grade_dir.is_dir():
            continue
        true_grade = int(grade_dir.name.split("_")[0])
        for image_path in sorted(grade_dir.glob("*.png")):
            result = engine.predict(image_path)
            pred_grade = result["grade"]
            y_true.append(true_grade)
            y_pred.append(pred_grade)
            rows.append((image_path.name, true_grade, pred_grade, result["score"]))
            status = "OK" if pred_grade == true_grade else "MISS"
            print(f"[{status}] {image_path.name}: true={true_grade} pred={pred_grade} score={result['score']:.4f}")

    accuracy = sum(t == p for t, p in zip(y_true, y_pred)) / len(y_true)
    qwk = quadratic_weighted_kappa(y_true, y_pred)

    print(f"\nTotal images: {len(y_true)}")
    print(f"Accuracy: {accuracy:.2%}")
    print(f"QWK: {qwk:.4f}")


if __name__ == "__main__":
    main()
