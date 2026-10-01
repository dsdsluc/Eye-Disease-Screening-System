"""FastAPI wrapper around InferenceEngine -- pure model service.

Synchronous request/response, no persistence: this process only ever knows
"here's a photo, here's a grade" -- accounts, storage, Cloudinary, and the
LLM report all live in web/ now (see plans/archetechture.txt section 8's
successor). Async job-queue polling made sense back when a cold predict()
took ~30s; warm-cache inference is ~1.3-1.9s (section 2.3), so a plain
request/response fits the current numbers better.

InferenceEngine is created once in the lifespan startup (~77s warmup) and
reused for every request -- creating a new one per request would throw away
the whole point of the warm-cache optimization.
"""
import asyncio
import logging
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Callable, Literal

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger("fundas.inference")

from inference.amd_engine import AmdEngine
from inference.cataract_engine import CataractEngine
from inference.engine import InferenceEngine
from inference.glaucoma_engine import GlaucomaEngine
from inference.modality_gate import ModalityGate
from inference.multidisease_engine import MultiDiseaseEngine
from inference.quality_engine import GATE_MODES, QualityEngine

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
# plans/archetechture.txt audit finding #3 (2026-09-04): _save_upload_to_temp
# used to buffer an unbounded upload fully into memory/disk with no cap at
# all. 20MB comfortably covers real photos (the largest sample image in this
# repo is ~5.6MB) while still rejecting anything egregious early instead of
# reading it all first.
MAX_UPLOAD_BYTES = 20 * 1024 * 1024
_UPLOAD_CHUNK_BYTES = 1024 * 1024

engine: InferenceEngine | None = None
quality_engine: QualityEngine | None = None
multidisease_engine: MultiDiseaseEngine | None = None
glaucoma_engine: GlaucomaEngine | None = None
amd_engine: AmdEngine | None = None
cataract_engine: CataractEngine | None = None
modality_gate: ModalityGate | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine, quality_engine, multidisease_engine, glaucoma_engine, amd_engine, cataract_engine, modality_gate
    # Independent models (DR ensemble, quality gatekeeper, multi-disease
    # screening, glaucoma specialist screening, AMD specialist screening,
    # cataract specialist screening, CLIP modality gatekeeper) -- load
    # concurrently so total startup time is max(), not sum(), of the seven.
    (
        engine,
        quality_engine,
        multidisease_engine,
        glaucoma_engine,
        amd_engine,
        cataract_engine,
        modality_gate,
    ) = await asyncio.gather(
        asyncio.to_thread(InferenceEngine),
        asyncio.to_thread(QualityEngine),
        asyncio.to_thread(MultiDiseaseEngine),
        asyncio.to_thread(GlaucomaEngine),
        asyncio.to_thread(AmdEngine),
        asyncio.to_thread(CataractEngine),
        asyncio.to_thread(ModalityGate),
    )
    yield


app = FastAPI(title="Fundas Inference Service", lifespan=lifespan)


@app.middleware("http")
async def reject_oversized_uploads(request, call_next):
    """Rejects a request based on its Content-Length header ALONE, before
    Starlette's multipart parser (triggered by FastAPI's `UploadFile =
    File(...)` binding) ever touches the body -- plans/archetechture.txt
    audit finding #3 refinement (2026-09-06).

    The chunked-read-with-cap in _save_upload_to_temp below was the FIRST
    fix for this finding, but turned out to be incomplete: Starlette's
    MultiPartParser fully receives and spools an upload of ANY size to a
    SpooledTemporaryFile as part of parsing `UploadFile` itself, BEFORE the
    endpoint function (and thus _save_upload_to_temp) ever runs --
    confirmed by reading MultiPartParser.on_part_data() directly, which
    only enforces `max_part_size` for non-file form fields, never for file
    parts. So a middleware check here, ahead of any parsing, is the only
    way to actually avoid paying that cost for an oversized upload.

    Known gap: a client that omits Content-Length (e.g. deliberately using
    chunked transfer-encoding) bypasses this entirely -- _save_upload_to_
    temp's own check remains as a second layer for that case, capping how
    much of that unbounded parse gets copied a second time even though it
    can't prevent Starlette's own initial spool.
    """
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_UPLOAD_BYTES:
        return JSONResponse(
            {"detail": f"File quá lớn (giới hạn {MAX_UPLOAD_BYTES // (1024 * 1024)}MB)."},
            status_code=413,
        )
    return await call_next(request)


class PredictResponse(BaseModel):
    grade: int
    score: float
    backbone_scores: dict[str, float]
    per_fold_scores: dict[str, list[float]]


