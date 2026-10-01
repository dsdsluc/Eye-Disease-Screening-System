"""Generate a synthetic smoke-test set for the quality gatekeeper (plans/plan.txt
Phase 1) out of real fundus photos already in this repo (test_images/,
data/raw/), via synthetic degradation -- NOT the real EyeQ dataset.

Originally written to produce a training set for a from-scratch fine-tuned
classifier; that approach was replaced (see plans/archetechture.txt section
10) by reusing QuickQual's already-EyeQ-trained pretrained pipeline, so this
script no longer feeds any training -- it now only generates the "obviously
fine" vs. "obviously wrecked" images scripts/validate_quality_gate.py uses as
a smoke test. It only produces blur/underexposure degradations, so it can
confirm the wiring correctly separates extremes; it says nothing about
real-world accuracy on EyeQ-style failure modes (off-axis capture, lens
flare, wrong subject, etc.) -- see plans/archetechture.txt section 10.5.

Usage:
    .venv\\Scripts\\python scripts\\build_quality_dataset.py
"""
import random
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "quality_raw"
VAL_FRACTION = 0.2
SEED = 0


def _gather_base_images() -> list[Path]:
    images = sorted((ROOT / "test_images").glob("*/*.png"))
    images += sorted(p for p in (ROOT / "data" / "raw").iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"})
    return images


def _blur(img: np.ndarray, ksize: int) -> np.ndarray:
    return cv2.GaussianBlur(img, (ksize, ksize), 0)


def _darken(img: np.ndarray, factor: float) -> np.ndarray:
    return np.clip(img.astype(np.float32) * factor, 0, 255).astype(np.uint8)


def _mild_jitter(img: np.ndarray, rng: random.Random) -> np.ndarray:
    brightness = rng.uniform(0.9, 1.1)
    contrast = rng.uniform(0.9, 1.1)
    out = img.astype(np.float32) * contrast + (brightness - 1) * 40
    return np.clip(out, 0, 255).astype(np.uint8)


def _make_variants(img: np.ndarray, rng: random.Random) -> dict[str, list[np.ndarray]]:
    return {
        "good": [img, _mild_jitter(img, rng)],
        "usable": [_blur(img, 9), _darken(img, 0.5)],
        "reject": [_blur(img, 25), _darken(img, 0.15)],
    }


def main():
    base_images = _gather_base_images()
    if not base_images:
        print("No base images found under test_images/ or data/raw/ -- nothing to do.")
        return

    rng = random.Random(SEED)
    shuffled = base_images[:]
    rng.shuffle(shuffled)
    n_val = max(1, int(len(shuffled) * VAL_FRACTION))
    splits = {"val": shuffled[:n_val], "train": shuffled[n_val:]}

    for split_name, paths in splits.items():
        counts = {"good": 0, "usable": 0, "reject": 0}
        for path in paths:
            img = cv2.imread(str(path))
            if img is None:
                print(f"  skip (unreadable): {path}")
                continue
            for label, variants in _make_variants(img, rng).items():
                out_dir = OUT_DIR / split_name / label
                out_dir.mkdir(parents=True, exist_ok=True)
                for variant in variants:
                    counts[label] += 1
                    out_path = out_dir / f"{path.stem}_{counts[label]}.jpg"
                    cv2.imwrite(str(out_path), variant)
        print(f"{split_name}: {counts} (from {len(paths)} base images)")

    print(f"\nWrote synthetic quality dataset to {OUT_DIR}")


if __name__ == "__main__":
    main()
