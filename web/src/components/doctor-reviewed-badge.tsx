import { Stethoscope } from "lucide-react";

/** Small pill shown on a patient-facing history card (ScanCard,
 * ScreeningHistoryCard, GlaucomaHistoryCard, CataractHistoryCard) when the
 * underlying scan/screening has a real doctor review attached -- the first
 * patient-visible signal that "Đánh giá của bác sĩ" (previously a static
 * placeholder in InsightRail, plans/plan_web.txt) is now a real, per-item
 * thing rather than a page-wide "sắp ra mắt" notice. The full note/verdict/
 * follow-up itself lives on the card's own detail page (DoctorReviewNote),
 * not here -- this is just the "there's something to open" signal. */
export function DoctorReviewedBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full bg-teal/15 px-2 py-0.5 font-condensed text-[9px] font-medium uppercase tracking-wider text-teal-deep">
      <Stethoscope className="h-2.5 w-2.5" strokeWidth={2} />
      Bác sĩ đã xem
    </span>
  );
}
