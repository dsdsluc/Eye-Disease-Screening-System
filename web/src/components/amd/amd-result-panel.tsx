"use client";

import { motion } from "motion/react";

import { ImageZoomDialog } from "@/components/image-zoom-dialog";
import { getAmdAdvice, type AmdResult } from "@/lib/amd";

/** The settled result view for /amd -- same "photo + headline stat" shape as
 * GlaucomaResultPanel, but the caveat underneath is a threshold-banded advice
 * card (getAmdAdvice, lib/amd.ts) instead of a plain disclaimer paragraph or
 * a warning Alert: a single blanket "model chưa đáng tin" line read scarier
 * than every other screening page here for a result that often has nothing
 * wrong at all, and said the same thing regardless of the actual score. Same
 * "point to a next step, not a diagnosis" spirit either way. val_f1 was 99%
 * on a small, likely-overfit dataset with no independent end-to-end check
 * (config/amd/config.json's notes) -- this screen still deliberately never
 * surfaces that percentage. */
export function AmdResultPanel({
  imageUrl,
  imageAlt,
  result,
  onReset,
}: {
  imageUrl: string | null | undefined;
  imageAlt: string;
  result: AmdResult;
  onReset: () => void;
}) {
  const advice = getAmdAdvice(result.probAmd);

  return (
    <div className="flex flex-col items-center gap-8 px-6 py-12 text-center sm:px-10 sm:py-14">
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
        <ImageZoomDialog imageUrl={imageUrl} imageAlt={imageAlt} size={190} ringColor={advice.color} interiorClassName="bg-ink-raised" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
        <span className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">
          Fundas · Sàng lọc thoái hóa điểm vàng
        </span>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl" style={{ color: advice.color }}>
          {advice.title}
        </h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">{(result.probAmd * 100).toFixed(1)}% xác suất AMD</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="w-full max-w-lg rounded-2xl border border-border/60 bg-card/60 px-6 py-5 text-left backdrop-blur-md"
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: advice.color }} />
          <span className="font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">Lời khuyên</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{advice.body}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex items-center gap-2.5"
      >
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          Thử ảnh khác
        </button>
        <kbd className="hidden rounded-md border border-border bg-secondary px-1.5 py-1 font-mono text-[10px] text-muted-foreground sm:inline-block">
          Esc
        </kbd>
      </motion.div>
    </div>
  );
}
