"""Cataract (external/anterior eye photo) screening engine (plans/
plan_cataract.txt) -- the first task in this system that does NOT use
fundus photos. Wraps the binary classifier (inference/cataract_model.py)
with an eye-ROI auto-crop step (plans/plan_cataract.txt section 2.2(a),
explicit user decision), since the training images (Kaggle: orvile/eye-
diseases-classification) are already tight close-ups of a single eye and a
real user's own photo will likely show more face/background context.

Auto-crop implementation: OpenCV's bundled YuNet face detector
(cv2.FaceDetectorYN, model file config/cataract/face_detection_yunet.onnx,
downloaded from opencv_zoo -- Apache-2.0) rather than the classic Haar
cascade, because THIS PROJECT'S installed opencv-python build (5.0.0) does
not expose cv2.CascadeClassifier at all (removed from the Python bindings
in this version) -- verified directly, not assumed. YuNet also conveniently
returns 5 landmarks per detected face, including both eye centers, so no
separate eye-detection step is needed on top of face detection.

Best-effort, not guaranteed: YuNet requires enough face context to work,
and reliably finds NOTHING on the tight close-up-only training/test images
this project has on hand (verified: 0/6 sample images, all close-up crops,
some as small as 57px, trigger a detection) -- this is an EXPECTED
limitation of those specific images, not a bug, since they never needed
cropping in the first place. A real phone photo of someone's own eye
usually includes some surrounding face and should detect more reliably,
but this has NOT been verified against a real-world-style photo (none
available in this project) -- treat the crop margin/logic below as a
first-pass heuristic, not a calibrated parameter (same caveat class as
glaucoma's od_crop_fraction before it was empirically tuned).

NOT REPRODUCED AT INFERENCE (important, see config/cataract/config.json's
"known_caveats"): training corrected a sharpness confound by Gaussian-
blurring only the images LABELED "normal" -- a label-conditional transform
that cannot be replicated here, since the label is exactly what this
engine is trying to predict. Every image here is processed the way
training's "cataract" class was (left unprocessed) -- a naturally blurry/
low-quality real upload is therefore somewhat out-of-distribution relative
to training, in a way not yet characterized.

THREAD SAFETY (plans/archetechture.txt audit finding #2, 2026-09-04): a
single process-wide crash with no Python traceback was observed once
(unreproduced) after 9 further attempts targeting bad-input handling
specifically. The strongest remaining suspect is `self._face_detector`
below: one cv2.FaceDetectorYN (a cv2.dnn Net under the hood -- note the "new
graph engine" warning it prints on load, a newer and less battle-tested
OpenCV DNN backend) shared across every request, each running on its own
thread via main.py's `asyncio.to_thread`. OpenCV's DNN module does not
document concurrent `.detect()` calls on the same Net object as safe, and
this project has no evidence it is. `_face_detector_lock` below serializes
every call into it -- cheap (detection is a few ms) and removes this as a
possible cause, but since the original crash was never reproduced, this is
a mitigation for the leading suspect, not a confirmed fix.
"""
import base64
import threading
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image
from torchvision import transforms

from inference.cataract_model import load_cataract_model
from inference.config import CATARACT_CONFIG, CONFIG_DIR

LABELS = CATARACT_CONFIG["labels"]  # ["normal", "cataract"]
YUNET_MODEL_PATH = CONFIG_DIR / "cataract" / "face_detection_yunet.onnx"

# Heuristic crop margin around a detected eye landmark, as a fraction of
# the detected face's width -- NOT calibrated against real photos (see
# module docstring). Wide enough to keep the whole eye + a little
# surrounding skin, similar in spirit to the training images' framing.
_EYE_CROP_FACE_WIDTH_FRACTION = 0.45


def _load_rgb(path: str | Path) -> np.ndarray:
    """No load_and_crop here -- this is NOT a fundus photo (see module
    docstring); a plain, un-cropped read."""
    img = cv2.imread(str(path))
    if img is None:
        raise ValueError(f"Could not read image: {path}")
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


