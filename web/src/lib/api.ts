// Client for web/'s own `/api/scans*` routes (see src/app/api). These routes
// are the only thing that talks to the inference service, Cloudinary, and
// Postgres -- the browser never calls the Python service directly.

export type QualityResult = {
  label: "good" | "usable" | "reject";
  probs: Record<string, number>;
  gate_mode: "fail_open" | "fail_closed";
  blocked: boolean;
};

// A doctor's own confirmation of this scan (schema.prisma's DoctorReview),
// read-only from the patient side -- closes the loop InsightRail's old
// static "Đánh giá của bác sĩ" placeholder never actually connected
// (plans/plan_web.txt). null means nobody has chốt this scan yet.
export type DrDoctorReview = {
  doctorName: string;
  doctorGrade: number;
  note: string | null;
  followUp: string;
  updatedAt: string;
};

export type ScanResult = {
  imageId: string;
  status: "done" | "failed";
  error?: string | null;
  cloudUrl: string | null;
  createdAt: string;
  filename: string;
  grade: number;
  score: number;
  backboneScores: Record<string, number>;
  perFoldScores: Record<string, number[]>;
  /** Only present in the response right after upload (POST /api/scans) --
   * not persisted, so a later GET (history, refresh) won't have it. */
  quality?: QualityResult | null;
  doctorReview?: DrDoctorReview | null;
};

export type ScanSummary = {
  imageId: string;
  filename: string;
  cloudUrl: string | null;
  status: "done" | "failed";
  createdAt: string;
  grade: number | null;
  score: number | null;
  qualityLabel: "good" | "usable" | "reject" | null;
  backboneScores: Record<string, number>;
  doctorReview?: DrDoctorReview | null;
};

export type ReportResult = {
  imageId: string;
  grade: number;
  label: string;
  followUp: string;
  summary: string;
  attentionPoints: string[];
  disclaimer: string;
};

export type ExplainResult = {
  imageId: string;
  heatmapPng: string;
};

export type ClinicalExplanationResult = {
  imageId: string;
  findings: string[];
  reasoning: string;
  disclaimer: string;
};

async function parseOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? fallback);
  }
  return res.json();
}

export async function uploadImage(file: File, existingImageId?: string): Promise<ScanResult> {
  const form = new FormData();
  form.append("file", file);
  if (existingImageId) form.append("imageId", existingImageId);
  const res = await fetch("/api/scans", { method: "POST", body: form });
  return parseOrThrow(res, "Tải ảnh lên thất bại");
}

export async function getScan(imageId: string): Promise<ScanResult> {
  const res = await fetch(`/api/scans/${imageId}`, { cache: "no-store" });
  return parseOrThrow(res, "Không tìm thấy ảnh");
}

export async function getMyScans(): Promise<ScanSummary[]> {
  const res = await fetch("/api/scans", { cache: "no-store" });
  const data = await parseOrThrow<{ scans: ScanSummary[] }>(res, "Không tải được lịch sử");
  return data.scans;
}

export async function generateReport(imageId: string): Promise<ReportResult> {
  const res = await fetch(`/api/scans/${imageId}/report`, { method: "POST" });
  return parseOrThrow(res, "Không tạo được báo cáo diễn giải");
}

export async function getReport(imageId: string): Promise<ReportResult> {
  const res = await fetch(`/api/scans/${imageId}/report`, { cache: "no-store" });
  return parseOrThrow(res, "Chưa có báo cáo");
}

export async function generateExplanation(imageId: string): Promise<ExplainResult> {
  const res = await fetch(`/api/scans/${imageId}/explain`, { method: "POST" });
  return parseOrThrow(res, "Không tạo được bản đồ nhiệt");
}

export async function getExplanation(imageId: string): Promise<ExplainResult> {
  const res = await fetch(`/api/scans/${imageId}/explain`, { cache: "no-store" });
  return parseOrThrow(res, "Chưa có bản đồ nhiệt");
}

export async function generateClinicalExplanation(imageId: string): Promise<ClinicalExplanationResult> {
  const res = await fetch(`/api/scans/${imageId}/clinical-explanation`, { method: "POST" });
  return parseOrThrow(res, "Không tạo được phân tích chuyên sâu");
}

export async function getClinicalExplanation(imageId: string): Promise<ClinicalExplanationResult> {
  const res = await fetch(`/api/scans/${imageId}/clinical-explanation`, { cache: "no-store" });
  return parseOrThrow(res, "Chưa có phân tích chuyên sâu");
}

export const GRADE_LABELS: Record<number, string> = {
  0: "Không có dấu hiệu",
  1: "Mức độ nhẹ",
  2: "Mức độ trung bình",
  3: "Mức độ nặng",
  4: "Tăng sinh",
};

// Plain-language reading of each grade -- shared by the result page and the
// history list so both explain a "grade 3" the same way instead of leaving
// one of them as a bare number. Advisory wording throughout ("nên", "có thể
// cần") -- this is a screening AI, not a diagnosis, so it points toward a
// next step rather than asserting one.
export const GRADE_EXPLANATIONS: Record<number, string> = {
  0: "Không thấy dấu hiệu tổn thương võng mạc do tiểu đường.",
  1: "Có vài dấu hiệu tổn thương nhẹ ở mạch máu võng mạc.",
  2: "Mạch máu võng mạc tổn thương rõ hơn -- nên tái khám sớm.",
  3: "Tổn thương mạch máu ở mức nặng, nên gặp bác sĩ chuyên khoa sớm.",
  4: "Mạch máu bất thường (tăng sinh) -- cần khám chuyên khoa ngay.",
};

/** Same "how tightly did the 20 analyses agree" heuristic ConsensusIndicator
 * uses, factored out so every place that shows a confidence % (the doctor
 * card and the patient result page) stays derived from one definition. */
export function consensusPercent(backboneScores: Record<string, number>): number {
  const values = Object.values(backboneScores);
  const spread = Math.max(...values) - Math.min(...values);
  return Math.max(10, Math.min(100, (1 - spread / 1.6) * 100));
}

export const GRADE_COLORS: Record<number, string> = {
  0: "var(--color-sev-0)",
  1: "var(--color-sev-1)",
  2: "var(--color-sev-2)",
  3: "var(--color-sev-3)",
  4: "var(--color-sev-4)",
};
