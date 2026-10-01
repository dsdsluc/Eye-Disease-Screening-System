import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight, ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { GRADE_COLORS, GRADE_EXPLANATIONS, GRADE_LABELS, type ScanSummary } from "@/lib/api";
import { ScopeFrame } from "@/components/scope-frame";
import { SeverityGauge } from "@/components/severity-gauge";
import { DoctorReviewedBadge } from "@/components/doctor-reviewed-badge";
import { fullDate } from "@/components/history/format";

const QUALITY_BADGE: Record<"usable" | "reject", { text: string; className: string }> = {
  usable: { text: "Chất lượng tạm được", className: "bg-sev-2/15 text-sev-2" },
  reject: { text: "Nên chụp lại", className: "bg-sev-4/15 text-sev-4" },
};

/** One exam plate in the history grid -- photo | content, not a table row,
 * so the photo stays the app's signature ScopeFrame aperture while the
 * grade/date/quality flag get proper room to read as text. `index` only
 * drives the entrance-animation stagger (capped so a long list doesn't
 * cascade forever). */
export function ScanCard({ scan, userFullName, index }: { scan: ScanSummary; userFullName: string; index: number }) {
  const qualityFlag = scan.qualityLabel && scan.qualityLabel !== "good" ? QUALITY_BADGE[scan.qualityLabel] : null;
  const color = scan.grade !== null ? GRADE_COLORS[scan.grade] : "var(--color-border)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/results/${scan.imageId}`}
        className="group relative grid grid-cols-[auto_1fr] items-start gap-7 rounded-2xl border border-border/60 bg-card p-6 transition-colors hover:bg-secondary/40"
      >
        <div className="relative">
          <ScopeFrame
            size={112}
            ringColor={color}
            className="transition-transform duration-300 group-hover:scale-[1.03]"
            interiorClassName="bg-ink-raised"
          >
            {scan.cloudUrl ? (
              <Image src={scan.cloudUrl} alt="" fill unoptimized className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageOff className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </ScopeFrame>

          {/* The stamp -- corner-printed grade, like a film date. */}
          {scan.grade !== null && (
            <span
              className="absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card font-mono text-xs font-bold text-white"
              style={{ backgroundColor: color }}
            >
              {scan.grade}
            </span>
          )}
        </div>

        {/* Content reads as a complete result on its own -- whose result,
            what grade, when, at what confidence, and where that grade sits
            on the full 0-4 scale -- so the card still means something out
            of context (a screenshot, a printout), not just as a teaser for
            the detail page. */}
        <div className="min-w-0 text-left">
          <p className="font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
            {userFullName} · {fullDate(scan.createdAt)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <p className="text-lg font-semibold text-foreground">
              {scan.grade !== null ? GRADE_LABELS[scan.grade] : "Đang xử lý"}
            </p>
            {scan.score !== null && (
              <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                Điểm {scan.score.toFixed(2)}
              </span>
            )}
            {qualityFlag && (
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", qualityFlag.className)}>{qualityFlag.text}</span>
            )}
            {scan.doctorReview && <DoctorReviewedBadge />}
          </div>
          {/* Plain-language reading of the grade, in place of a bare
              timestamp (moved up next to the name above) -- this is the
              sentence that makes the card readable without already knowing
              what a "grade 3" means. */}
          {scan.grade !== null && <p className="mt-1.5 text-sm text-muted-foreground">{GRADE_EXPLANATIONS[scan.grade]}</p>}
          {scan.grade !== null && (
            <div className="mt-5 max-w-xs">
              <SeverityGauge grade={scan.grade} />
            </div>
          )}
        </div>

        {/* A quiet hover affordance -- confirms the whole plate is
            clickable without adding a visible "View" button that would
            compete with the exam data for attention. */}
        <ArrowRight
          className="pointer-events-none absolute top-6 right-6 h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
          strokeWidth={1.75}
        />
      </Link>
    </motion.div>
  );
}
