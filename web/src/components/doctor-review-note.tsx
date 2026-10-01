"use client";

import { Stethoscope } from "lucide-react";

import { isRichTextEmpty } from "@/lib/utils";

/** Read-only "here's what the doctor said" card for a patient-facing result
 * panel (ScanResultPanel, MultidiseaseResultPanel, GlaucomaResultPanel,
 * CataractResultPanel) -- the real thing InsightRail's old static "Đánh giá
 * của bác sĩ" placeholder (plans/plan_web.txt) was standing in for. Shared
 * across all four features since there's genuinely nothing feature-specific
 * left to say once the verdict has already been turned into plain text by
 * the caller (verdictLabel/verdictColor) -- unlike the doctor-side
 * CONFIRMATION forms, which stay separate per feature because they're
 * interactive and their input shapes really do differ (a 0-4 grade vs. a
 * label set vs. a binary pick), this is just a label to read. Rendered only
 * when a review actually exists -- callers pass `review={null}` (or omit
 * it) otherwise, same as every other optional section these panels have. */
export function DoctorReviewNote({
  doctorName,
  verdictLabel,
  verdictColor,
  note,
  metaLine,
  updatedAt,
}: {
  doctorName: string;
  verdictLabel: string;
  verdictColor: string;
  note: string | null;
  /** Feature-specific closing line -- "Tái khám: 3 tháng" for DR/glaucoma/
   * cataract's followUp column, "Hướng xử lý: ..." for multidisease's
   * recommendation (ScreeningReview has no followUp column, schema.prisma --
   * a coarse next-action category instead, RECOMMENDATION_OPTIONS). */
  metaLine: string;
  updatedAt: string;
}) {
  return (
    <div className="w-full max-w-lg rounded-2xl border border-border/60 bg-card/60 px-6 py-5 text-left backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-4 w-4 text-teal-deep" strokeWidth={1.75} />
        <span className="font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
          Nhận xét của bác sĩ
        </span>
      </div>
      <p className="mt-2 text-base font-semibold" style={{ color: verdictColor }}>
        {verdictLabel}
      </p>
      {note && !isRichTextEmpty(note) && (
        <div
          className="prose prose-sm mt-2 max-w-none text-sm leading-relaxed text-muted-foreground [&_p]:my-1"
          dangerouslySetInnerHTML={{ __html: note }}
        />
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{doctorName}</span>
        <span>·</span>
        <span>{new Date(updatedAt).toLocaleDateString("vi-VN")}</span>
        <span>·</span>
        <span>{metaLine}</span>
      </div>
    </div>
  );
}
