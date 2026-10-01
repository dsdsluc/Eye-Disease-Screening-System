"""Zero-shot modality gatekeeper (plans/archetechture.txt "Van de B").

The 5 fundus-based endpoints (predict/explain/quality-check/multidisease/
glaucoma/amd) all assume the upload is a fundus photo from a specialized
camera; cataract-screen assumes an external/anterior eye photo instead.
Nothing before this checked that assumption -- a selfie sent to /predict
used to just run the DR ensemble on it and return a confident-looking grade.

Uses CLIP (open_clip, zero-shot, no fine-tuning) to compare the uploaded
image's embedding against a few text prompts per category and take the
argmax over {fundus, external_eye, other}. "other" is the reject bucket:
it means a real fundus photo doesn't need to clear some absolute confidence
threshold, it just needs to look more like a fundus photo than either an
external eye or "something else" -- see config/modality_gate/config.json's
"notes" for how this was verified (scripts/test_modality_gate.py).

This is a hard gate, not a soft warning (explicit user decision, 2026-09-03):
main.py raises HTTPException on a mismatch instead of attaching a
non-blocking flag to the response, because this system is still in
development, not public yet, so "reject clearly and log it" beats "warn and
let a bad prediction through anyway".
"""
import logging
from pathlib import Path
from typing import Literal

import open_clip
import torch
from PIL import Image

from inference.config import MODALITY_GATE_CONFIG

logger = logging.getLogger("fundas.inference")

Modality = Literal["fundus", "external_eye"]

# "other" only ever serves as a reject bucket in the argmax below, never a
# modality any endpoint expects -- so it's not part of the Modality type.
_CATEGORIES: dict[str, list[str]] = MODALITY_GATE_CONFIG["categories"]


class ModalityGate:
    def __init__(self, device: str | None = None):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            MODALITY_GATE_CONFIG["clip_model"], pretrained=MODALITY_GATE_CONFIG["clip_pretrained"]
        )
        self.model = self.model.to(self.device).eval()
        tokenizer = open_clip.get_tokenizer(MODALITY_GATE_CONFIG["clip_model"])

        self.labels = list(_CATEGORIES.keys())
        prompts = [p for label in self.labels for p in _CATEGORIES[label]]
        # Each label may have >1 prompt (e.g. two phrasings of "fundus
        # photo") -- group_idx maps each encoded prompt row back to its
        # label so scoring can take the max similarity within a label
        # rather than needing exactly one prompt per label.
        self.group_idx = [i for i, label in enumerate(self.labels) for _ in _CATEGORIES[label]]

        with torch.no_grad():
            tokens = tokenizer(prompts).to(self.device)
            text_features = self.model.encode_text(tokens)
            text_features /= text_features.norm(dim=-1, keepdim=True)
        self.text_features = text_features

    def _scores(self, image_path: str | Path) -> dict[str, float]:
        img = Image.open(image_path).convert("RGB")
        tensor = self.preprocess(img).unsqueeze(0).to(self.device)
        with torch.no_grad():
            image_features = self.model.encode_image(tensor)
            image_features /= image_features.norm(dim=-1, keepdim=True)
            sims = (image_features @ self.text_features.T).squeeze(0).cpu().tolist()

        scores: dict[str, float] = {}
        for label, sim in zip((self.labels[i] for i in self.group_idx), sims):
            scores[label] = max(scores.get(label, sim), sim)
        return scores

    def check(self, image_path: str | Path, expected: Modality) -> dict:
        scores = self._scores(image_path)
        predicted = max(scores, key=scores.get)
        passed = predicted == expected
        if not passed:
            logger.warning(
                "Modality gate rejected %s: expected=%s predicted=%s scores=%s",
                image_path, expected, predicted, scores,
            )
        return {"passed": passed, "expected": expected, "predicted": predicted, "scores": scores}
