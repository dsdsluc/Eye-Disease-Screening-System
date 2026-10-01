import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";

import { GRADE_COLORS, type ScanSummary } from "@/lib/api";
import { ScopeFrame } from "@/components/scope-frame";
import { shortDate, yPercent } from "@/components/history/format";

const AXIS_LABELS = ["Không DR", "Nhẹ", "TB", "Nặng", "Tăng sinh"];

export type ChartPoint = { scan: ScanSummary; x: number; y: number };

/** The fever-chart reading of grade over time -- lives inside the "report"
 * insight dialog. Degrades to a plain message instead of empty space when
 * there's only 1 scan (`chartPoints` empty in that case). */
export function ProgressionChart({
  chartPoints,
  pathD,
  showAllChartLabels,
  latestScan,
}: {
  chartPoints: ChartPoint[];
  pathD: string;
  showAllChartLabels: boolean;
  latestScan: ScanSummary;
}) {
  if (chartPoints.length < 2) {
    return (
      <div className="mt-5 flex items-center gap-4 rounded-xl bg-secondary/60 px-5 py-4">
        <ScopeFrame size={52} ringColor={GRADE_COLORS[latestScan.grade!]} interiorClassName="bg-ink-raised">
          {latestScan.cloudUrl && <Image src={latestScan.cloudUrl} alt="" fill unoptimized className="object-cover" />}
        </ScopeFrame>
        <p className="text-sm text-muted-foreground">
          Cần ít nhất 2 lần quét để vẽ đường diễn tiến. Tải thêm ảnh để bắt đầu theo dõi xu hướng theo thời gian.
        </p>
      </div>
    );
  }

  return (
    <div className="relative mt-8 ml-16 h-[150px] sm:ml-20 sm:h-[170px]">
      {AXIS_LABELS.map((label, g) => (
        <div key={label} className="absolute right-0 left-0 border-t border-dashed border-border/50" style={{ top: `${yPercent(g)}%` }}>
          <span className="absolute top-1/2 right-full -translate-y-1/2 pr-3 text-right font-condensed text-[9px] whitespace-nowrap text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        </div>
      ))}

      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
        <motion.path
          d={pathD}
          fill="none"
          stroke="var(--color-foreground)"
          strokeOpacity={0.18}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>

      {chartPoints.map((p, i) => (
        <motion.div
          key={p.scan.imageId}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.35 + i * 0.05 }}
          className="absolute"
          style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -50%)" }}
        >
          <Link href={`/results/${p.scan.imageId}`} className="group block">
            <ScopeFrame
              size={44}
              ringColor={p.scan.grade !== null ? GRADE_COLORS[p.scan.grade] : "var(--color-border)"}
              className="transition-transform duration-300 group-hover:scale-125"
              interiorClassName="bg-ink-raised"
            >
              {p.scan.cloudUrl && <Image src={p.scan.cloudUrl} alt="" fill unoptimized className="object-cover" />}
            </ScopeFrame>
          </Link>
          {showAllChartLabels && (
            <p className="mt-1 text-center font-mono text-[9px] whitespace-nowrap text-muted-foreground">{shortDate(p.scan.createdAt)}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
