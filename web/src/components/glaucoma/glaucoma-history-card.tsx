import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight, ImageOff } from "lucide-react";

import { DISEASE_INFO } from "@/lib/multidisease";
import type { GlaucomaSummary } from "@/lib/glaucoma";
import { ScopeFrame } from "@/components/scope-frame";
import { DoctorReviewedBadge } from "@/components/doctor-reviewed-badge";
import { fullDate } from "@/components/history/format";

/** One row in /history's "Sàng lọc tăng nhãn áp" section -- mirrors
 * ScreeningHistoryCard's structure (components/multidisease/screening-
 * history-card.tsx) exactly (same photo size, grid, hover affordance,
 * stamp position), which itself mirrors ScanCard -- all three history
 * sections read as one consistent system. "Chuyên biệt" (maroon-deep,
 * this feature's color everywhere else it appears -- OtherModelsNav,
 * /glaucoma's own page) is what signals this is the specialist deep-dive
 * model, not the multidisease screen's own glaucoma class. */
export function GlaucomaHistoryCard({ screening, index }: { screening: GlaucomaSummary; index: number }) {
  const isGlaucoma = screening.label === "glaucoma";
  const color = isGlaucoma ? DISEASE_INFO.glaucoma.color : "var(--color-sev-0)";
  const pct = screening.probGlaucoma * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/glaucoma/${screening.id}`}
        className="group relative grid grid-cols-[auto_1fr] items-start gap-7 rounded-2xl border border-border/60 bg-card p-6 transition-colors hover:bg-secondary/40"
      >
        <div className="relative">
          <ScopeFrame
            size={112}
            ringColor={color}
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

          <span
            className="absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card font-mono text-[10px] font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {Math.round(pct)}%
          </span>
        </div>

        <div className="min-w-0 text-left">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
              {fullDate(screening.createdAt)}
            </p>
            <span className="rounded-full bg-maroon/15 px-2 py-0.5 font-condensed text-[9px] font-medium uppercase tracking-wider text-maroon-deep">
              Chuyên biệt
            </span>
            {screening.doctorReview && <DoctorReviewedBadge />}
          </div>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {isGlaucoma ? "Nghi ngờ tăng nhãn áp" : "Không phát hiện dấu hiệu rõ rệt"}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">{pct.toFixed(1)}% xác suất glaucoma.</p>
          <div className="mt-5 max-w-xs">
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: color }} />
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
