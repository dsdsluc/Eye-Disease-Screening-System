"""Quick end-to-end check: run one image through the full ensemble.

Usage:
    .venv\\Scripts\\python scripts\\smoke_test.py path\\to\\some_fundus_image.jpg
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from inference.engine import InferenceEngine  # noqa: E402


def main():
    if len(sys.argv) != 2:
        print("Usage: python scripts/smoke_test.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]
    engine = InferenceEngine()
    print(f"Device: {engine.device}")

    start = time.time()
    result = engine.predict(image_path)
    elapsed = time.time() - start

    print(f"\nGrade: {result['grade']} (score={result['score']:.4f})")
    print("Per-backbone scores:")
    for backbone, score in result["backbone_scores"].items():
        print(f"  {backbone}: {score:.4f}  (folds: {result['per_fold_scores'][backbone]})")
    print(f"\nElapsed: {elapsed:.1f}s")


if __name__ == "__main__":
    main()
