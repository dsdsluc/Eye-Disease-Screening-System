import "server-only";

const INFERENCE_URL = process.env.INFERENCE_URL ?? "http://127.0.0.1:8000";

export type PredictResult = {
  grade: number;
  score: number;
  backbone_scores: Record<string, number>;
  per_fold_scores: Record<string, number[]>;
};

export type ExplainResult = {
  heatmap_png: string;
};

export type QualityResult = {
  label: "good" | "usable" | "reject";
  probs: Record<string, number>;
  gate_mode: "fail_open" | "fail_closed";
  blocked: boolean;
};

// Snake_case, matching inference/main.py's MultiDiseaseResponse (pydantic)
// verbatim -- the API route maps this to the app's usual camelCase before
// it reaches the browser.
export type MultiDiseaseServerResult = {
  top_label: string;
  top_prob: number;
  top3: { label: string; prob: number }[];
  probs: Record<string, number>;
  model_version: string;
  is_experimental: boolean;
};

// Snake_case, matching inference/main.py's GlaucomaResponse (pydantic)
// verbatim -- same convention as MultiDiseaseServerResult above.
export type GlaucomaServerResult = {
  label: string;
  prob_glaucoma: number;
  optic_disc_center: { x: number; y: number };
  model_version: string;
  is_experimental: boolean;
};

// Snake_case, matching inference/main.py's CataractResponse (pydantic)
// verbatim -- same convention as GlaucomaServerResult above.
export type CataractServerResult = {
  label: string;
  prob_cataract: number;
  eye_crop_applied: boolean;
  model_version: string;
  is_experimental: boolean;
};

// Snake_case, matching inference/main.py's CataractCropPreviewResponse.
export type CataractCropPreviewServerResult = {
  cropped_png: string;
  eye_crop_applied: boolean;
};

// Snake_case, matching inference/main.py's AmdResponse (pydantic) verbatim
// -- same convention as GlaucomaServerResult/CataractServerResult above.
export type AmdServerResult = {
  label: string;
  prob_amd: number;
  model_version: string;
  is_experimental: boolean;
};

function toFormData(buffer: Buffer, filename: string): FormData {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)]), filename);
  return form;
}

// Every /predict, /explain, /multidisease-screen, /glaucoma-screen and
// /amd-screen call runs through main.py's _check_fundus gate first (CLIP
// modality check, then QuickQual), which 422s with an actual, actionable
// FastAPI `detail` string ("Ảnh không giống ảnh chụp đáy mắt...", "Ảnh
// không đạt chất lượng để phân tích..."). Dropping that in favor of a bare
// "Inference service trả lỗi (422)" is what made every one of those
// rejections unreadable on the client -- screenCataract/previewCataractCrop
// already parsed `detail` for their own 422s (the CLIP eye-vs-fundus gate);
// this is that same fix, generalized to every endpoint here instead of
// living as one-off duplicated logic on two of the seven.
// _check_fundus's quality-gate rejection (inference/main.py) appends its raw
// probs dict to the message ("Ảnh không đạt chất lượng để phân tích
// (label=reject, probs={'good': 0.01, 'usable': 0.09, 'reject': 0.88}).") --
// useful in a server log, not to a patient deciding what to do next. Swap
// that parenthetical for an actual next step. Every other detail string
// here (the modality-gate rejections, cataract's external-eye one) is
// already just a plain, actionable sentence and passes through untouched.
function humanizeInferenceDetail(detail: string): string {
  if (detail.startsWith("Ảnh không đạt chất lượng để phân tích")) {
    return "Ảnh không đạt chất lượng để phân tích (quá mờ, thiếu sáng, hoặc bị che khuất). Vui lòng chụp lại ảnh rõ nét, đủ sáng hơn.";
  }
  return detail;
}

async function throwInferenceError(res: Response): Promise<never> {
  const body = await res.json().catch(() => null);
  const detail = typeof body?.detail === "string" ? humanizeInferenceDetail(body.detail) : null;
  throw new Error(detail ?? `Inference service trả lỗi (${res.status})`);
}

export async function predictImage(buffer: Buffer, filename: string): Promise<PredictResult> {
  const res = await fetch(`${INFERENCE_URL}/predict`, {
    method: "POST",
    body: toFormData(buffer, filename),
  });
  if (!res.ok) return throwInferenceError(res);
  return res.json();
}

export async function explainImage(buffer: Buffer, filename: string): Promise<ExplainResult> {
  const res = await fetch(`${INFERENCE_URL}/explain`, {
    method: "POST",
    body: toFormData(buffer, filename),
  });
  if (!res.ok) return throwInferenceError(res);
  return res.json();
}

