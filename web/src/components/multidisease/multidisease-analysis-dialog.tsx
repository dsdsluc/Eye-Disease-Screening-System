"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScopeFrame } from "@/components/scope-frame";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DISEASE_LABELS, DISEASE_INFO } from "@/lib/multidisease";
import type { AnalysisPhase } from "@/components/analysis-dialog";

const STEPS = [{ label: "Tải lên" }, { label: "Chuẩn hóa" }, { label: "Đối chiếu" }, { label: "Hoàn tất" }] as const;

// Checklist strip during "Đối chiếu": lights up one of the 8 real output
// classes (DISEASE_LABELS -- the exact softmax the model produces, not a
// made-up list) at a time, with a ticker naming the one currently
// highlighted. The forward pass itself scores all 8 at once (no real
// per-class sequence to hook into), so -- same convention as every timing
// value in this dialog family -- this is a stylized, elapsed-time-driven
// visualization, not a literal progress feed. Doubles as a preview of
// ProbabilityGrid's own per-class tiles on the result screen right after.
const CHECKLIST_START_DELAY_MS = 1200;
const CHECKLIST_STEP_MS = 150;

/** Sub-stages shown while phase === "processing" -- inference/multidisease_
 * engine.py's real pipeline is a single-backbone forward pass (crop +
 * normalize, then one softmax over 8 disease classes), simpler than DR's
 * ensemble or glaucoma's optic-disc crop, so this only narrates two real
 * stages instead of manufacturing extra ones that don't exist. Same "timed
 * against elapsed time, not real progress events" convention as this
 * dialog's DR/glaucoma/AMD siblings -- reads as genuine only because
 * app/multidisease/page.tsx's runScreen enforces a floor on the whole
 * screen (MIN_LOADING_MS there). */
const PROCESSING_STEPS = [
  {
    title: "Đang chuẩn hóa ảnh…",
    body: "Cắt và chuẩn hóa ảnh đáy mắt trước khi đối chiếu.",
  },
  {
    title: "Đang đối chiếu 8 nhóm bệnh lý…",
    body: "Đối chiếu tuần tự từng nhóm bệnh lý bên dưới.",
  },
] as const;

const PROCESSING_STEP_DELAYS_MS = [0, 1200];

const OTHER_COPY: Record<"uploading" | "done" | "error", { title: string; body: string }> = {
  uploading: {
    title: "Đang tải ảnh lên…",
    body: "Giữ nguyên trang này trong giây lát.",
  },
  done: {
    title: "Xong!",
    body: "Xem kết quả bên dưới.",
  },
  error: {
    title: "Có lỗi xảy ra",
    body: "Vui lòng thử lại.",
  },
};

/** /multidisease's own "AI is working" modal -- narrates its real (simple)
 * pipeline instead of the shared AnalysisDialog's generic copy, PLUS an
 * 8-node checklist (see CHECKLIST_* above) that lights up one real output
 * class at a time during "Đối chiếu" -- the single generic step-dots row
 * every sibling dialog has felt thin for the one model here whose whole
 * point is comparing against 8 named categories, so this gives that step
 * its own distinct visual instead of just swapped-in copy. Same visual
 * shell as its DR/glaucoma/AMD siblings otherwise, gold-deep accent since
 * that's this flow's own color everywhere else in the app (OtherModelsNav's
 * multidisease badge, this page's own tip icons). Only replaces the MAIN screening
 * dialog -- the glaucoma deep-dive layered on top of a multidisease result
 * still uses the shared AnalysisDialog (see multidisease/page.tsx), since
 * that's glaucoma's own model running here as a secondary feature, not this
 * page's own pipeline. */
