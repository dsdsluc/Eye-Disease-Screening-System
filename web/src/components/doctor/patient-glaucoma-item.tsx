import Link from "next/link";
import { ArrowRight } from "lucide-react";

type ReviewedGlaucomaScreening = {
  id: string;
  confirmedLabel: string;
  followUp: string;
  doctorName: string;
  reviewedAt: string;
};

/** Glaucoma equivalent of PatientCaseItem -- same lighter, single-row
 * log-entry treatment. Solid (not dashed) border since glaucoma, unlike
 * multidisease, doesn't carry the "thử nghiệm" lower-confidence framing. */
export function PatientGlaucomaItem({ screening }: { screening: ReviewedGlaucomaScreening }) {
  return (
    <Link
      href={`/doctor/glaucoma/${screening.id}`}
      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 transition-colors hover:bg-secondary/40"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {screening.confirmedLabel === "glaucoma" ? "Tăng nhãn áp" : "Bình thường"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {screening.doctorName} · {new Date(screening.reviewedAt).toLocaleDateString("vi-VN")} · Tái khám{" "}
          {screening.followUp}
        </p>
      </div>
      <ArrowRight
        className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
        strokeWidth={1.75}
      />
    </Link>
  );
}
