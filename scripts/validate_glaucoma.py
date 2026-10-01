"""Smoke test for the glaucoma screening engine (plans/plan_glaucoma.txt).
test_images/ only carries DR-grade labels, NOT glaucoma ground truth, so
this does NOT measure accuracy -- it only confirms GlaucomaEngine (optic
disc auto-crop + classifier) runs end-to-end on real full fundus photos and
that the optic disc localization lands somewhere sane (inside the image,
roughly where a disc would be), since that's the step plans/plan_glaucoma.txt
section 2.1 flagged as unverified.

Usage:
    .venv\\Scripts\\python scripts\\validate_glaucoma.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from inference.glaucoma_engine import GlaucomaEngine  # noqa: E402
from inference.preprocessing import load_and_crop  # noqa: E402

TEST_IMAGES_DIR = Path(__file__).resolve().parent.parent / "test_images"
MAX_IMAGES = 5


def main():
    engine = GlaucomaEngine()
    print(f"Device: {engine.device}  Backbone: {engine.backbone_name}  od_crop_fraction: {engine.od_crop_fraction}")
    print(f"model_version={engine.model_version!r}  is_experimental={engine.is_experimental}\n")

    image_paths = []
    for grade_dir in sorted(TEST_IMAGES_DIR.iterdir()):
        if not grade_dir.is_dir():
            continue
        for image_path in sorted(grade_dir.glob("*")):
            if image_path.suffix.lower() in (".jpg", ".jpeg", ".png"):
                image_paths.append((grade_dir.name, image_path))
                break  # at most 1 per DR grade folder, for variety
        if len(image_paths) >= MAX_IMAGES:
            break

    for grade_name, image_path in image_paths:
        result = engine.predict(image_path)
        h, w = load_and_crop(image_path).shape[:2]
        od = result["optic_disc_center"]
        inside = 0 <= od["x"] <= w and 0 <= od["y"] <= h

        print(f"[{grade_name}] {image_path.name}")
        print(f"  label={result['label']}  prob_glaucoma={result['prob_glaucoma']:.4f}")
        print(f"  optic_disc_center=({od['x']:.0f},{od['y']:.0f})  image_size=({w},{h})  inside_bounds={inside}")
        assert inside, "Optic disc center landed outside the image -- localization failed."

    print(f"\n{len(image_paths)} images processed (max {MAX_IMAGES}), all sanity checks passed.")
    print("Reminder: NOT an accuracy measurement -- test_images/ has no glaucoma ground truth.")


if __name__ == "__main__":
    main()
