import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { GRADE_COLORS, GRADE_LABELS, type ScanSummary } from "@/lib/api";
import { AnimatedNumber } from "@/components/animated-number";

export type HistoryStats = {
  total: number;
  latest: ScanSummary;
  delta: number | null;
  lowQualityCount: number;
  firstDate: string;
};

/** Quiet inline reading in the page header, between the eyebrow and "Sổ
 * khám mắt" -- second pass. First pass (a bordered/glossy pill) still read
 * as an injected widget dropped into the middle of a plain text header,
 * not part of it. Dropped the card chrome entirely: no border, no
 * background, no shadow -- just three muted text groups with a hairline
 * divider between them, the same weight as the eyebrow line itself, so
 * this reads as more header typography, not a UI component. Desktop-only
 * (`lg:flex`) -- unchanged, since the sidebar it originally lived in was
 * already hidden below `lg` too. */
export function HistoryOverview({ stats }: { stats: HistoryStats }) {
  return (
    <div className="hidden items-center divide-x divide-border/60 lg:flex">
      <div className="flex items-baseline gap-1.5 px-4 first:pl-0">
        <span className="font-mono text-sm text-foreground">
          <AnimatedNumber value={stats.total} />
        </span>
        <span className="font-condensed text-[10px] whitespace-nowrap text-muted-foreground uppercase tracking-wider">
          lần quét
        </span>
      </div>

      <div className="flex items-baseline gap-1.5 px-4">
        <span className="font-mono text-sm" style={{ color: GRADE_COLORS[stats.latest.grade!] }}>
          {stats.latest.grade}
        </span>
        <span className="font-condensed text-[10px] whitespace-nowrap text-muted-foreground uppercase tracking-wider">
          {stats.delta === null ? (
            GRADE_LABELS[stats.latest.grade!]
          ) : stats.delta > 0 ? (
            <span className="inline-flex items-center gap-1 text-sev-4">
              <TrendingUp className="h-3 w-3" /> tăng {stats.delta}
            </span>
          ) : stats.delta < 0 ? (
            <span className="inline-flex items-center gap-1 text-sev-0">
              <TrendingDown className="h-3 w-3" /> giảm {Math.abs(stats.delta)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Minus className="h-3 w-3" /> không đổi
            </span>
          )}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5 px-4 last:pr-0">
        {stats.lowQualityCount === 0 ? (
          <>
            <span className="font-mono text-sm text-sev-0">100%</span>
            <span className="font-condensed text-[10px] whitespace-nowrap text-muted-foreground uppercase tracking-wider">
              ảnh đạt chuẩn
            </span>
          </>
        ) : (
          <>
            <span className="font-mono text-sm text-sev-3">{stats.lowQualityCount}</span>
            <span className="font-condensed text-[10px] whitespace-nowrap text-muted-foreground uppercase tracking-wider">
              /{stats.total} nên chụp lại
            </span>
          </>
        )}
      </div>
    </div>
  );
}
