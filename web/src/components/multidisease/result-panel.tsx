"use client";

import { motion } from "motion/react";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ImageZoomDialog } from "@/components/image-zoom-dialog";
import { ProbabilityGrid } from "@/components/multidisease/probability-grid";
import { DoctorReviewNote } from "@/components/doctor-review-note";
import { DISEASE_INFO, DISEASE_LABELS, type MultiDiseaseResult } from "@/lib/multidisease";
import { GLAUCOMA_SUGGEST_THRESHOLD } from "@/lib/glaucoma";

/** The multi-disease equivalent of ScanResultPanel (components/scan-result-
 * panel.tsx) -- deliberately a SEPARATE component rather than reused/
 * extended, since the two features must stay visually and structurally
 * distinct (plans/plan_multidisease.txt section 2): a numeric 0-4 grade
 * next to a categorical top-label + 8-way distribution would read as more
 * comparable than the two models actually are.
 *
 * Layout: a compact header row (photo + headline stat), then the 8-way
 * grid (see ProbabilityGrid) gets the FULL card width below it -- not
 * squeezed into the DR flow's narrow 1.15fr sidebar column, which is what
 * made the first pass feel cramped. The grid is the actual point of this
 * feature (a full distribution across 8 classes), so it gets the room a
 * headline number + gauge didn't need. */
export function MultidiseaseResultPanel({
  imageUrl,
  imageAlt,
  result,
  onReset,
  resetLabel = "Thử ảnh khác",
  onAnalyzeGlaucoma,
}: {
  imageUrl: string | null | undefined;
  imageAlt: string;
  result: MultiDiseaseResult;
  onReset: () => void;
  resetLabel?: string;
  /** Wired up by the page: runs the glaucoma deep-dive on this same image
   * (plans/plan_glaucoma.txt). Also forwarded to ProbabilityGrid's dialog,
   * which offers the same action regardless of probability -- this banner
   * is only a nudge when the signal is already strong, never a gate. */
  onAnalyzeGlaucoma?: () => void;
}) {
  const topInfo = DISEASE_INFO[result.topLabel];
  const sortedItems = [...DISEASE_LABELS]
    .sort((a, b) => result.probs[b] - result.probs[a])
    .map((label) => ({ label, prob: result.probs[label] }));
  const glaucomaProb = result.probs.glaucoma;
  const suggestGlaucoma = glaucomaProb >= GLAUCOMA_SUGGEST_THRESHOLD;

  return (
    <div className="flex flex-col gap-9 px-6 py-10 sm:px-10 sm:py-12">
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="shrink-0"
        >
          <ImageZoomDialog imageUrl={imageUrl} imageAlt={imageAlt} size={140} ringColor={topInfo.color} interiorClassName="bg-ink-raised" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="min-w-0"
        >
          <span className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">Tín hiệu mạnh nhất</span>
          <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 sm:justify-start">
            <span className="text-3xl font-semibold" style={{ color: topInfo.color }}>
              {topInfo.label}
            </span>
            <span className="font-mono text-sm text-muted-foreground">{(result.topProb * 100).toFixed(1)}% xác suất</span>
          </div>
          {/* The single-label caveat from plans/plan_multidisease.txt section 6 --
              belongs in the UI copy itself, not just a code comment. */}
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Đây là nhãn có tín hiệu mạnh nhất theo cách mô hình được huấn luyện, <strong className="text-foreground">không</strong> có
            nghĩa các nhóm còn lại chắc chắn không xuất hiện -- một người có thể có dấu hiệu của nhiều bệnh cùng lúc.
          </p>
        </motion.div>
      </div>

      {/* Nudge, not a gate (plans/plan_glaucoma.txt): only shown when the
          multidisease model's own glaucoma probability already clears
          GLAUCOMA_SUGGEST_THRESHOLD -- the deep-dive itself stays reachable
          from any probability via the glaucoma tile's dialog below. */}
      {suggestGlaucoma && onAnalyzeGlaucoma && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.5 }}
          className="flex flex-col items-start gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: DISEASE_INFO.glaucoma.color, backgroundColor: "color-mix(in oklch, var(--color-teal-deep) 8%, transparent)" }}
        >
          <div className="flex items-start gap-3">
            <Eye className="mt-0.5 h-5 w-5 shrink-0" style={{ color: DISEASE_INFO.glaucoma.color }} strokeWidth={1.75} />
            <div>
              <p className="text-sm font-semibold text-foreground">Phát hiện tín hiệu nghi ngờ glaucoma</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Xác suất glaucoma trong sàng lọc này là {(glaucomaProb * 100).toFixed(1)}%. Có thể phân tích chuyên sâu
                hơn bằng một mô hình chuyên biệt.
              </p>
            </div>
          </div>
          <Button onClick={onAnalyzeGlaucoma} className="shrink-0 self-stretch sm:self-auto">
            Phân tích chuyên sâu
          </Button>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
        <p className="mb-4 font-condensed text-xs uppercase tracking-[0.2em] text-muted-foreground">Toàn bộ 8 nhóm</p>
        <ProbabilityGrid
          items={sortedItems}
          highlight={result.topLabel}
          imageUrl={imageUrl}
          imageAlt={imageAlt}
          onAnalyzeGlaucoma={onAnalyzeGlaucoma}
        />
      </motion.div>

      {result.doctorReview && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
          <DoctorReviewNote
            doctorName={result.doctorReview.doctorName}
            verdictLabel={result.doctorReview.confirmedLabels.map((l) => DISEASE_INFO[l].label).join(", ")}
            verdictColor={DISEASE_INFO[result.doctorReview.confirmedLabels[0]].color}
            note={result.doctorReview.note}
            metaLine={`Hướng xử lý: ${result.doctorReview.recommendation}`}
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
