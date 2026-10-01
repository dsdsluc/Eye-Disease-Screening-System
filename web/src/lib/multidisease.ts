// Client for web/'s /api/multidisease route (see plans/plan_multidisease.txt
// and src/app/api/multidisease/route.ts), which is the only thing that talks
// to inference/'s /multidisease-screen endpoint and Postgres for this
// feature -- the browser never calls the Python service directly, same
// convention as lib/api.ts's Scan client.

export const DISEASE_LABELS = [
  "normal",
  "diabetes",
  "glaucoma",
  "cataract",
  "amd",
  "hypertension",
  "myopia",
  "other",
] as const;

export type DiseaseLabel = (typeof DISEASE_LABELS)[number];

// Shared between screening-confirmation-form.tsx (the <select> options) and
// /api/doctor/screening-reviews/[screeningId] (validating what's saved) --
// one source of truth so the two can't drift. A coarse next-action category
// rather than DR's follow-up interval dropdown: a glaucoma referral and a
// cataract note don't share a timeline scale the way DR grades do.
export const RECOMMENDATION_OPTIONS = [
  "Không cần theo dõi thêm",
  "Tái khám định kỳ",
  "Cần làm thêm xét nghiệm",
  "Chuyển khám chuyên khoa",
] as const;

export type Recommendation = (typeof RECOMMENDATION_OPTIONS)[number];

// Only "-deep" variants (or sev-*, already used as light-surface text
// elsewhere in this app -- see components/history/scan-card.tsx's
// QUALITY_BADGE) -- globals.css documents that plain --color-teal/--color-gold
// "read too washed-out on white" and this page renders on the light
// surface, not the .dark instrument-panel scope /upload's result view
// sometimes opts into. Each color is only ever shown one at a time (the
// emphasis chart grays out the other 7), so this isn't a categorical
// palette needing CVD-adjacency validation -- just 8 individually-legible
// text/fill colors, reusing tokens already vetted for that in this app.
export const DISEASE_INFO: Record<DiseaseLabel, { label: string; color: string }> = {
  normal: { label: "Không phát hiện bất thường", color: "var(--color-sev-0)" },
  diabetes: { label: "Võng mạc tiểu đường", color: "var(--color-maroon-deep)" },
  glaucoma: { label: "Tăng nhãn áp (glaucoma)", color: "var(--color-teal-deep)" },
  cataract: { label: "Đục thủy tinh thể", color: "var(--color-gold-deep)" },
  amd: { label: "Thoái hóa điểm vàng (AMD)", color: "var(--color-sev-3)" },
  hypertension: { label: "Võng mạc do tăng huyết áp", color: "var(--color-sev-4)" },
  myopia: { label: "Cận thị bệnh lý", color: "var(--color-sev-1)" },
  other: { label: "Bệnh lý khác", color: "var(--color-border)" },
};

// A doctor's own confirmation of this screening (schema.prisma's
// ScreeningReview), read-only from the patient side -- closes the loop
// InsightRail's old static "Đánh giá của bác sĩ" placeholder never actually
// connected (plans/plan_web.txt). null means nobody has chốt it yet.
export type MultiDiseaseDoctorReview = {
  doctorName: string;
  confirmedLabels: DiseaseLabel[];
  recommendation: Recommendation;
  note: string | null;
  updatedAt: string;
};

export type MultiDiseaseResult = {
  topLabel: DiseaseLabel;
  topProb: number;
  top3: { label: DiseaseLabel; prob: number }[];
  probs: Record<DiseaseLabel, number>;
  modelVersion: string;
  isExperimental: boolean;
  /** Only present right after a screen (POST), same convention as
   * ScanResult.quality in lib/api.ts -- not persisted, so a later GET
   * (history) won't have it. */
  cloudUrl?: string | null;
  /** The new MultidiseaseScreening row's id -- present when the screen was
   * saved (logged in), absent for an anonymous result that was never
   * persisted. Lets a caller navigate straight to /multidisease/[id]
   * instead of re-deriving the id some other way. */
  id?: string;
  doctorReview?: MultiDiseaseDoctorReview | null;
};

/** One row from a logged-in user's screening history (GET /api/multidisease).
 * No `top3`/`isExperimental` -- those aren't columns on MultidiseaseScreening
 * (schema.prisma), so history/page.tsx derives top3 from `probs` itself, the
 * same way ProbabilityGrid already sorts a full distribution. */
export type MultiDiseaseSummary = {
  id: string;
  filename: string | null;
  cloudUrl: string | null;
  topLabel: DiseaseLabel;
  topProb: number;
  probs: Record<DiseaseLabel, number>;
  modelVersion: string;
  createdAt: string;
  doctorReview?: MultiDiseaseDoctorReview | null;
};

/** One saved screening's full detail (GET /api/multidisease/[id]) -- the
 * /multidisease/[id] equivalent of ScanResult in lib/api.ts. `top3` IS
 * present here (the route derives it server-side from `probs`), so this
 * satisfies MultiDiseaseResult directly and can go straight into
 * MultidiseaseResultPanel with no client-side reshaping. */
export type MultiDiseaseDetail = MultiDiseaseResult & { id: string; createdAt: string };

async function parseOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? fallback);
  }
  return res.json();
}

export async function screenMultiDisease(file: File): Promise<MultiDiseaseResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/multidisease", { method: "POST", body: form });
  return parseOrThrow(res, "Không thể sàng lọc ảnh, vui lòng thử lại.");
}

/** Re-screens a DR exam already on file (plans/plan_multidisease.txt
 * section 4.3) -- "Sàng lọc thêm các bệnh khác" on /results/[imageId] --
 * instead of asking the user to upload the same photo again. Logged-in
 * only: reusing a saved Scan's image only makes sense for its own owner
 * (the route 401s otherwise). */
export async function screenExistingScan(scanId: string): Promise<MultiDiseaseResult> {
  const form = new FormData();
  form.append("scanId", scanId);
  const res = await fetch("/api/multidisease", { method: "POST", body: form });
  return parseOrThrow(res, "Không thể sàng lọc ảnh, vui lòng thử lại.");
}

export async function getMyMultidiseaseScreenings(): Promise<MultiDiseaseSummary[]> {
  const res = await fetch("/api/multidisease", { cache: "no-store" });
  const data = await parseOrThrow<{ screenings: MultiDiseaseSummary[] }>(res, "Không tải được lịch sử sàng lọc đa bệnh");
  return data.screenings;
}

export async function getMultidiseaseScreening(id: string): Promise<MultiDiseaseDetail> {
  const res = await fetch(`/api/multidisease/${id}`, { cache: "no-store" });
  return parseOrThrow(res, "Không tìm thấy kết quả sàng lọc.");
}
