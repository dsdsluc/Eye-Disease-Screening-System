import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight, ImageOff } from "lucide-react";

import { DISEASE_INFO, type MultiDiseaseSummary } from "@/lib/multidisease";
import { ScopeFrame } from "@/components/scope-frame";
import { DoctorReviewedBadge } from "@/components/doctor-reviewed-badge";
import { fullDate } from "@/components/history/format";

/** One row in /history's "Sàng lọc đa bệnh" section -- deliberately mirrors
 * ScanCard's structure (components/history/scan-card.tsx) exactly (same
 * photo size, grid, hover affordance, stamp position) so the two history
 * sections read as one consistent system, not two different UI languages.
 * The "Thử nghiệm" pill is what still signals this is the lower-confidence
 * feature (plans/plan_multidisease.txt section 2/6) -- the same job
 * ScanCard's quality-warning pill does for a bad photo, not a different
 * visual language. */
export function ScreeningHistoryCard({ screening, index }: { screening: MultiDiseaseSummary; index: number }) {
  const info = DISEASE_INFO[screening.topLabel];
  const pct = screening.topProb * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/multidisease/${screening.id}`}
        className="group relative grid grid-cols-[auto_1fr] items-start gap-7 rounded-2xl border border-border/60 bg-card p-6 transition-colors hover:bg-secondary/40"
      >
        <div className="relative">
          <ScopeFrame
            size={112}
            ringColor={info.color}
            className="transition-transform duration-300 group-hover:scale-[1.03]"
            interiorClassName="bg-ink-raised"
          >
            {screening.cloudUrl ? (
              <Image src={screening.cloudUrl} alt="" fill unoptimized className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageOff className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </ScopeFrame>

          {/* The stamp -- corner-printed top probability, same slot as
              ScanCard's grade digit. */}
          <span
            className="absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card font-mono text-[10px] font-bold text-white"
            style={{ backgroundColor: info.color }}
          >
            {Math.round(pct)}%
          </span>
        </div>

        <div className="min-w-0 text-left">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
              {fullDate(screening.createdAt)}
            </p>
            <span className="rounded-full bg-gold/15 px-2 py-0.5 font-condensed text-[9px] font-medium uppercase tracking-wider text-gold-deep">
              Thử nghiệm
            </span>
            {screening.doctorReview && <DoctorReviewedBadge />}
          </div>
          <p className="mt-2 text-lg font-semibold text-foreground">{info.label}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {pct.toFixed(1)}% xác suất -- tín hiệu mạnh nhất trong 8 nhóm được sàng lọc.
          </p>
          <div className="mt-5 max-w-xs">
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: info.color }} />
            </div>
          </div>
        </div>

        <ArrowRight
          className="pointer-events-none absolute top-6 right-6 h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
          strokeWidth={1.75}
        />
      </Link>
    </motion.div>
  );
}
