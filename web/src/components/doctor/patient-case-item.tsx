import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { GRADE_COLORS, GRADE_LABELS } from "@/lib/api";

type ReviewedCase = {
  id: string;
  grade: number;
  aiGrade: number;
  followUp: string;
  doctorName: string;
  reviewedAt: string;
};

/** One reviewed DR case in the patient chart's history grid
 * (app/doctor/patients/[id]) -- a much smaller, lighter version of
 * QueueCard for the same reason ScreeningQueueCard isn't QueueCard with a
 * variant prop: this is a settled log entry to skim, not a worklist item
 * to act on, so it drops the photo/gauge/consensus instrumentation down to
 * a single row. Same grade-color language (GRADE_COLORS) keeps it legible
 * as "the same system," just quieter. */
export function PatientCaseItem({ scan }: { scan: ReviewedCase }) {
  const color = GRADE_COLORS[scan.grade];
  return (
    <Link
      href={`/doctor/case/${scan.id}`}
      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 transition-colors hover:bg-secondary/40"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {scan.grade}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {GRADE_LABELS[scan.grade]}
          {scan.grade !== scan.aiGrade && (
            <span className="ml-1.5 font-normal text-muted-foreground">(AI: {GRADE_LABELS[scan.aiGrade]})</span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {scan.doctorName} · {new Date(scan.reviewedAt).toLocaleDateString("vi-VN")} · Tái khám {scan.followUp}
        </p>
      </div>
      <ArrowRight
        className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
        strokeWidth={1.75}
      />
    </Link>
  );
}
