// Client for web/'s /api/cataract route (plans/plan_cataract.txt) -- the
// browser never calls the Python inference service directly, same
// convention as lib/glaucoma.ts and lib/multidisease.ts. Real end to end:
// /api/cataract proxies to inference/'s /cataract-screen (YuNet face
// detection -> eye-ROI crop -> classify -- this is the one screening
// feature here that does NOT use a fundus photo, see inference/
// cataract_engine.py's own docstring) and, for a logged-in visitor,
// persists a CataractScreening row.

export type CataractLabel = "normal" | "cataract";

// A doctor's own confirmation of this screening (schema.prisma's
// CataractReview), read-only from the patient side -- closes the loop
// InsightRail's old static "Đánh giá của bác sĩ" placeholder never actually
// connected (plans/plan_web.txt). null means nobody has chốt it yet.
export type CataractDoctorReview = {
  doctorName: string;
  confirmedLabel: CataractLabel;
  note: string | null;
  followUp: string;
  updatedAt: string;
};

export type CataractResult = {
  label: CataractLabel;
  probCataract: number;
  /** Whether YuNet actually found a face to crop around (cataract_engine.py's
   * best-effort auto-crop) -- false means the model ran on the whole,
   * uncropped photo instead of just the eye, a real accuracy caveat worth
   * surfacing rather than silently dropping. */
  eyeCropApplied: boolean;
  modelVersion: string;
  isExperimental: boolean;
  /** Not persisted -- same convention as GlaucomaResult.cloudUrl. */
  cloudUrl?: string | null;
  /** The new CataractScreening row's id -- present only when saved (logged
   * in). */
  id?: string;
  doctorReview?: CataractDoctorReview | null;
};

// Threshold-banded advice, same 5-tier severity grammar (sev-0..sev-4) as
// AMD's own AMD_ADVICE_TIERS (lib/amd.ts) -- see that file's header comment
// for why this replaced an earlier blanket low-confidence warning. Doubly
// warranted here: config/cataract/config.json's own "known_caveats" flags
// val_f1=1.0 as an almost-certainly-inflated number (a residual sharpness
// confound between classes, 2.10x even after the v2 equalization fix), so
// this screen never surfaces that percentage either.
export const CATARACT_ADVICE_TIERS: { maxProb: number; color: string; title: string; body: string }[] = [
  {
    maxProb: 0.2,
    color: "var(--color-sev-0)",
    title: "Rất tốt — chưa tìm thấy dấu hiệu",
    body: "Mô hình chưa tìm thấy dấu hiệu đục thủy tinh thể trên ảnh này. Bạn nên tiếp tục khám mắt định kỳ để theo dõi lâu dài.",
  },
  {
    maxProb: 0.4,
    color: "var(--color-sev-1)",
    title: "Chưa rõ ràng, nên theo dõi thêm",
    body: "Mô hình chưa xác định rõ có dấu hiệu bất thường hay không. Nếu thị lực có thay đổi (mờ, chói sáng, nhìn đôi), bạn nên khám mắt sớm hơn dự kiến.",
  },
  {
    maxProb: 0.6,
    color: "var(--color-sev-2)",
    title: "Có vài dấu hiệu cần chú ý",
    body: "Xuất hiện một số dấu hiệu chưa điển hình của đục thủy tinh thể. Nên tái khám hoặc theo dõi thêm trong thời gian tới.",
  },
  {
    maxProb: 0.8,
    color: "var(--color-sev-3)",
    title: "Dấu hiệu nghi ngờ khá rõ",
    body: "Mô hình phát hiện dấu hiệu nghi ngờ đục thủy tinh thể. Bạn nên đặt lịch khám chuyên khoa mắt sớm để được đánh giá chính xác hơn.",
  },
  {
    maxProb: 1.01,
    color: "var(--color-sev-4)",
    title: "Dấu hiệu khá rõ rệt, nên khám sớm",
    body: "Đặc biệt nếu bạn thấy mắt mờ đục, chói sáng hoặc nhìn khó vào ban đêm, nên khám chuyên khoa mắt sớm để được đánh giá chính xác.",
  },
];

export function getCataractAdvice(probCataract: number) {
  return (
    CATARACT_ADVICE_TIERS.find((tier) => probCataract < tier.maxProb) ??
    CATARACT_ADVICE_TIERS[CATARACT_ADVICE_TIERS.length - 1]
  );
}

async function parseOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? fallback);
  }
  return res.json();
}

// Set when `file` is exactly the crop image previewCataractCrop() below
// returned and the user already confirmed it (app/cataract/page.tsx's
// confirm-crop screen) -- see /api/cataract/route.ts and inference/
// cataract_engine.py's predict_precropped() for why this skips re-cropping.
export async function analyzeCataract(
  file: File,
  precropped?: { eyeCropApplied: boolean }
): Promise<CataractResult> {
  const form = new FormData();
  form.append("file", file);
  if (precropped) {
    form.append("alreadyCropped", "true");
    form.append("eyeCropApplied", String(precropped.eyeCropApplied));
  }
  const res = await fetch("/api/cataract", { method: "POST", body: form });
  return parseOrThrow(res, "Không thể phân tích ảnh, vui lòng thử lại.");
}

export type CataractCropPreview = {
  croppedPng: string;
  eyeCropApplied: boolean;
};

/** First half of the confirm-before-classify flow (plans/archetechture.txt)
 * -- runs the CLIP modality gate + YuNet eye-crop only, no classification.
 * Lets the page show the user the real crop and get a confirm/retake
 * decision before analyzeCataract() above ever runs. */
export async function previewCataractCrop(file: File): Promise<CataractCropPreview> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/cataract/crop-preview", { method: "POST", body: form });
  return parseOrThrow(res, "Không thể xử lý ảnh, vui lòng thử lại.");
}

/** One row from a logged-in user's screening history (GET /api/cataract) --
 * same shape convention as GlaucomaSummary (lib/glaucoma.ts). */
export type CataractSummary = {
  id: string;
  filename: string | null;
  cloudUrl: string | null;
  label: CataractLabel;
  probCataract: number;
  eyeCropApplied: boolean;
  modelVersion: string;
  createdAt: string;
  doctorReview?: CataractDoctorReview | null;
};

export async function getMyCataractScreenings(): Promise<CataractSummary[]> {
  const res = await fetch("/api/cataract", { cache: "no-store" });
  const data = await parseOrThrow<{ screenings: CataractSummary[] }>(
    res,
    "Không tải được lịch sử sàng lọc đục thủy tinh thể."
  );
  return data.screenings;
}

/** One saved screening's full detail (GET /api/cataract/[id]) -- the
 * /cataract/[id] equivalent of GlaucomaDetail (lib/glaucoma.ts). */
export type CataractDetail = CataractResult & { id: string; createdAt: string };

export async function getCataractScreening(id: string): Promise<CataractDetail> {
  const res = await fetch(`/api/cataract/${id}`, { cache: "no-store" });
  return parseOrThrow(res, "Không tìm thấy kết quả sàng lọc.");
}