class ExplainResponse(BaseModel):
    heatmap_png: str


class QualityResponse(BaseModel):
    label: str
    probs: dict[str, float]
    gate_mode: str
    blocked: bool


class DiseaseProb(BaseModel):
    label: str
    prob: float


class MultiDiseaseResponse(BaseModel):
    top_label: str
    top_prob: float
    top3: list[DiseaseProb]
    probs: dict[str, float]
    model_version: str
    is_experimental: bool


class OpticDiscCenter(BaseModel):
    x: float
    y: float


class GlaucomaResponse(BaseModel):
    label: str
    prob_glaucoma: float
    optic_disc_center: OpticDiscCenter
    model_version: str
    is_experimental: bool


class AmdResponse(BaseModel):
    label: str
    prob_amd: float
    model_version: str
    is_experimental: bool


class CataractResponse(BaseModel):
    label: str
    prob_cataract: float
    eye_crop_applied: bool
    model_version: str
    is_experimental: bool


class CataractCropPreviewResponse(BaseModel):
    cropped_png: str
    eye_crop_applied: bool


async def _save_upload_to_temp(file: UploadFile) -> Path:
    # file.filename is Optional per the multipart spec -- a client that
    # omits it used to crash Path(None).suffix before this check existed
    # (plans/archetechture.txt section 2.3, 2026-09-02 audit).
    if not file.filename:
        raise HTTPException(400, "Thiếu tên file trong request.")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    # Streamed in chunks with a running total instead of a single
    # `await file.read()` (plans/archetechture.txt audit finding #3) -- the
    # old version buffered the ENTIRE upload before ever checking its size,
    # so a multi-GB upload would already have exhausted memory/disk by the
    # time anything could reject it. This aborts as soon as the total
    # crosses MAX_UPLOAD_BYTES, without ever holding more than one chunk
    # beyond the limit at once.
    #
    # Also closes a small pre-existing leak: if writing failed partway
    # through (a client disconnecting mid-upload, or the size check below),
    # the temp file created by NamedTemporaryFile never got unlinked because
    # the exception propagated before this function could return `tmp_path`
    # for the caller's own `finally: tmp_path.unlink()` to clean up. The
    # try/except here unlinks it directly instead.
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp_path = Path(tmp.name)
        total = 0
        try:
            while chunk := await file.read(_UPLOAD_CHUNK_BYTES):
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        413, f"File quá lớn (giới hạn {MAX_UPLOAD_BYTES // (1024 * 1024)}MB)."
                    )
                tmp.write(chunk)
        except Exception:
            tmp.close()
            tmp_path.unlink(missing_ok=True)
            raise

    return tmp_path


async def _run_engine(fn: Callable[..., dict], *args: Any) -> dict:
    """Runs a blocking engine call off the event loop and turns ANY failure
    (corrupt/unreadable image, decode error, or any other exception raised
    while processing it) into a clean 400 instead of FastAPI's bare 500.

    Before this wrapper existed, NONE of the endpoints below caught
    exceptions from engine.predict()/explain()/check() at all -- a file
    that fails to decode (cv2.imread() returning None, which load_and_crop
    turns into a ValueError) fell all the way through to an uninformative,
    bodiless 500, and callers (web/) had no way to distinguish "your photo
    is unreadable" from "the service is actually broken" (plans/
    archetechture.txt section 2.2, 2026-09-02 audit finding -- confirmed
    reproducible on all 6 model endpoints).

    This does NOT address the audit's OTHER finding, a single unreproduced
    full-process crash with no Python traceback (section 2.1) -- that
    looked like a native-level (C/CUDA/ONNX) crash, which a Python
    try/except cannot catch by definition. Logging the exception here
    (instead of only 4xx-ing silently) at least gives that failure mode a
    trail to investigate if it recurs.
    """
    try:
        return await asyncio.to_thread(fn, *args)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Engine call failed for %s", getattr(fn, "__qualname__", fn))
        raise HTTPException(400, "Không thể xử lý ảnh này, vui lòng kiểm tra định dạng/nội dung file.") from exc