// gate_mode "fail_open": never blocks the grading, only reports -- the
// caller (route.ts) decides whether/how to surface the warning. See
// inference/quality_engine.py and plans/archetechture.txt section 10.
export async function checkImageQuality(buffer: Buffer, filename: string): Promise<QualityResult> {
  const res = await fetch(`${INFERENCE_URL}/quality-check?gate_mode=fail_open`, {
    method: "POST",
    body: toFormData(buffer, filename),
  });
  if (!res.ok) return throwInferenceError(res);
  return res.json();
}

// Standalone endpoint (plans/plan_multidisease.txt section 3.3) -- never
// called from /api/scans's flow, only from /api/multidisease when the user
// explicitly opts into this separate, lower-confidence screen.
export async function screenMultiDisease(buffer: Buffer, filename: string): Promise<MultiDiseaseServerResult> {
  const res = await fetch(`${INFERENCE_URL}/multidisease-screen`, {
    method: "POST",
    body: toFormData(buffer, filename),
  });
  if (!res.ok) return throwInferenceError(res);
  return res.json();
}

// Standalone endpoint (plans/plan_glaucoma.txt) -- separate opt-in deep-dive,
// triggered from a multidisease result (threshold banner or the "Phân tích
// chuyên sâu" button in DiseaseInfoDialog) or run on its own. Internally
// auto-crops the optic disc before classifying -- see inference/
// glaucoma_engine.py; callers here never see that step, just the result.
export async function screenGlaucoma(buffer: Buffer, filename: string): Promise<GlaucomaServerResult> {
  const res = await fetch(`${INFERENCE_URL}/glaucoma-screen`, {
    method: "POST",
    body: toFormData(buffer, filename),
  });
  if (!res.ok) return throwInferenceError(res);
  return res.json();
}

// Standalone endpoint (plans/plan_cataract.txt) -- the one screening feature
// here that doesn't take a fundus photo (a close-up face/eye shot instead).
// Internally best-effort auto-crops the eye region via YuNet face detection
// before classifying -- see inference/cataract_engine.py.
//
// `precropped` is set when `buffer` is EXACTLY the crop image
// previewCataractCrop() below returned and the user already confirmed it
// (components/cataract/cataract-crop-confirm.tsx) -- forwarded as
// inference/main.py's already_cropped/eye_crop_applied query params so
// /cataract-screen classifies it as-is instead of re-running YuNet on an
// image that was already cropped and approved once (see cataract_engine.py's
// predict_precropped() docstring for why running detection twice is risky).
export async function screenCataract(
  buffer: Buffer,
  filename: string,
  precropped?: { eyeCropApplied: boolean }
): Promise<CataractServerResult> {
  const url = new URL(`${INFERENCE_URL}/cataract-screen`);
  if (precropped) {
    url.searchParams.set("already_cropped", "true");
    url.searchParams.set("eye_crop_applied", String(precropped.eyeCropApplied));
  }
  const res = await fetch(url, {
    method: "POST",
    body: toFormData(buffer, filename),
  });
  // inference/cataract_engine.py's image-type guard (fundus vs. external
  // eye) returns a specific, actionable FastAPI `detail` message on 422
  // ("Ảnh không giống ảnh mắt ngoài...") -- this is the one screening
  // feature here where uploading the WRONG kind of photo entirely is an
  // expected, common mistake (every other page wants a fundus photo; this
  // one doesn't), which is exactly why this was the first of the seven to
  // get throwInferenceError's detail-parsing in the first place.
  if (!res.ok) return throwInferenceError(res);
  return res.json();
}

// Standalone endpoint (plans/plan_AMD.txt) -- unlike glaucoma/cataract, no
// crop step to narrate: inference/amd_engine.py's own preprocessing (gamma
// correction + CLAHE, to match how AMDNet23's training images were
// enhanced) runs unconditionally inside the classify call itself, nothing
// for this client to see or forward first.
export async function screenAmd(buffer: Buffer, filename: string): Promise<AmdServerResult> {
  const res = await fetch(`${INFERENCE_URL}/amd-screen`, {
    method: "POST",
    body: toFormData(buffer, filename),
  });
  if (!res.ok) return throwInferenceError(res);
  return res.json();
}

// First half of the confirm-before-classify flow (plans/archetechture.txt):
// runs the CLIP modality gate + YuNet eye-crop ONLY, no classification yet --
// lets web/'s /cataract page show the user the actual crop and get a
// confirm/retake decision before screenCataract() above ever runs.
export async function previewCataractCrop(
  buffer: Buffer,
  filename: string
): Promise<CataractCropPreviewServerResult> {
  const res = await fetch(`${INFERENCE_URL}/cataract-crop-preview`, {
    method: "POST",
    body: toFormData(buffer, filename),
  });
  if (!res.ok) return throwInferenceError(res);
  return res.json();
}
