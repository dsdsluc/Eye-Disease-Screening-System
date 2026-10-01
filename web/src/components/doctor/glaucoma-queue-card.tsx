"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Eye, ImageOff } from "lucide-react";

import { ImageZoomDialog } from "@/components/image-zoom-dialog";
import { DISEASE_INFO } from "@/lib/multidisease";

type QueueGlaucomaScreening = {
  id: string;
  cloudUrl: string | null;
  label: string;
  probGlaucoma: number;
  createdAt: string;
  patientName: string;
  patientEmail: string | null;
};

/** Queue-list equivalent of ScreeningQueueCard, but for the glaucoma
 * specialist model -- solid (not dashed) border and teal-deep accent since
 * this model, unlike multidisease's ~62% baseline, carries its own real
 * e2e-validated accuracy (config/glaucoma/config.json) and doesn't need
 * that lower-confidence framing. Always shows "Chưa xử lý" -- queue/page.tsx
 * only queries screenings with no GlaucomaReview row (schema.prisma) yet. */
export function GlaucomaQueueCard({ screening, index }: { screening: QueueGlaucomaScreening; index: number }) {
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
      <div className="group relative grid grid-cols-[auto_1fr] items-start gap-7 rounded-2xl border border-border/60 bg-card p-6 transition-colors hover:bg-secondary/40">
        <Link
          href={`/doctor/glaucoma/${screening.id}`}
          aria-label={`Xem lượt sàng lọc của ${screening.patientName}`}
          className="absolute inset-0 z-0 rounded-2xl"
        />

        <div className="relative z-10 pointer-events-none">
          <div className="pointer-events-auto inline-block">
            <ImageZoomDialog
              imageUrl={screening.cloudUrl}
              imageAlt=""
              size={128}
              ringColor={color}
              interiorClassName="bg-ink-raised"
              emptyFallback={
                <div className="flex h-full w-full items-center justify-center">
                  <ImageOff className="h-5 w-5 text-muted-foreground" />
                </div>
              }
            />
          </div>
        </div>

        <div className="relative z-10 pointer-events-none min-w-0 text-left">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{screening.patientName}</p>
              <p className="truncate font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
                {screening.patientEmail ?? "Chưa có tài khoản"} · {new Date(screening.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-sev-3/15 px-2.5 py-1 font-condensed text-[9px] font-medium uppercase tracking-wider text-sev-3">
              Chưa xử lý
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <Eye className="h-3.5 w-3.5 text-teal-deep" strokeWidth={1.75} />
            <p className="text-lg font-semibold" style={{ color }}>
              {isGlaucoma ? "Nghi ngờ tăng nhãn áp" : "Không phát hiện rõ rệt"}
            </p>
            <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              {pct.toFixed(1)}%
            </span>
          </div>
          <p className="mt-1.5 font-condensed text-[10px] uppercase tracking-wider text-teal-deep">
            Sàng lọc tăng nhãn áp
          </p>
        </div>

        <ArrowRight
          className="pointer-events-none absolute top-6 right-6 z-10 h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
          strokeWidth={1.75}
        />
      </div>
    </motion.div>
  );
}
