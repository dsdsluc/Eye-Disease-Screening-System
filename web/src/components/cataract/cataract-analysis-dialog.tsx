"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScopeFrame } from "@/components/scope-frame";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AnalysisPhase } from "@/components/analysis-dialog";

const STEPS = [{ label: "Tải lên" }, { label: "Phân tích" }, { label: "Hoàn tất" }] as const;

/** Sub-stage shown while phase === "processing". Used to narrate face-
 * detect -> eye-crop -> classify here, but app/cataract/page.tsx's flow now
 * runs detection and cropping BEFORE this dialog ever opens (see
 * CataractCropConfirm: the user reviews and confirms the actual YuNet crop
 * on its own screen first), and the image handed to analyzeCataract() is
 * already that confirmed crop -- so by the time this dialog is showing,
 * only the classifier itself is left to narrate. Same "timed against
 * elapsed time, not real progress events" convention as this dialog's DR/
 * multidisease/glaucoma/AMD siblings -- reads as genuine only because
 * app/cataract/page.tsx's runScreen enforces a floor on the whole screen
 * (MIN_LOADING_MS there). */
const PROCESSING_STEPS = [
  {
    title: "Đang phân tích với mô hình chuyên biệt…",
    body: "Mô hình chuyên biệt cho đục thủy tinh thể đang đọc vùng mắt bạn vừa xác nhận.",
  },
] as const;

const PROCESSING_STEP_DELAYS_MS = [0];

// Corner-bracket "camera focus" reticle over the photo during "processing",
// same visual language as GlaucomaAnalysisDialog's (components/glaucoma/).
// Always shown "locked" (small, centered) now -- the searching->locked
// animation this used to do read as "still hunting for a face," which no
// longer happens here: CataractCropConfirm already found and confirmed the
// crop before this dialog ever opens.
const RETICLE_SIZE = { locked: "42%" };

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

/** /cataract's own "AI is working" modal -- narrates the real face-detect
 * -> eye-crop -> classify pipeline instead of the shared AnalysisDialog's
 * generic copy, with the same corner-bracket reticle GlaucomaAnalysisDialog
 * uses for its own detect-then-crop step. sev-1 accent since that's this
 * flow's own color everywhere else in the app (OtherModelsNav's cataract
 * badge) -- a fifth color distinct from every sibling's (teal-deep DR,
 * gold-deep multidisease, maroon-deep glaucoma, sev-3 AMD). */
export function CataractAnalysisDialog({
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

  useEffect(() => {
    if (phase !== "processing") return;
    const timers = PROCESSING_STEP_DELAYS_MS.map((delay, i) => setTimeout(() => setSubStep(i), delay));
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
            ringColor={phase === "error" ? "var(--color-sev-4)" : phase === "done" ? "var(--color-sev-0)" : "var(--color-sev-1)"}
            interiorClassName="bg-ink-raised"
          >
            {previewUrl && (
              // previewUrl here is either a blob: URL (the initial upload/
              // crop-preview step) or a data: URI (pendingCrop.croppedPng,
              // once the user confirms the crop and this dialog re-opens for
              // the actual classify call) -- next/image's optimizer doesn't
              // reliably accept the latter, same reasoning as
              // CataractCropConfirm's own plain <img> for that exact string.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Ảnh vừa tải lên" className="h-full w-full object-cover" />
            )}

            <AnimatePresence>
              {phase === "uploading" && (
                <motion.div
                  aria-hidden="true"
                  className="absolute inset-x-0 h-1/3"
                  style={{ background: "linear-gradient(to bottom, transparent, rgba(147,166,61,0.5), transparent)" }}
                  initial={{ y: "-120%" }}
                  animate={{ y: "220%" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {phase === "processing" && (
                <motion.div
                  aria-hidden="true"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-1/2 left-1/2"
                  style={{ x: "-50%", y: "-50%" }}
                >
                  {/* Straight to "locked" size, no searching->locked animation:
                      the crop this reticle represents was already found and
                      confirmed on CataractCropConfirm before this dialog ever
                      opens, so there's nothing left to visually "search" for. */}
                  <motion.div
                    className="relative"
                    initial={{ width: RETICLE_SIZE.locked, height: RETICLE_SIZE.locked }}
                    animate={{ width: RETICLE_SIZE.locked, height: RETICLE_SIZE.locked, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  >
                    {[
                      "top-0 left-0 border-t-2 border-l-2 rounded-tl-sm",
                      "top-0 right-0 border-t-2 border-r-2 rounded-tr-sm",
                      "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-sm",
                      "bottom-0 right-0 border-b-2 border-r-2 rounded-br-sm",
                    ].map((pos) => (
                      <span
                        key={pos}
                        className={cn("absolute h-4 w-4 border-paper", pos)}
                        style={{ filter: "drop-shadow(0 0 4px rgba(147,166,61,0.8))" }}
                      />
                    ))}
                  </motion.div>
                </motion.div>
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
                        i < stepIndex && "border-sev-1 bg-sev-1 text-paper",
                        i === stepIndex && "border-sev-1 text-sev-1",
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
                        className="h-px bg-sev-1"
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