async def _check_fundus(tmp_path: Path) -> None:
    """Outermost gate (plans/archetechture.txt "Van de B") for every
    endpoint that expects a fundus photo: CLIP modality check only. Still
    hard-rejects with a 422 for wrong modality -- no change there.

    QuickQual's own quality classification USED TO also hard-block here
    (fail_closed) -- removed per explicit user decision (2026-09-06): it
    was too strict in practice (a real, usable DR photo from this repo's
    own test_images/ was flagged "reject" with 68% confidence during
    testing), and the actual call on whether a photo is good enough belongs
    to the doctor reviewing the case, not an automated gate ("ảnh chất
    lượng hay không vẫn cần thiết để đi vào bác sĩ, chỉ cảnh báo thôi là
    hợp lý"). Quality is still computed and logged as a warning -- same "no
    soft-warning response field, just notify me" precedent as the CLIP
    gate's own no-soft-warning decision -- it just never blocks the
    request anymore.
    """
    gate_result = await _run_engine(modality_gate.check, tmp_path, "fundus")
    if not gate_result["passed"]:
        raise HTTPException(
            422,
            f"Ảnh không giống ảnh chụp đáy mắt (fundus) -- có vẻ giống: "
            f"{gate_result['predicted']}. Vui lòng dùng ảnh chụp bởi máy fundus chuyên dụng.",
        )
    quality_result = await _run_engine(quality_engine.check, tmp_path, "fail_open")
    if quality_result["label"] != "good":
        logger.warning(
            "Quality check flagged %s: label=%s probs=%s (not blocking)",
            tmp_path, quality_result["label"], quality_result["probs"],
        )


async def _check_external_eye(tmp_path: Path) -> None:
    """Same outermost CLIP gate as _check_fundus, but for cataract-screen --
    the one endpoint that expects an external/anterior eye photo instead of
    a fundus photo. No quality-check chained here: QuickQual was trained on
    fundus photos (plans/archetechture.txt "Van de A"'s companion note), it
    has nothing to say about an external eye shot."""
    gate_result = await _run_engine(modality_gate.check, tmp_path, "external_eye")
    if not gate_result["passed"]:
        raise HTTPException(
            422,
            f"Ảnh không giống ảnh mắt ngoài (external eye) -- có vẻ giống: "
            f"{gate_result['predicted']}. Vui lòng dùng ảnh chụp cận mắt bằng máy ảnh thường.",
        )