class CataractEngine:
    def __init__(self, device: str | None = None):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.image_size = CATARACT_CONFIG.get("image_size", 224)
        self.model_version = CATARACT_CONFIG.get("dataset_source", "unknown")
        self.is_experimental = CATARACT_CONFIG.get("is_experimental", True)

        self.model = load_cataract_model(self.device)

        self._face_detector = cv2.FaceDetectorYN.create(
            str(YUNET_MODEL_PATH), "", (320, 320), score_threshold=0.6, nms_threshold=0.3, top_k=50
        )
        # Guards every use of self._face_detector -- see module docstring's
        # "THREAD SAFETY" section.
        self._face_detector_lock = threading.Lock()

        self._transform = transforms.Compose(
            [
                transforms.Resize((self.image_size, self.image_size)),
                transforms.ToTensor(),
                transforms.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
            ]
        )

    def _auto_crop_eye(self, rgb: np.ndarray) -> tuple[np.ndarray, bool]:
        """Best-effort eye-ROI crop. Returns (possibly-cropped image,
        whether a crop was actually applied) -- the caller/response can
        surface the flag so it's never silently unclear which path ran."""
        h, w = rgb.shape[:2]
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        with self._face_detector_lock:
            self._face_detector.setInputSize((w, h))
            _retval, faces = self._face_detector.detect(bgr)
        if faces is None or len(faces) == 0:
            return rgb, False

        # Largest detected face by box area, in case of multiple.
        face = max(faces, key=lambda f: f[2] * f[3])
        face_w = float(face[2])
        right_eye_x, right_eye_y = float(face[4]), float(face[5])

        side = max(1.0, face_w * _EYE_CROP_FACE_WIDTH_FRACTION)
        x0 = int(max(0, min(w - side, right_eye_x - side / 2)))
        y0 = int(max(0, min(h - side, right_eye_y - side / 2)))
        side_i = int(side)
        crop = rgb[y0 : y0 + side_i, x0 : x0 + side_i]
        if crop.size == 0:
            return rgb, False
        return crop, True

    def detect_crop(self, image_path: str | Path) -> dict:
        """Crop-only step (plans/archetechture.txt "crop preview" flow) --
        runs YuNet and returns the result as a displayable PNG data URI,
        WITHOUT running the classifier. Lets the web layer show the user
        exactly what would be analyzed and get a confirm/retake decision
        before any prediction happens, instead of the crop being an
        invisible internal step the user only finds out about after the
        fact via `eye_crop_applied` on the final result.
        """
        rgb = _load_rgb(image_path)
        cropped, eye_crop_applied = self._auto_crop_eye(rgb)
        ok, buf = cv2.imencode(".png", cv2.cvtColor(cropped, cv2.COLOR_RGB2BGR))
        if not ok:
            raise RuntimeError("Failed to encode crop preview as PNG")
        b64 = base64.b64encode(buf.tobytes()).decode("ascii")
        return {"cropped_png": f"data:image/png;base64,{b64}", "eye_crop_applied": eye_crop_applied}

    @torch.no_grad()
    def _classify(self, rgb: np.ndarray) -> dict:
        tensor = self._transform(Image.fromarray(rgb)).unsqueeze(0).to(self.device)
        logit = self.model(tensor)
        prob_cataract = torch.sigmoid(logit).item()
        label = LABELS[1] if prob_cataract >= 0.5 else LABELS[0]
        return {
            "label": label,
            "prob_cataract": float(prob_cataract),
            "model_version": self.model_version,
            "is_experimental": self.is_experimental,
        }

    def predict(self, image_path: str | Path) -> dict:
        """One-shot crop+classify -- kept for callers that skip the confirm
        step entirely (e.g. a future API consumer other than web/'s own
        confirm flow). web/'s /cataract page itself now always goes through
        detect_crop() -> user confirms -> predict_precropped() instead."""
        rgb = _load_rgb(image_path)
        cropped, eye_crop_applied = self._auto_crop_eye(rgb)
        result = self._classify(cropped)
        result["eye_crop_applied"] = eye_crop_applied
        return result

    def predict_precropped(self, image_path: str | Path, eye_crop_applied: bool) -> dict:
        """Classifies an image the caller has ALREADY cropped (the exact PNG
        detect_crop() returned, confirmed by the user) -- does NOT run YuNet
        again. Running detection twice risked a second pass disagreeing with
        the first (e.g. finding no face on an already-tight crop that had
        lost its surrounding context), which would silently classify a
        different region than the one the user approved. `eye_crop_applied`
        is passed through from the earlier detect_crop() call rather than
        re-derived, since by definition no cropping decision is made here."""
        rgb = _load_rgb(image_path)
        result = self._classify(rgb)
        result["eye_crop_applied"] = eye_crop_applied
        return result
