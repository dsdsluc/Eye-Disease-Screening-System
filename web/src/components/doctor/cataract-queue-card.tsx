"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, ImageOff, ScanFace } from "lucide-react";

import { ImageZoomDialog } from "@/components/image-zoom-dialog";
import { getCataractAdvice } from "@/lib/cataract";

type QueueCataractScreening = {
  id: string;
  cloudUrl: string | null;
  probCataract: number;
  eyeCropApplied: boolean;
  createdAt: string;
  patientName: string;
  patientEmail: string | null;
};

/** Queue-list equivalent of GlaucomaQueueCard, but for the cataract
 * specialist model -- sev-1 accent, same color this feature uses everywhere
 * else in the app. Colored by getCataractAdvice's 5-tier scale
 * (lib/cataract.ts), same as CataractResultPanel and CataractHistoryCard,
 * so a doctor triaging the queue sees the same "how concerning" read the
 * patient side already uses, not a different color language invented for
 * this one card. Always shows "Chưa xử lý" -- queue/page.tsx only queries
 * screenings with no CataractReview row (schema.prisma) yet. */
export function CataractQueueCard({ screening, index }: { screening: QueueCataractScreening; index: number }) {
  const advice = getCataractAdvice(screening.probCataract);
  const pct = screening.probCataract * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="group relative grid grid-cols-[auto_1fr] items-start gap-7 rounded-2xl border border-border/60 bg-card p-6 transition-colors hover:bg-secondary/40">
        <Link
          href={`/doctor/cataract/${screening.id}`}
          aria-label={`Xem lượt sàng lọc của ${screening.patientName}`}
          className="absolute inset-0 z-0 rounded-2xl"
        />

        <div className="relative z-10 pointer-events-none">
          <div className="pointer-events-auto inline-block">
            <ImageZoomDialog
              imageUrl={screening.cloudUrl}
              imageAlt=""
              size={128}
              ringColor={advice.color}
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
            <ScanFace className="h-3.5 w-3.5 text-sev-1" strokeWidth={1.75} />
            <p className="text-lg font-semibold" style={{ color: advice.color }}>
              {advice.title}
            </p>
            <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              {pct.toFixed(1)}%
            </span>
            {!screening.eyeCropApplied && (
              <span className="rounded-full bg-secondary px-2 py-0.5 font-condensed text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Chưa nhận diện khuôn mặt
              </span>
            )}
          </div>
          <p className="mt-1.5 font-condensed text-[10px] uppercase tracking-wider text-sev-1">
            Sàng lọc đục thủy tinh thể
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
