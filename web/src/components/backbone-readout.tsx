"use client";

import { motion } from "motion/react";

const BACKBONE_LABELS: Record<string, string> = {
  inception_v4: "Inception v4",
  inception_resnet_v2: "Inception-ResNet v2",
  seresnext50_32x4d: "SE-ResNeXt50",
  seresnext101_32x4d: "SE-ResNeXt101",
};

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export function BackboneReadout({ scores }: { scores: Record<string, number> }) {
  const entries = Object.entries(scores);

  return (
    <div className="flex flex-col gap-4">
      <p className="font-condensed text-xs uppercase tracking-wider text-muted-foreground">
        Điểm từng kiến trúc trong ensemble
      </p>
      {entries.map(([backbone, score], i) => (
        <div key={backbone} className="flex items-center gap-3">
          <span className="w-32 shrink-0 font-condensed text-xs text-foreground/80 sm:w-36">
            {BACKBONE_LABELS[backbone] ?? backbone}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full bg-teal-deep"
              initial={{ width: 0 }}
              animate={{ width: `${clamp01(score / 4) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className="w-14 shrink-0 text-right font-mono text-xs text-foreground/70">
            {score.toFixed(3)}
          </span>
        </div>
      ))}
    </div>
  );
}
