import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { DISEASE_INFO, type DiseaseLabel } from "@/lib/multidisease";

type ReviewedScreening = {
  id: string;
  confirmedLabels: DiseaseLabel[];
  recommendation: string;
  doctorName: string;
  reviewedAt: string;
};

/** Multi-disease equivalent of PatientCaseItem -- same lighter, single-row
 * log-entry treatment, dashed border + gold accent so it still reads as
 * the "don't imply DR-level confidence" language used everywhere else this
 * feature sits next to a DR result. */
export function PatientScreeningItem({ screening }: { screening: ReviewedScreening }) {
  return (
    <Link
      href={`/doctor/screening/${screening.id}`}
      className="group flex items-center gap-3 rounded-xl border border-dashed border-border/70 bg-card/60 px-4 py-3 transition-colors hover:bg-secondary/40"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {screening.confirmedLabels.map((l) => DISEASE_INFO[l].label).join(", ")}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {screening.doctorName} · {new Date(screening.reviewedAt).toLocaleDateString("vi-VN")} · {screening.recommendation}
        </p>
      </div>
      <ArrowRight
        className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
        strokeWidth={1.75}
      />
    </Link>
  );
}
