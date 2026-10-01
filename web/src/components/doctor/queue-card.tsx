"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, ImageOff, Microscope } from "lucide-react";

import { cn } from "@/lib/utils";
import { GRADE_COLORS, GRADE_EXPLANATIONS, GRADE_LABELS, consensusPercent } from "@/lib/api";
import { ImageZoomDialog } from "@/components/image-zoom-dialog";
import { SeverityGauge } from "@/components/severity-gauge";

const QUALITY_BADGE: Record<"usable" | "reject", { text: string; className: string }> = {
  usable: { text: "Chất lượng tạm được", className: "bg-sev-2/15 text-sev-2" },
  reject: { text: "Nên chụp lại", className: "bg-sev-4/15 text-sev-4" },
};

// Same three-tier read as ConsensusIndicator (components/consensus-
// indicator.tsx), but a one-line version for a list card -- that
// component's own full card (title + description + 20-run footnote) is too
// tall to repeat once per queue row without burying the case underneath it.
function consensusLevel(backboneScores: Record<string, number>) {
  const values = Object.values(backboneScores);
  const spread = Math.max(...values) - Math.min(...values);
  if (spread <= 0.3) return { text: "Đồng thuận cao", color: "var(--color-sev-0)" };
  if (spread <= 0.5) return { text: "Đồng thuận khá tốt", color: "var(--color-sev-2)" };
  return { text: "Nên xem kỹ hơn", color: "var(--color-sev-3)" };
}

type QueueScan = {
  id: string;
  cloudUrl: string | null;
  grade: number;
  score: number;
  backboneScores: Record<string, number>;
  qualityLabel: string | null;
  createdAt: string;
  patientName: string;
  patientEmail: string | null;
  screeningCount: number;
};

/** One case in /doctor/queue -- deliberately bigger and denser than
 * ScanCard (components/history/scan-card.tsx), not a copy of it: a doctor
 * triaging a worklist needs the confidence reading and the multi-disease
 * cross-reference right on the card, where a patient reading their own one
 * result doesn't. Same exam-plate shape (photo | content) and mark
 * language (ScopeFrame, SeverityGauge, GRADE_* copy) as the patient side,
 * so it reads as the same system, just with more instrumentation.
 *
 * Every card here is unprocessed by construction -- queue/page.tsx only
 * queries Scans with no DoctorReview row (schema.prisma) yet, dropping a
 * case off the queue entirely once "Ghi chú & xác nhận của bác sĩ" chốt --
 * so the status pill is static, not a prop. */
export function QueueCard({ scan, index }: { scan: QueueScan; index: number }) {
  const qualityFlag =
    scan.qualityLabel === "usable" || scan.qualityLabel === "reject" ? QUALITY_BADGE[scan.qualityLabel] : null;
  const color = GRADE_COLORS[scan.grade];
  const consensus = consensusLevel(scan.backboneScores);
  const consensusPct = consensusPercent(scan.backboneScores);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="group relative grid grid-cols-[auto_1fr] items-start gap-7 rounded-2xl border border-border/60 bg-card p-6 transition-colors hover:bg-secondary/40">
        {/* Full-card navigation, sitting BEHIND the content below (z-0, no
            higher sibling covers it) -- everything on top of it is wrapped
            pointer-events-none so a click anywhere falls through to this
            Link, except the one interactive element re-enabled below
            (the zoom trigger). A <button> nested inside this <a> would be
            invalid HTML and would also just navigate on click (bubbling) --
            keeping them as siblings instead of nesting is what lets the
            photo open a zoom dialog while the rest of the card still
            navigates to the case page. */}
        <Link
          href={`/doctor/case/${scan.id}`}
          aria-label={`Xem ca của ${scan.patientName}`}
          className="absolute inset-0 z-0 rounded-2xl"
        />

        <div className="relative z-10 pointer-events-none">
          <div className="pointer-events-auto inline-block">
            <ImageZoomDialog
              imageUrl={scan.cloudUrl}
              imageAlt=""
              size={128}
              ringColor={color}
              interiorClassName="bg-ink-raised"
              emptyFallback={
                <div className="flex h-full w-full items-center justify-center">
                  <ImageOff className="h-5 w-5 text-muted-foreground" />
                </div>
              }
            />
          </div>
          <span
            className="absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card font-mono text-xs font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {scan.grade}
          </span>
        </div>

        <div className="relative z-10 pointer-events-none min-w-0 text-left">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{scan.patientName}</p>
              <p className="truncate font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
                {scan.patientEmail ?? "Chưa có tài khoản"} · {new Date(scan.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-sev-3/15 px-2.5 py-1 font-condensed text-[9px] font-medium uppercase tracking-wider text-sev-3">
              Chưa xử lý
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <p className="text-lg font-semibold text-foreground">{GRADE_LABELS[scan.grade]}</p>
            <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              Điểm {scan.score.toFixed(2)}
            </span>
            {qualityFlag && (
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", qualityFlag.className)}>
                {qualityFlag.text}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">{GRADE_EXPLANATIONS[scan.grade]}</p>

          <div className="mt-5 max-w-xs">
            <SeverityGauge grade={scan.grade} />
          </div>

          {/* What ScanCard doesn't need but a doctor's worklist does: how
              much the 20-run ensemble agreed with itself, and whether
              there's a multi-disease cross-reference on this same photo. */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: consensus.color }} />
              {consensus.text}
              <span className="font-mono text-foreground">{consensusPct.toFixed(0)}%</span>
            </div>
            {scan.screeningCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gold-deep">
                <Microscope className="h-3.5 w-3.5" strokeWidth={1.75} />
                {scan.screeningCount} lượt sàng lọc đa bệnh
              </div>
            )}
          </div>
        </div>

        <ArrowRight
          className="pointer-events-none absolute top-6 right-6 z-10 h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
          strokeWidth={1.75}
        />
      </div>
    </motion.div>
  );
}
