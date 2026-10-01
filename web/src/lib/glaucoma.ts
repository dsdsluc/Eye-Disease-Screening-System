// Client for web/'s /api/glaucoma route (plans/plan_glaucoma.txt) -- the
// glaucoma specialist deep-dive, triggered from a multidisease result
// screen (either the probability-threshold banner or the "Phân tích chuyên
// sâu" button inside DiseaseInfoDialog for the glaucoma tile). Same
// "browser never calls the Python service directly" convention as
// lib/multidisease.ts and lib/api.ts.

export type GlaucomaLabel = "normal" | "glaucoma";

/** If the multidisease model's own "glaucoma" probability (one of its 8
 * softmax classes) clears this bar, the result screen surfaces a suggestion
 * banner for the glaucoma deep-dive -- but this is only ever a nudge, never
 * a gate: ProbabilityGrid's glaucoma tile always opens a dialog with the
 * same "Phân tích chuyên sâu" button regardless of probability, since
 * multidisease is single-label (plans/plan_multidisease.txt section 6) and
 * can under-report a real signal by forcing one dominant class per image. */
export const GLAUCOMA_SUGGEST_THRESHOLD = 0.15;

// A doctor's own confirmation of this screening (schema.prisma's
// GlaucomaReview), read-only from the patient side -- closes the loop
// InsightRail's old static "Đánh giá của bác sĩ" placeholder never actually
// connected (plans/plan_web.txt). null means nobody has chốt it yet.
export type GlaucomaDoctorReview = {
  doctorName: string;
  confirmedLabel: GlaucomaLabel;
  note: string | null;
  followUp: string;
  updatedAt: string;
};

export type GlaucomaResult = {
  label: GlaucomaLabel;
  probGlaucoma: number;
  opticDiscCenter: { x: number; y: number };
  modelVersion: string;
  isExperimental: boolean;
  /** Not persisted -- same convention as MultiDiseaseResult.cloudUrl. */
  cloudUrl?: string | null;
  /** The new GlaucomaScreening row's id -- present only when saved (logged in). */
  id?: string;
  doctorReview?: GlaucomaDoctorReview | null;
};

async function parseOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? fallback);
  }
  return res.json();
}

/** Called from the live /multidisease page, which still has the just-
 * uploaded File in memory -- resent directly so the user never has to pick
 * the same photo twice. `multidiseaseScreeningId` links the new
 * GlaucomaScreening row back to the screening that suggested it (omitted
 * for an anonymous result, which was never saved and has no id). */
export async function analyzeGlaucoma(file: File, multidiseaseScreeningId?: string): Promise<GlaucomaResult> {
  const form = new FormData();
  form.append("file", file);
  if (multidiseaseScreeningId) form.append("multidiseaseScreeningId", multidiseaseScreeningId);
  const res = await fetch("/api/glaucoma", { method: "POST", body: form });
  return parseOrThrow(res, "Không thể phân tích ảnh, vui lòng thử lại.");
}

/** Called from /multidisease/[id] (a saved screening's detail page), which
 * only has a cloudUrl, not the original File -- the route fetches that
 * image server-side instead. Logged-in only, same as screenExistingScan. */
export async function analyzeGlaucomaFromScreening(multidiseaseScreeningId: string): Promise<GlaucomaResult> {
  const form = new FormData();
  form.append("multidiseaseScreeningId", multidiseaseScreeningId);
  const res = await fetch("/api/glaucoma", { method: "POST", body: form });
  return parseOrThrow(res, "Không thể phân tích ảnh, vui lòng thử lại.");
}

/** One row from a logged-in user's screening history (GET /api/glaucoma) --
 * same shape convention as MultiDiseaseSummary (lib/multidisease.ts). */
export type GlaucomaSummary = {
  id: string;
  filename: string | null;
  cloudUrl: string | null;
  label: GlaucomaLabel;
  probGlaucoma: number;
  modelVersion: string;
  createdAt: string;
  doctorReview?: GlaucomaDoctorReview | null;
};

export async function getMyGlaucomaScreenings(): Promise<GlaucomaSummary[]> {
  const res = await fetch("/api/glaucoma", { cache: "no-store" });
  const data = await parseOrThrow<{ screenings: GlaucomaSummary[] }>(
    res,
    "Không tải được lịch sử sàng lọc tăng nhãn áp."
  );
  return data.screenings;
}

/** One saved screening's full detail (GET /api/glaucoma/[id]) -- the
 * /glaucoma/[id] equivalent of MultiDiseaseDetail. */
export type GlaucomaDetail = GlaucomaResult & { id: string; createdAt: string };

export async function getGlaucomaScreening(id: string): Promise<GlaucomaDetail> {
  const res = await fetch(`/api/glaucoma/${id}`, { cache: "no-store" });
  return parseOrThrow(res, "Không tìm thấy kết quả sàng lọc.");
}