export function MultidiseaseAnalysisDialog({
  phase,
  error,
  previewUrl,
  onRetry,
  onChooseAnother,
}: {
  phase: AnalysisPhase;
  error: string | null;
  previewUrl: string | null;
  onRetry: () => void;
  onChooseAnother: () => void;
}) {
  const [subStep, setSubStep] = useState(0);
  const [checklistStep, setChecklistStep] = useState(0);

  useEffect(() => {
    if (phase !== "processing") return;
    const timers = PROCESSING_STEP_DELAYS_MS.map((delay, i) => setTimeout(() => setSubStep(i), delay));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "processing") return;
    // Index 0's delay is 0ms (an async macrotask, not a synchronous
    // setState-in-effect call) so a re-run (Thử lại) always restarts this
    // checklist instead of flashing the previous run's fully-checked state.
    const timers = [0, ...DISEASE_LABELS.map((_, i) => CHECKLIST_START_DELAY_MS + i * CHECKLIST_STEP_MS)].map(
      (delay, i) => setTimeout(() => setChecklistStep(i), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const stepIndex =
    phase === "uploading" ? 0 : phase === "processing" ? 1 + subStep : phase === "done" ? STEPS.length - 1 : -1;

  const title =
    phase === "processing" ? PROCESSING_STEPS[subStep].title : phase !== "idle" && phase !== "error" ? OTHER_COPY[phase].title : "";
  const body =
    phase === "error"
      ? (error ?? OTHER_COPY.error.body)
      : phase === "processing"
        ? PROCESSING_STEPS[subStep].body
        : phase !== "idle"
          ? OTHER_COPY[phase].body
          : "";

  return (
    <Dialog open={phase !== "idle"} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="glossy shadow-bubble sm:max-w-lg">
        <div className="flex flex-col items-center gap-8 px-4 py-8 text-center sm:px-8">
          <p className="font-condensed text-xs uppercase tracking-[0.3em] text-teal-deep">Fundas · AI đang xử lý</p>

          <ScopeFrame
            size={190}
            ringColor={phase === "error" ? "var(--color-sev-4)" : phase === "done" ? "var(--color-sev-0)" : "var(--color-gold-deep)"}
            interiorClassName="bg-ink-raised"
          >
            {previewUrl && <Image src={previewUrl} alt="Ảnh vừa tải lên" fill className="object-cover" unoptimized />}

            <AnimatePresence>
              {(phase === "uploading" || phase === "processing") && (
                <motion.div
                  aria-hidden="true"
                  className="absolute inset-x-0 h-1/3"
                  style={{ background: "linear-gradient(to bottom, transparent, rgba(201,162,39,0.5), transparent)" }}
                  initial={{ y: "-120%" }}
                  animate={{ y: "220%" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {(phase === "done" || phase === "error") && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-ink/70"
                >
                  {phase === "done" ? (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 18 }}
                    >
                      <CheckCircle2 className="h-16 w-16 text-sev-0" strokeWidth={1.5} />
                    </motion.div>
                  ) : (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                      <AlertTriangle className="h-16 w-16 text-sev-4" strokeWidth={1.5} />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </ScopeFrame>

          {phase !== "error" && (
            <div className="flex w-full max-w-xs items-center">
              {STEPS.map((step, i) => (
                <div key={step.label} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-300",
                        i < stepIndex && "border-gold-deep bg-gold-deep text-paper",
                        i === stepIndex && "border-gold-deep text-gold-deep",
                        i > stepIndex && "border-border text-muted-foreground"
                      )}
                    >
                      {i < stepIndex ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        "font-condensed text-[9px] uppercase tracking-wider transition-colors duration-300",
                        i <= stepIndex ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="mx-1.5 h-px flex-1 bg-border">
                      <motion.div
                        className="h-px bg-gold-deep"
                        initial={{ width: "0%" }}
                        animate={{ width: i < stepIndex ? "100%" : "0%" }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <AnimatePresence>
            {phase === "processing" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-2.5"
              >
                <div className="flex items-center gap-1.5">
                  {DISEASE_LABELS.map((label, i) => {
                    const done = i < checklistStep;
                    const active = i === checklistStep;
                    return (
                      <span
                        key={label}
                        className={cn(
                          "flex h-5.5 w-5.5 items-center justify-center rounded-full border text-[9px] font-semibold transition-colors duration-300",
                          done && "border-gold-deep bg-gold-deep text-paper",
                          active && "animate-pulse border-gold-deep text-gold-deep",
                          !done && !active && "border-border text-muted-foreground"
                        )}
                      >
                        {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : i + 1}
                      </span>
                    );
                  })}
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={checklistStep}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="font-condensed text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {checklistStep >= DISEASE_LABELS.length
                      ? "Đã đối chiếu xong 8 nhóm bệnh lý"
                      : `Đang so sánh: ${DISEASE_INFO[DISEASE_LABELS[checklistStep]].label}`}
                  </motion.p>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {phase !== "idle" && (
              <motion.div
                key={phase === "processing" ? `processing-${subStep}` : phase}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
                <DialogDescription className="mx-auto mt-2 max-w-sm">{body}</DialogDescription>
              </motion.div>
            )}
          </AnimatePresence>

          {phase === "error" && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={onChooseAnother}>
                Chọn ảnh khác
              </Button>
              <Button onClick={onRetry}>Thử lại</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
