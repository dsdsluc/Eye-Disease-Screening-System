"use client";

import { motion } from "motion/react";

import { ImageZoomDialog } from "@/components/image-zoom-dialog";
import { DoctorReviewNote } from "@/components/doctor-review-note";
import { DISEASE_INFO } from "@/lib/multidisease";
import type { GlaucomaResult } from "@/lib/glaucoma";

/** The settled result view for /glaucoma -- same "photo + headline stat"
 * shape as ScanResultPanel/MultidiseaseResultPanel (a rotating ScopeFrame is
 * for the loading/dialog moment only; a settled result uses the same static,
 * click-to-zoom ImageZoomDialog those two panels use). Deliberately its own
 * component, not GlaucomaResultDialog reused: that one is a modal meant to
 * layer ON TOP of an existing /multidisease result (its own eyebrow says
 * "Phân tích chuyên sâu," implying a deep-dive after something else), while
 * this is the settled result of a screen that started here -- same
 * information, but inline like its sibling panels instead of a popup. */
export function GlaucomaResultPanel({
  imageUrl,
  imageAlt,
  result,
  onReset,
  resetLabel = "Thử ảnh khác",
}: {
  imageUrl: string | null | undefined;
  imageAlt: string;
  result: GlaucomaResult;
  onReset: () => void;
  /** Doctor-facing views (doctor-glaucoma-view.tsx) reuse this same panel
   * but need "← Về hàng đợi" instead, same convention as
   * MultidiseaseResultPanel's own resetLabel prop. */
  resetLabel?: string;
}) {
  const isGlaucoma = result.label === "glaucoma";
  const color = isGlaucoma ? DISEASE_INFO.glaucoma.color : "var(--color-sev-0)";

  return (
    <div className="flex flex-col items-center gap-8 px-6 py-12 text-center sm:px-10 sm:py-14">
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
        <ImageZoomDialog imageUrl={imageUrl} imageAlt={imageAlt} size={190} ringColor={color} interiorClassName="bg-ink-raised" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
        <span className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">Fundas · Sàng lọc tăng nhãn áp</span>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl" style={{ color }}>
          {isGlaucoma ? "Nghi ngờ tăng nhãn áp" : "Không phát hiện dấu hiệu rõ rệt"}
        </h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {(result.probGlaucoma * 100).toFixed(1)}% xác suất glaucoma
        </p>
      </motion.div>

      {/* Same copy as GlaucomaResultDialog -- kept in sync so the two
          places this model's result appears never say two different
          things about it. Rewritten from an earlier, more defensive draft
          (led with the internal auto-crop step and a bare accuracy number
          compared unfavorably to DR) -- still honest that this is a
          screening aid, not a diagnosis, but reads like a considered
          product decision rather than a disclaimer bolted on afterward. */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="max-w-lg text-sm leading-relaxed text-muted-foreground"
      >
        Kết quả dựa trên mô hình AI chuyên biệt cho tăng nhãn áp, phân tích trực tiếp trên ảnh bạn vừa tải lên. Đây là{" "}
        <strong className="text-foreground">bước sàng lọc ban đầu</strong>, mang tính tham khảo —{" "}
        <strong className="text-foreground">không thay thế</strong> việc đo nhãn áp hoặc khám chuyên khoa mắt để có
        chẩn đoán chính xác.
      </motion.p>

      {result.doctorReview && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
          <DoctorReviewNote
            doctorName={result.doctorReview.doctorName}
            verdictLabel={result.doctorReview.confirmedLabel === "glaucoma" ? "Tăng nhãn áp" : "Bình thường"}
            verdictColor={result.doctorReview.confirmedLabel === "glaucoma" ? DISEASE_INFO.glaucoma.color : "var(--color-sev-0)"}
            note={result.doctorReview.note}
            metaLine={`Tái khám: ${result.doctorReview.followUp}`}
            updatedAt={result.doctorReview.updatedAt}
          />
        </motion.div>
      )}

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
          {resetLabel}
        </button>
        <kbd className="hidden rounded-md border border-border bg-secondary px-1.5 py-1 font-mono text-[10px] text-muted-foreground sm:inline-block">
          Esc
        </kbd>
      </motion.div>
    </div>
  );
}