@app.post("/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...)):
    tmp_path = await _save_upload_to_temp(file)
    try:
        await _check_fundus(tmp_path)
        result = await _run_engine(engine.predict, tmp_path)
        return PredictResponse(**result)
    finally:
        tmp_path.unlink(missing_ok=True)


@app.post("/explain", response_model=ExplainResponse)
async def explain(file: UploadFile = File(...)):
    tmp_path = await _save_upload_to_temp(file)
    try:
        await _check_fundus(tmp_path)
        result = await _run_engine(engine.explain, tmp_path)
        return ExplainResponse(**result)
    finally:
        tmp_path.unlink(missing_ok=True)


@app.post("/quality-check", response_model=QualityResponse)
async def quality_check(
    file: UploadFile = File(...),
    gate_mode: Literal["fail_open", "fail_closed"] | None = Query(
        None,
        description=f"Overrides the configured default gate mode for this call. One of {GATE_MODES}.",
    ),
):
    """Standalone endpoint (plans/prep.txt section 4.2): callers decide
    whether/how to act on `blocked` themselves -- the quality check itself
    never raises on a rejected photo, it only reports. Same fail-open/
    fail-closed policy can be picked per call via ?gate_mode=, so both flows
    are usable side by side without redeploying (plans/prep.txt section
    1.1). The CLIP modality gate DOES still raise here, same as every other
    fundus endpoint (plans/archetechture.txt "Van de B") -- quality-check
    is itself a fundus-only model, so it sits right behind the same
    outermost gate as predict/explain/multidisease/glaucoma/amd."""
    tmp_path = await _save_upload_to_temp(file)
    try:
        gate_result = await _run_engine(modality_gate.check, tmp_path, "fundus")
        if not gate_result["passed"]:
            raise HTTPException(
                422,
                f"Ảnh không giống ảnh chụp đáy mắt (fundus) -- có vẻ giống: "
                f"{gate_result['predicted']}. Vui lòng dùng ảnh chụp bởi máy fundus chuyên dụng.",
            )
        result = await _run_engine(quality_engine.check, tmp_path, gate_mode)
        return QualityResponse(**result)
    finally:
        tmp_path.unlink(missing_ok=True)


@app.post("/multidisease-screen", response_model=MultiDiseaseResponse)
async def multidisease_screen(file: UploadFile = File(...)):
    """Standalone endpoint (plans/plan_multidisease.txt section 3.3): a
    separate opt-in feature, not wired into /predict's flow. Always carries
    model_version/is_experimental from config/multidisease/config.json so
    callers can't accidentally drop the experimental-accuracy disclaimer."""
    tmp_path = await _save_upload_to_temp(file)
    try:
        await _check_fundus(tmp_path)
        result = await _run_engine(multidisease_engine.predict, tmp_path)
        return MultiDiseaseResponse(**result)
    finally:
        tmp_path.unlink(missing_ok=True)


@app.post("/glaucoma-screen", response_model=GlaucomaResponse)
async def glaucoma_screen(file: UploadFile = File(...)):
    """Standalone endpoint (plans/plan_glaucoma.txt): separate opt-in
    feature, not wired into /predict. Internally auto-crops the optic disc
    region before classifying (plans/plan_glaucoma.txt section 2.1) because
    the underlying model was trained on disc-cropped images, not full fundus
    photos -- see inference/glaucoma_engine.py docstring. Always carries
    model_version/is_experimental so callers can't drop the disclaimer."""
    tmp_path = await _save_upload_to_temp(file)
    try:
        await _check_fundus(tmp_path)
        result = await _run_engine(glaucoma_engine.predict, tmp_path)
        return GlaucomaResponse(**result)
    finally:
        tmp_path.unlink(missing_ok=True)


@app.post("/amd-screen", response_model=AmdResponse)
async def amd_screen(file: UploadFile = File(...)):
    """Standalone endpoint (plans/plan_AMD.txt): separate opt-in feature,
    not wired into /predict. Internally applies gamma correction + CLAHE
    before classifying (inference/amd_engine.py) to match the training
    data's own preprocessing. NOT end-to-end validated -- config/amd/
    config.json's "notes" documents overfitting signs found in the training
    log; deployed anyway per explicit user decision. Always carries
    model_version/is_experimental so callers can't drop the disclaimer."""
    tmp_path = await _save_upload_to_temp(file)
    try:
        await _check_fundus(tmp_path)
        result = await _run_engine(amd_engine.predict, tmp_path)
        return AmdResponse(**result)
    finally:
        tmp_path.unlink(missing_ok=True)


@app.post("/cataract-crop-preview", response_model=CataractCropPreviewResponse)
async def cataract_crop_preview(file: UploadFile = File(...)):
    """First half of the confirm-before-classify flow (plans/
    archetechture.txt): runs the same CLIP modality gate as /cataract-screen,
    then ONLY the YuNet eye-ROI auto-crop -- no classification. web/'s
    /cataract page shows the returned crop to the user and asks them to
    confirm or retake BEFORE any prediction happens, since the crop was
    previously an invisible internal step (see cataract_engine.py's
    detect_crop() docstring)."""
    tmp_path = await _save_upload_to_temp(file)
    try:
        await _check_external_eye(tmp_path)
        result = await _run_engine(cataract_engine.detect_crop, tmp_path)
        return CataractCropPreviewResponse(**result)
    finally:
        tmp_path.unlink(missing_ok=True)


@app.post("/cataract-screen", response_model=CataractResponse)
async def cataract_screen(
    file: UploadFile = File(...),
    already_cropped: bool = Query(
        False,
        description="True when `file` is exactly the crop returned by /cataract-crop-preview -- "
        "skips auto-crop and classifies the image as-is instead of re-running YuNet.",
    ),
    eye_crop_applied: bool = Query(
        True,
        description="Only used when already_cropped=True: echoes the eye_crop_applied value from "
        "the earlier /cataract-crop-preview call through into this response.",
    ),
):
    """Standalone endpoint (plans/plan_cataract.txt) -- the only task in
    this system that does NOT take a fundus photo; expects an external/
    anterior eye photo instead. Internally best-effort auto-crops to the
    eye region (inference/cataract_engine.py) since training images are
    already tight single-eye close-ups. NOT end-to-end validated against
    real-world photos -- config/cataract/config.json's "known_caveats"
    documents the confounds investigated (resolution, sharpness, color,
    composition) and the still-open inference-time limitation around the
    training-time label-conditional blur correction. Always carries
    model_version/is_experimental so callers can't drop the disclaimer.

    The CLIP modality gate always runs here regardless of already_cropped --
    even a pre-cropped image goes through it, so a client that calls this
    directly (skipping /cataract-crop-preview) can't bypass the gate by
    passing already_cropped=true."""
    tmp_path = await _save_upload_to_temp(file)
    try:
        await _check_external_eye(tmp_path)
        if already_cropped:
            result = await _run_engine(cataract_engine.predict_precropped, tmp_path, eye_crop_applied)
        else:
            result = await _run_engine(cataract_engine.predict, tmp_path)
        return CataractResponse(**result)
    finally:
        tmp_path.unlink(missing_ok=True)
