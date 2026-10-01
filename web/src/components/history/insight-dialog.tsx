import { Clock, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { INSIGHT_COPY, INSIGHT_ITEMS, type InsightPanel } from "@/components/history/insight-items";
import { ProgressionChart, type ChartPoint } from "@/components/history/progression-chart";
import type { ScanSummary } from "@/lib/api";

/** The AI-analysis / doctor-review / full-report dialog opened from
 * InsightRail. The first two are still placeholders (plans/plan_web.txt);
 * "report" is real -- it's the one place the progression chart lives now,
 * moved in from the page body since most visits don't need it. */
export function InsightDialog({
  open,
  onOpenChange,
  chart,
}: {
  open: InsightPanel;
  onOpenChange: (open: boolean) => void;
  chart: { chartPoints: ChartPoint[]; pathD: string; showAllChartLabels: boolean; latestScan: ScanSummary } | null;
}) {
  return (
    <Dialog open={open !== null} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "glossy shadow-bubble overflow-hidden rounded-3xl border border-border/60 bg-linear-to-b from-secondary/70 via-card to-card p-0",
          open && INSIGHT_ITEMS.find((i) => i.key === open)?.size === "lg"
            ? "flex h-[85vh] w-[92vw] max-w-5xl flex-col sm:max-w-5xl"
            : "sm:max-w-md"
        )}
      >
        {/* A warm gold vignette instead of a flat white pane -- reads as the
            same aged optical-instrument material as the rest of the app
            rather than a generic system dialog. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-[0.15] blur-3xl"
          style={{ background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)" }}
        />

        {open &&
          (() => {
            const Icon = INSIGHT_ITEMS.find((i) => i.key === open)?.icon ?? Sparkles;

            if (open === "report" && chart) {
              return (
                <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-7 py-8 sm:px-10 sm:py-10">
                  <div className="flex items-start gap-4">
                    <span className="glossy shadow-bubble flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal-deep">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div>
                      <DialogTitle className="text-lg">{INSIGHT_COPY.report.title}</DialogTitle>
                      <DialogDescription className="mt-1.5">{INSIGHT_COPY.report.description}</DialogDescription>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-secondary/50 px-6 py-7 sm:px-9 sm:py-9">
                    <p className="font-condensed text-xs uppercase tracking-[0.2em] text-muted-foreground">Diễn tiến theo thời gian</p>
                    <ProgressionChart
                      chartPoints={chart.chartPoints}
                      pathD={chart.pathD}
                      showAllChartLabels={chart.showAllChartLabels}
                      latestScan={chart.latestScan}
                    />
                  </div>

                  <span className="glossy shadow-bubble flex w-fit items-center gap-1.5 rounded-full border border-border/60 bg-card px-3.5 py-1.5 font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-3 w-3" /> Phần còn lại của báo cáo sắp ra mắt
                  </span>
                </div>
              );
            }

            return (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-7 py-10 text-center sm:px-10 sm:py-12">
                <span className="glossy shadow-bubble flex h-14 w-14 items-center justify-center rounded-full bg-teal/10 text-teal-deep">
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <div>
                  <DialogTitle className="text-lg">{INSIGHT_COPY[open].title}</DialogTitle>
                  <DialogDescription className="mx-auto mt-2 max-w-sm">{INSIGHT_COPY[open].description}</DialogDescription>
                </div>
                <span className="glossy shadow-bubble flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3.5 py-1.5 font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3 w-3" /> Sắp ra mắt
                </span>
              </div>
            );
          })()}
      </DialogContent>
    </Dialog>
  );
}
