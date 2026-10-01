"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { GRADE_COLORS, GRADE_LABELS, type DrDoctorReview } from "@/lib/api";
import { ImageZoomDialog } from "@/components/image-zoom-dialog";
import { SeverityGauge } from "@/components/severity-gauge";
import { ConsensusIndicator } from "@/components/consensus-indicator";
import { BackboneReadout } from "@/components/backbone-readout";
import { DoctorReviewNote } from "@/components/doctor-review-note";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** The "here's the reading" block -- image + grade + gauge + consensus +
 * a collapsible technical readout -- shared by /upload's inline result view
 * and /results/[imageId], which previously carried two copies of this same
 * ~80-line block that had already started drifting apart (the explanation
 * sentence landed on results but not upload). One definition now; each page
 * supplies what's specific to it (a quality warning on upload, an
 * "actionsLeft" button group on upload, a plain-language explanation on
 * results) via optional props instead of forking the whole block. */
export function ScanResultPanel({
  imageUrl,
  imageAlt,
  imagePriority,
  gradeColor,
  grade,
  explanation,
  backboneScores,
  qualityWarning,
  doctorReview,
  showTechnical,
  onToggleTechnical,
  actionsLeft,
}: {
  imageUrl: string | null | undefined;
  imageAlt: string;
  imagePriority?: boolean;
  gradeColor: string;
  grade: number;
  /** Plain-language reading of the grade -- results page only for now. */
  explanation?: string;
  backboneScores: Record<string, number>;
  /** Upload only: the quality-check warning banner. */
  qualityWarning?: { title: string; body: string; variant: "default" | "destructive" } | null;
  /** Results page only (a fresh /upload result has never been reviewed
   * yet) -- closes the patient <-> doctor loop, see DoctorReviewNote's own
   * header comment. */
  doctorReview?: DrDoctorReview | null;
  showTechnical: boolean;
  onToggleTechnical: () => void;
  /** Upload only: the "Thử ảnh khác" button + Esc hint, rendered to the
   * left of the technical-details toggle. Omit for a toggle-only row. */
  actionsLeft?: React.ReactNode;
}) {
  return (
    <div className="grid gap-10 px-6 py-12 sm:px-10 sm:py-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-14">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex min-w-0 justify-center"
      >
        <ImageZoomDialog
          imageUrl={imageUrl}
          imageAlt={imageAlt}
          size={340}
          ringColor={gradeColor}
          interiorClassName="bg-ink-raised"
          priority={imagePriority}
        />
      </motion.div>

      <div className="min-w-0">
        {qualityWarning && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
            <Alert variant={qualityWarning.variant}>
              <AlertTriangle />
              <AlertTitle>{qualityWarning.title}</AlertTitle>
              <AlertDescription>{qualityWarning.body}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <span className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">Mức độ</span>
          <div className="mt-1 flex items-baseline gap-4">
            <span className="font-mono text-7xl font-semibold" style={{ color: gradeColor }}>
              {grade}
            </span>
            <span className="text-2xl font-semibold text-foreground">{GRADE_LABELS[grade]}</span>
          </div>
          {explanation && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{explanation}</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="mt-8">
          <SeverityGauge grade={grade} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }} className="mt-8">
          <ConsensusIndicator backboneScores={backboneScores} />
        </motion.div>

        {doctorReview && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.5 }} className="mt-8">
            <DoctorReviewNote
              doctorName={doctorReview.doctorName}
              verdictLabel={GRADE_LABELS[doctorReview.doctorGrade]}
              verdictColor={GRADE_COLORS[doctorReview.doctorGrade]}
              note={doctorReview.note}
              metaLine={`Tái khám: ${doctorReview.followUp}`}
              updatedAt={doctorReview.updatedAt}
            />
          </motion.div>
        )}

        <div className={cn("mt-8 flex items-center gap-4", actionsLeft ? "justify-between" : "justify-end")}>
          {actionsLeft}
          <button
            type="button"
            onClick={onToggleTechnical}
            className="flex items-center gap-1 font-condensed text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            Chi tiết kỹ thuật
            <ChevronDown className={cn("h-3 w-3 transition-transform duration-300", showTechnical && "rotate-180")} />
          </button>
        </div>

        <AnimatePresence>
          {showTechnical && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 32 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="glossy shadow-bubble rounded-2xl border border-border bg-card px-6 py-5">
                <BackboneReadout scores={backboneScores} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
