"use client";

import { useState } from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { DISEASE_INFO, type DiseaseLabel } from "@/lib/multidisease";
import { DiseaseInfoDialog } from "@/components/multidisease/disease-info-dialog";

/** A grid of small-multiple columns, one per disease class -- not a single
 * shared-axis bar chart, because these 8 Vietnamese labels are long enough
 * ("Võng mạc do tăng huyết áp") that they'd either collide as rotated
 * x-axis ticks under vertical bars, or force the chart into a narrow
 * horizontal-bar list that reads as a plain list, not a chart. Each tile
 * owns its label, so nothing needs to be rotated or truncated.
 *
 * Still emphasis form, not 8 categorical hues: only the top tile's COLUMN
 * carries its identity color (tied to the headline stat above it) plus a
 * thin top-border accent in that same color; every text label stays on
 * neutral text tokens (weight is what signals "this is the one," not
 * color) -- text never wears the data color, only the mark does.
 *
 * Each tile is a button: clicking it opens DiseaseInfoDialog with general
 * education copy for that class. Dialog state is owned here (not lifted to
 * the caller) so the grid stays a drop-in, self-contained unit. */
export function ProbabilityGrid({
  items,
  highlight,
  imageUrl,
  imageAlt,
  onAnalyzeGlaucoma,
}: {
  items: { label: DiseaseLabel; prob: number }[];
  highlight?: DiseaseLabel;
  imageUrl?: string | null;
  imageAlt: string;
  /** Forwarded to DiseaseInfoDialog -- see that component for why this is
   * always offered regardless of the tapped tile's probability. */
  onAnalyzeGlaucoma?: () => void;
}) {
  const [selected, setSelected] = useState<DiseaseLabel | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map(({ label, prob }, i) => {
          const info = DISEASE_INFO[label];
          const isTop = label === highlight;
          const pct = prob * 100;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setSelected(label)}
              className={cn(
                "group flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-left transition-colors",
                isTop ? "border-border bg-secondary/50" : "border-border/60 bg-card hover:bg-secondary/40"
              )}
              style={isTop ? { borderTopColor: info.color, borderTopWidth: 3 } : undefined}
            >
              <span className={cn("font-mono text-sm", isTop ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {pct.toFixed(1)}%
              </span>

              {/* The column -- square at the baseline (bottom), rounded only
                  at the cap (top), grows from a fixed-height track so every
                  tile shares the same scale even without a drawn axis. */}
              <div className="flex h-20 w-full items-end justify-center">
                <motion.div
                  className={cn(
                    "w-7 rounded-t-md transition-[filter] duration-150 group-hover:brightness-110 sm:w-8",
                    !isTop && "bg-muted-foreground"
                  )}
                  style={isTop ? { backgroundColor: info.color } : undefined}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(pct, 3)}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>

              <span
                className={cn(
                  "text-center text-xs leading-snug underline-offset-2 group-hover:underline",
                  isTop ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {info.label}
              </span>
            </button>
          );
        })}
      </div>

      <DiseaseInfoDialog
        label={selected}
        imageUrl={imageUrl}
        imageAlt={imageAlt}
        onOpenChange={(open) => !open && setSelected(null)}
        onAnalyzeGlaucoma={onAnalyzeGlaucoma}
      />
    </>
  );
}
