"use client";

import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";

import { ImageZoomDialog } from "@/components/image-zoom-dialog";
import { DoctorReviewNote } from "@/components/doctor-review-note";
import { CATARACT_ADVICE_TIERS, getCataractAdvice, type CataractResult } from "@/lib/cataract";

// Short forms of CATARACT_ADVICE_TIERS' own titles -- long enough to stand
// alone in the "Lời khuyên" card, too long to fit as a gauge segment label
// (same reason DR's SeverityGauge, components/severity-gauge.tsx, uses
// "Nhẹ"/"Trung bình" rather than repeating GRADE_LABELS verbatim).
const GAUGE_LABELS = ["Rất tốt", "Theo dõi", "Chú ý", "Nghi ngờ", "Rõ rệt"] as const;

/** Same 5-segment clinical-grading-strip idea as DR's SeverityGauge, applied
 * to CATARACT_ADVICE_TIERS instead of a discrete ICDR grade -- the active
 * segment is whichever tier the current probability falls into, not the
 * probability's own position within it (same "one of five bands, not a
 * literal percentage on a ruler" simplification SeverityGauge already
 * makes for DR's own continuous score -> discrete grade). Local to this
 * file rather than factored out next to SeverityGauge: the two aren't
 * actually interchangeable (different tier counts/meanings would only
 * coincidentally match at 5), so a shared generic version would need its
 * own design pass to be worth the abstraction. */
function CataractGauge({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="w-full">
      <div className="flex gap-1.5">
        {CATARACT_ADVICE_TIERS.map((tier, i) => (
          <div
            key={tier.title}
            className="h-2.5 flex-1 rounded-full transition-all duration-700 ease-out"
            style={{
              backgroundColor: tier.color,
              opacity: i === activeIndex ? 1 : 0.22,
              transform: i === activeIndex ? "scaleY(1.7)" : "scaleY(1)",
            }}
          />
        ))}
      </div>
      <div className="mt-3 flex gap-1.5 font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
        {GAUGE_LABELS.map((label, i) => (
          <div key={label} className={i === activeIndex ? "flex-1 text-center font-semibold text-foreground" : "flex-1 text-center"}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The settled result view for /cataract -- same two-column "photo left,
 * headline stat + gauge right" shape ScanResultPanel (components/scan-
 * result-panel.tsx) uses for DR, rather than this panel's own earlier
 * single-column centered stack: a big colored number paired with its label
 * (here: probability % + advice.title, there: grade digit + GRADE_LABELS)
 * plus a 5-segment gauge underneath reads as a proper "here's your result"
 * screen the way DR's does, not a lighter-weight afterthought next to it.
 * Still keeps this feature's own real difference from DR: a threshold-
 * banded advice card (getCataractAdvice, lib/cataract.ts) instead of a
 * plain disclaimer or a warning Alert -- see that file's header comment for
 * why (same reasoning AMD's own result panel documents). val_f1 was 1.0 in
 * training, but config/cataract/config.json's own "known_caveats" flags
 * that as an almost-certainly-inflated number, so this screen still never
 * surfaces that percentage. */
export function CataractResultPanel({
  imageUrl,
  imageAlt,
  result,
  onReset,
  resetLabel = "Thử ảnh khác",
}: {
  imageUrl: string | null | undefined;
  imageAlt: string;
  result: CataractResult;
  onReset: () => void;
  /** Doctor-facing views (doctor-cataract-view.tsx) reuse this same panel
   * but need "← Về hàng đợi" instead, same convention as
   * MultidiseaseResultPanel's own resetLabel prop. */
  resetLabel?: string;
}) {
  const advice = getCataractAdvice(result.probCataract);
  const tierIndex = CATARACT_ADVICE_TIERS.indexOf(advice);
  const pct = result.probCataract * 100;

  return (
    <div className="grid gap-10 px-6 py-12 sm:px-10 sm:py-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-14">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex min-w-0 justify-center"
      >
        <ImageZoomDialog imageUrl={imageUrl} imageAlt={imageAlt} size={340} ringColor={advice.color} interiorClassName="bg-ink-raised" />
      </motion.div>

      <div className="min-w-0">
        {!result.eyeCropApplied && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
            <div className="flex items-start gap-2.5 rounded-2xl border border-border/60 bg-card/60 px-5 py-4 backdrop-blur-md">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sev-2" strokeWidth={1.75} />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Ảnh chưa thấy rõ khuôn mặt nên độ chính xác có thể bị ảnh hưởng. Bạn nên thử lại với ảnh cận mặt, đủ
                sáng, thấy rõ cả hai mắt.
              </p>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <span className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">
            Fundas · Sàng lọc đục thủy tinh thể
          </span>
          <div className="mt-1 flex items-baseline gap-4">
            <span className="font-mono text-7xl font-semibold" style={{ color: advice.color }}>
              {Math.round(pct)}%
            </span>
            <span className="text-2xl font-semibold text-foreground">{advice.title}</span>
          </div>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{advice.body}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="mt-8">
          <CataractGauge activeIndex={tierIndex} />
        </motion.div>

        {result.doctorReview && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }} className="mt-8">
            <DoctorReviewNote
              doctorName={result.doctorReview.doctorName}
              verdictLabel={result.doctorReview.confirmedLabel === "cataract" ? "Đục thủy tinh thể" : "Bình thường"}
              verdictColor={result.doctorReview.confirmedLabel === "cataract" ? "var(--color-sev-1)" : "var(--color-sev-0)"}
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
          className="mt-8 flex items-center justify-end gap-2.5"
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
    </div>
  );
}
