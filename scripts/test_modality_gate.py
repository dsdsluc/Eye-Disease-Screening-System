"""One-off script to sanity-check CLIP zero-shot discrimination between
fundus / external-eye / other BEFORE wiring it into main.py. Not part of the
permanent test suite -- just verifying the prompt set actually separates the
three categories on real project images.
"""
import glob
import time

import open_clip
import torch
from PIL import Image

device = "cuda" if torch.cuda.is_available() else "cpu"
t0 = time.time()
model, _, preprocess = open_clip.create_model_and_transforms("ViT-B-32", pretrained="openai")
tokenizer = open_clip.get_tokenizer("ViT-B-32")
model = model.to(device).eval()
print(f"model load: {time.time()-t0:.2f}s on {device}")

PROMPTS = {
    "fundus": [
        "a retinal fundus photograph showing the optic disc, macula, and blood vessels, taken with a specialized fundus camera",
        "a medical retina scan image of the inside of an eye",
    ],
    "external_eye": [
        "a close-up photograph of an external human eye, showing the iris, pupil, sclera, and eyelids, taken with a regular camera",
        "a photo of a human face focused closely on one eye",
    ],
    "other": [
        "a photograph unrelated to human eyes, such as an animal, object, document, screenshot, or scenery",
    ],
}
labels = list(PROMPTS.keys())
all_texts = [p for label in labels for p in PROMPTS[label]]
text_tokens = tokenizer(all_texts).to(device)
with torch.no_grad():
    text_features = model.encode_text(text_tokens)
    text_features /= text_features.norm(dim=-1, keepdim=True)

# map each text row back to its category, then average per category
import numpy as np
group_idx = []
for i, label in enumerate(labels):
    group_idx += [i] * len(PROMPTS[label])
group_idx = np.array(group_idx)


def classify(image_path):
    img = preprocess(Image.open(image_path).convert("RGB")).unsqueeze(0).to(device)
    with torch.no_grad():
        image_features = model.encode_image(img)
        image_features /= image_features.norm(dim=-1, keepdim=True)
        sims = (image_features @ text_features.T).squeeze(0).cpu().numpy()
    cat_scores = {label: float(sims[group_idx == i].max()) for i, label in enumerate(labels)}
    best = max(cat_scores, key=cat_scores.get)
    return best, cat_scores


test_sets = {
    "fundus": glob.glob("test_images/**/*.png", recursive=True)[:10],
    "external_eye": glob.glob("cataract_test/*.jpg")[:8],
    "other": [
        ".venv/Lib/site-packages/imgaug/quokka.jpg",
        ".venv/Lib/site-packages/matplotlib/mpl-data/images/matplotlib_large.png",
        ".venv/Lib/site-packages/matplotlib/mpl-data/images/home_large.png",
    ],
}

for expected, paths in test_sets.items():
    correct = 0
    for p in paths:
        best, scores = classify(p)
        ok = "OK " if best == expected else "XX "
        if best == expected:
            correct += 1
        print(f"{ok}[{expected:13s}] {p:50s} -> {best:13s} {scores}")
    print(f"=== {expected}: {correct}/{len(paths)} correct ===\n")
