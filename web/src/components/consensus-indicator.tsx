"use client";

import { motion } from "motion/react";

import { consensusPercent } from "@/lib/api";

/**
 * Translates the raw per-backbone score spread into something a non-technical
 * viewer can actually act on -- "which architecture scored what" means
 * nothing to a patient or most doctors, but "how much did the system agree
 * with itself" does. The number of models/architectures is still named so
 * the system doesn't read as a black box, just not broken down by name.
 */
export function ConsensusIndicator({ backboneScores }: { backboneScores: Record<string, number> }) {
  const values = Object.values(backboneScores);
  const spread = Math.max(...values) - Math.min(...values);

  const level = spread <= 0.3 ? "high" : spread <= 0.5 ? "medium" : "low";
  const info = {
    high: {
      text: "Đồng thuận cao",
      color: "var(--color-sev-0)",
      desc: "20 lượt phân tích độc lập cho kết quả rất thống nhất với nhau.",
    },
    medium: {
      text: "Đồng thuận khá tốt",
      color: "var(--color-sev-2)",
      desc: "Phần lớn các lượt phân tích đồng thuận, chênh lệch nhỏ.",
    },
    low: {
      text: "Nên xem xét kỹ hơn",
      color: "var(--color-sev-3)",
      desc: "Các lượt phân tích có chênh lệch đáng kể — bác sĩ nên kiểm tra lại ảnh.",
    },
  }[level];

  const fillPct = consensusPercent(backboneScores);

  return (
    <div className="glossy shadow-bubble w-full rounded-2xl border border-border bg-card px-7 py-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: info.color }} />
            <p className="font-condensed text-xs uppercase tracking-wider text-muted-foreground">
              Độ đồng thuận hệ thống
            </p>
          </div>
          <p className="mt-2 text-xl font-semibold text-foreground">{info.text}</p>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{info.desc}</p>
        </div>
        <p className="shrink-0 font-mono text-xs text-muted-foreground/70 sm:text-right">
          20 lượt phân tích
          <br />4 kiến trúc mô hình
        </p>
      </div>
      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: info.color }}
          initial={{ width: 0 }}
          animate={{ width: `${fillPct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
