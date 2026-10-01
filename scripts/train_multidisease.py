"""Train the multi-disease fundus screening baseline (plans/plan.txt Phase 2)
on ODIR-5K (data/odir5k_raw/, downloaded via Kaggle -- see
plans/archetechture.txt section 11 for the dataset acquisition and label
format investigation).

Label caveat: full_df.csv's `target`/`labels` columns are already PER-EYE
(derived from that eye's own diagnostic-keyword text), which differs from
its patient-level N/D/G/C/A/H/M/O columns (shared across both eyes) for
~27% of rows -- using target/labels avoids mislabeling a healthy eye with
its sibling eye's condition. Every row's labels list has exactly one entry
(this dataset's popular community derivation collapses the true multi-label
signal to one dominant condition per eye), so this trains a single-label
8-way classifier, not a calibrated multi-label detector -- matching plans/
plan.txt Phase 2's "baseline nhanh" framing, not a final multi-label model.

Splits by patient ID (not by individual eye image) so a patient's left/right
eyes never land on opposite sides of the train/val split.

Usage:
    .venv\\Scripts\\python scripts\\train_multidisease.py
"""
import ast
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pandas as pd
import torch
from torch import nn
from torch.utils.data import DataLoader, Dataset

from inference.multidisease_model import MultiDiseaseModel  # noqa: E402
from inference.preprocessing import load_and_crop, preprocess_for_backbone  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "data" / "odir5k_raw" / "full_df.csv"
IMAGE_DIR = ROOT / "data" / "odir5k_raw" / "ODIR-5K" / "ODIR-5K" / "Training Images"
CONFIG_PATH = ROOT / "config" / "multidisease" / "config.json"
CHECKPOINT_PATH = ROOT / "models" / "multidisease" / "model_best.pth"

BACKBONE = "seresnext50_32x4d"
DROPOUT = 0.3
VAL_FRACTION = 0.15
SEED = 0
EPOCHS = 15
BATCH_SIZE = 24
LR = 3e-4

LETTER_TO_LABEL = {
    "N": "normal",
    "D": "diabetes",
    "G": "glaucoma",
    "C": "cataract",
    "A": "amd",
    "H": "hypertension",
    "M": "myopia",
    "O": "other",
}
LABELS = list(LETTER_TO_LABEL.values())  # fixed order, matches config/multidisease/config.json


class ODIRDataset(Dataset):
    def __init__(self, rows: list[tuple[str, int]], augment: bool):
        self.rows = rows
        self.augment = augment

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, idx: int):
        filename, label_idx = self.rows[idx]
        cropped = load_and_crop(IMAGE_DIR / filename)
        if self.augment and np.random.rand() < 0.5:
            cropped = np.ascontiguousarray(cropped[:, ::-1])  # horizontal flip -- both eyes are anatomically valid
        tensor = preprocess_for_backbone(cropped, BACKBONE)
        return tensor, label_idx


def _load_rows() -> list[tuple[str, str, int]]:
    """Returns (filename, patient_id, label_idx) for every row with a
    resolvable single label and an image file that actually exists."""
    df = pd.read_csv(CSV_PATH)
    rows = []
    skipped = 0
    for _, row in df.iterrows():
        letters = ast.literal_eval(row["labels"])
        if len(letters) != 1 or letters[0] not in LETTER_TO_LABEL:
            skipped += 1
            continue
        filename = row["filename"]
        if not (IMAGE_DIR / filename).exists():
            skipped += 1
            continue
        label_idx = LABELS.index(LETTER_TO_LABEL[letters[0]])
        rows.append((filename, int(row["ID"]), label_idx))
    print(f"Loaded {len(rows)} labeled rows ({skipped} skipped: multi-label, unknown letter, or missing file)")
    return rows


def _split_by_patient(rows: list[tuple[str, int, int]]) -> tuple[list, list]:
    rng = np.random.RandomState(SEED)
    patient_ids = sorted({pid for _, pid, _ in rows})
    rng.shuffle(patient_ids)
    n_val = max(1, int(len(patient_ids) * VAL_FRACTION))
    val_ids = set(patient_ids[:n_val])

    train_rows = [(fn, label) for fn, pid, label in rows if pid not in val_ids]
    val_rows = [(fn, label) for fn, pid, label in rows if pid in val_ids]
    return train_rows, val_rows


def _macro_f1(confusion: torch.Tensor) -> float:
    f1s = []
    for c in range(confusion.shape[0]):
        tp = confusion[c, c].item()
        fp = confusion[:, c].sum().item() - tp
        fn = confusion[c, :].sum().item() - tp
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1s.append(2 * precision * recall / (precision + recall) if (precision + recall) else 0.0)
    return sum(f1s) / len(f1s)


@torch.no_grad()
def _evaluate(model: nn.Module, loader: DataLoader, device: torch.device) -> tuple[float, float]:
    model.eval()
    confusion = torch.zeros(len(LABELS), len(LABELS), dtype=torch.int64)
    correct = 0
    total = 0
    for x, y in loader:
        x, y = x.to(device), y.to(device)
        preds = model(x).argmax(dim=1)
        correct += (preds == y).sum().item()
        total += y.numel()
        for t, p in zip(y.tolist(), preds.tolist()):
            confusion[t, p] += 1
    return correct / total, _macro_f1(confusion)


def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    rows = _load_rows()
    train_rows, val_rows = _split_by_patient(rows)
    print(f"Train: {len(train_rows)}  Val: {len(val_rows)}")

    train_counts = np.bincount([label for _, label in train_rows], minlength=len(LABELS))
    print("Train label counts:", dict(zip(LABELS, train_counts.tolist())))
    class_weights = torch.tensor(train_counts.sum() / (len(LABELS) * np.maximum(train_counts, 1)), dtype=torch.float32)

    train_loader = DataLoader(ODIRDataset(train_rows, augment=True), batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    val_loader = DataLoader(ODIRDataset(val_rows, augment=False), batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    model = MultiDiseaseModel(BACKBONE, num_classes=len(LABELS), dropout=DROPOUT).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR)
    criterion = nn.CrossEntropyLoss(weight=class_weights.to(device))

    best_macro_f1 = -1.0
    best_state = None
    best_metrics = {}

    for epoch in range(1, EPOCHS + 1):
        model.train()
        running_loss = 0.0
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            loss = criterion(model(x), y)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * x.size(0)

        train_loss = running_loss / len(train_rows)
        val_acc, val_macro_f1 = _evaluate(model, val_loader, device)
        print(f"epoch {epoch:2d}/{EPOCHS}  train_loss={train_loss:.4f}  val_acc={val_acc:.3f}  val_macro_f1={val_macro_f1:.3f}")

        if val_macro_f1 > best_macro_f1:
            best_macro_f1 = val_macro_f1
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
            best_metrics = {"val_accuracy": val_acc, "val_macro_f1": val_macro_f1, "epoch": epoch}

    CHECKPOINT_PATH.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {"model_state_dict": best_state, "labels": LABELS, "backbone": BACKBONE, **best_metrics},
        CHECKPOINT_PATH,
    )
    print(f"\nSaved best checkpoint (val_macro_f1={best_macro_f1:.3f}) to {CHECKPOINT_PATH}")

    with open(CONFIG_PATH, encoding="utf-8") as f:
        config = json.load(f)
    config.update(
        {
            "backbone": BACKBONE,
            "dropout": DROPOUT,
            "labels": LABELS,
            "checkpoint": CHECKPOINT_PATH.name,
            **best_metrics,
        }
    )
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=4)
    print(f"Wrote {CONFIG_PATH}")


if __name__ == "__main__":
    main()
