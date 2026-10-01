"""Shared preprocessing: raw fundus photo -> per-backbone normalized tensor.

Used by both the inference engine and (if a retrain is ever needed) training
code, so the two never drift apart -- see plans/archetechture.txt section 2.1.

Two things are backbone-independent (crop) and one is backbone-specific
(normalization): inception_v4/inception_resnet_v2 use Inception-style
[-1, 1] normalization while the seresnext models use ImageNet mean/std --
timm knows which is which per architecture, so we ask timm instead of
hardcoding one set of stats for everything.
"""
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np
import timm
import torch
from PIL import Image
from torchvision import transforms

from inference.config import IMAGE_SIZE

# NOTE: the original training script isn't in this repo, so this crop step
# is the standard APTOS-kernel approach (crop black borders, resize, ImageNet-
# or Inception-style normalize per timm's default_cfg for each backbone) and
# not verified against the exact training pipeline. If ensemble QWK on a
# known-label batch looks off once this is wired up, check here first.


def _crop_dark_borders(img: np.ndarray, tol: int = 7) -> np.ndarray:
    """Crop the black border around the circular fundus photo."""
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    mask = gray > tol
    if mask.sum() == 0:
        return img
    rows = np.where(mask.any(axis=1))[0]
    cols = np.where(mask.any(axis=0))[0]
    cropped = img[rows[0]: rows[-1] + 1, cols[0]: cols[-1] + 1]
    return cropped if cropped.size else img


def load_and_crop(image_path: str | Path) -> np.ndarray:
    """Read an image file and return an RGB uint8 array cropped to the fundus circle."""
    img = cv2.imread(str(image_path))
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return _crop_dark_borders(img)


@lru_cache(maxsize=None)
def _transform_for_backbone(backbone_name: str) -> transforms.Compose:
    mean, std = (0.485, 0.456, 0.406), (0.229, 0.224, 0.225)  # ImageNet fallback
    try:
        cfg = timm.get_pretrained_cfg(backbone_name)
        if cfg is not None and cfg.mean and cfg.std:
            mean, std = cfg.mean, cfg.std
    except Exception:
        pass  # keep ImageNet fallback

    return transforms.Compose(
        [
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std),
        ]
    )


def preprocess_for_backbone(cropped_rgb: np.ndarray, backbone_name: str) -> torch.Tensor:
    """cropped_rgb (from load_and_crop) -> normalized CHW tensor for one backbone."""
    transform = _transform_for_backbone(backbone_name)
    pil_img = Image.fromarray(cropped_rgb)
    return transform(pil_img)
