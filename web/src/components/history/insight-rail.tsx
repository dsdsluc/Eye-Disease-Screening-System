"use client";

import { motion } from "motion/react";

import { INSIGHT_ITEMS, type InsightPanel } from "@/components/history/insight-items";

/** Fixed vertical pill on the viewport's right edge -- mirrors side-nav.tsx's
 * quick-jump rail on the left. Was a solid bg-card block sitting mid-page
 * next to the chart (an opaque tile that read as an unrelated widget); now
 * translucent + backdrop-blur like the app's other floating chrome, so the
 * page behind shows through softened instead of being blocked. */
export function InsightRail({ onSelect }: { onSelect: (key: Exclude<InsightPanel, null>) => void }) {
  return (
    <div className="fixed top-1/2 right-6 z-20 hidden -translate-y-1/2 xl:block">
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="glossy shadow-bubble flex flex-col gap-1 rounded-full border border-border/60 bg-card/80 p-2 backdrop-blur-xl"
      >
        {INSIGHT_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            className="group relative flex h-10 w-10 items-center justify-center rounded-full text-teal-deep transition-colors hover:bg-secondary/60"
          >
            <item.icon className="h-4 w-4" strokeWidth={1.75} />
            <span className="pointer-events-none absolute top-1/2 right-full mr-3 -translate-y-1/2 rounded-md bg-card px-2.5 py-1 font-condensed text-[10px] whitespace-nowrap uppercase tracking-wider text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
              {item.label}
            </span>
          </button>
        ))}
      </motion.div>
    </div>
  );
}
