// Client for web/'s /api/amd route (plans/plan_AMD.txt) -- the AMD
// specialist screening, standalone from /amd. Same "browser never calls the
// Python service directly" convention as lib/glaucoma.ts and lib/cataract.ts.

export type AmdLabel = "normal" | "amd";

export type AmdResult = {
  label: AmdLabel;
  probAmd: number;
  modelVersion: string;
  isExperimental: boolean;
  /** Not persisted -- same convention as GlaucomaResult.cloudUrl. */
  cloudUrl?: string | null;
  /** The new AmdScreening row's id -- present only when saved (logged in). */
  id?: string;
};

// Threshold-banded advice for the result screen -- same 5-tier severity
// grammar (sev-0..sev-4, "Không có dấu hiệu" -> "Tăng sinh") DR grading
// already uses (GRADE_LABELS/GRADE_COLORS/GRADE_EXPLANATIONS, lib/api.ts),
// applied to AMD's own continuous probAmd score instead of a discrete model
// output -- the underlying model is still binary (config/amd/config.json's
// labels: ["normal","amd"], threshold 0.5), so this is a UI-level read of
// "how far into which side of that line," not a 5-class model. Replaces an
// earlier single blanket low-confidence warning: that read as scarier than
// the rest of the app for a result that often has nothing wrong at all, and
// gave the same advice regardless of the actual score. Advisory wording
// throughout ("nên", "có thể cần"), same voice as GRADE_EXPLANATIONS -- a
// screening aid pointing to a next step, not a diagnosis.
export const AMD_ADVICE_TIERS: { maxProb: number; color: string; title: string; body: string }[] = [
  {
    maxProb: 0.2,
    color: "var(--color-sev-0)",
    title: "Rất tốt — chưa tìm thấy dấu hiệu",
    body: "Mô hình chưa tìm thấy dấu hiệu thoái hóa điểm vàng trên ảnh này. Bạn nên tiếp tục khám mắt định kỳ để theo dõi lâu dài.",
  },
  {
    maxProb: 0.4,
    color: "var(--color-sev-1)",
    title: "Chưa rõ ràng, nên theo dõi thêm",
    body: "Mô hình chưa xác định rõ có dấu hiệu bất thường hay không. Nếu thị lực trung tâm có thay đổi, bạn nên khám mắt sớm hơn dự kiến.",
  },
  {
    maxProb: 0.6,
    color: "var(--color-sev-2)",
    title: "Có vài dấu hiệu cần chú ý",
    body: "Xuất hiện một số dấu hiệu chưa điển hình của thoái hóa điểm vàng. Nên tái khám hoặc theo dõi thêm trong thời gian tới.",
  },
  {
    maxProb: 0.8,
    color: "var(--color-sev-3)",
    title: "Dấu hiệu nghi ngờ khá rõ",
    body: "Mô hình phát hiện dấu hiệu nghi ngờ thoái hóa điểm vàng. Bạn nên đặt lịch khám chuyên khoa mắt sớm để được đánh giá chính xác hơn.",
  },
  {
    maxProb: 1.01,
    color: "var(--color-sev-4)",
    title: "Dấu hiệu khá rõ rệt, nên khám sớm",
    body: "Đặc biệt nếu bạn thấy hình ảnh biến dạng hoặc mờ đột ngột ở trung tâm tầm nhìn, nên khám chuyên khoa mắt ngay để được đánh giá chính xác.",
  },
];

export function getAmdAdvice(probAmd: number) {
  return AMD_ADVICE_TIERS.find((tier) => probAmd < tier.maxProb) ?? AMD_ADVICE_TIERS[AMD_ADVICE_TIERS.length - 1];
}

async function parseOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? fallback);
  }
  return res.json();
}

export async function analyzeAmd(file: File): Promise<AmdResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/amd", { method: "POST", body: form });
  return parseOrThrow(res, "Không thể phân tích ảnh, vui lòng thử lại.");
}

/** One row from a logged-in user's screening history (GET /api/amd) -- same
 * shape convention as GlaucomaSummary (lib/glaucoma.ts). */
export type AmdSummary = {
  id: string;
  filename: string | null;
  cloudUrl: string | null;
  label: AmdLabel;
  probAmd: number;
  modelVersion: string;
  createdAt: string;
};

export async function getMyAmdScreenings(): Promise<AmdSummary[]> {
  const res = await fetch("/api/amd", { cache: "no-store" });
  const data = await parseOrThrow<{ screenings: AmdSummary[] }>(
    res,
    "Không tải được lịch sử sàng lọc thoái hóa điểm vàng."
  );
  return data.screenings;
}

/** One saved screening's full detail (GET /api/amd/[id]) -- the /amd/[id]
 * equivalent of GlaucomaDetail. */
export type AmdDetail = AmdResult & { id: string; createdAt: string };

export async function getAmdScreening(id: string): Promise<AmdDetail> {
  const res = await fetch(`/api/amd/${id}`, { cache: "no-store" });
  return parseOrThrow(res, "Không tìm thấy kết quả sàng lọc.");
}
