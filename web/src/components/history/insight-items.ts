import { FileText, Sparkles } from "lucide-react";

/** Two placeholders left -- see plans/plan_web.txt: the AI-explanation and
 * full-report features aren't built yet, this reserves their entry points
 * next to the progression chart. "report" opens a near-fullscreen dialog
 * (see the `size` field) since a full report is expected to hold much more
 * than the other one -- that one stays compact since a placeholder notice
 * doesn't need the room.
 *
 * A third item, "doctor" ("Đánh giá của bác sĩ"), used to live here too --
 * removed once it stopped being a placeholder: a doctor's review is now
 * real, per-scan/per-screening data (DoctorReview/ScreeningReview/
 * GlaucomaReview/CataractReview, schema.prisma), which doesn't fit a single
 * page-wide button the way "AI phân tích" or "báo cáo đầy đủ" still can --
 * there's no one review to open, there's one PER history item. See
 * DoctorReviewedBadge (on each history card) and DoctorReviewNote (on each
 * item's own detail page) for where that real data actually lives now. */
export type InsightPanel = null | "ai" | "report";

export const INSIGHT_ITEMS: {
  key: Exclude<InsightPanel, null>;
  icon: typeof Sparkles;
  label: string;
  hint: string;
  size: "sm" | "lg";
}[] = [
  { key: "ai", icon: Sparkles, label: "Phân tích của AI", hint: "Diễn giải chi tiết từ mô hình", size: "sm" },
  { key: "report", icon: FileText, label: "Xem báo cáo đầy đủ", hint: "Tổng hợp toàn bộ kết quả", size: "lg" },
];

export const INSIGHT_COPY: Record<Exclude<InsightPanel, null>, { title: string; description: string }> = {
  ai: {
    title: "Phân tích của AI",
    description: "Bản diễn giải chi tiết từ AI (vùng đáng chú ý trên ảnh, mức độ tin cậy theo từng kiến trúc...) đang được xây dựng.",
  },
  report: {
    title: "Báo cáo đầy đủ",
    description: "Bản báo cáo tổng hợp (ảnh, mức độ, đồng thuận mô hình, diễn giải AI, đánh giá bác sĩ...) đang được xây dựng.",
  },
};
