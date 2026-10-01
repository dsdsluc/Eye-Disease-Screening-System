"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScopeFrame } from "@/components/scope-frame";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type AnalysisPhase = "idle" | "uploading" | "processing" | "done" | "error";

const PHASE_COPY: Record<Exclude<AnalysisPhase, "idle">, { title: string; body: string }> = {
  uploading: {
    title: "Đang tải ảnh lên…",
    body: "Giữ nguyên trang này trong giây lát.",
  },
  processing: {
    title: "Đang phân tích ảnh…",
    body: "20 lượt phân tích độc lập đang tổng hợp kết quả — thường mất vài giây.",
  },
  done: {
    title: "Xong!",
    body: "Đang chuyển đến trang kết quả…",
  },
  error: {
    title: "Có lỗi xảy ra",
    body: "Vui lòng thử lại.",
  },
};

const STEPS = [
  { key: "uploading", label: "Tải lên" },
  { key: "processing", label: "Phân tích" },
  { key: "done", label: "Hoàn tất" },
] as const;

/** Shared "AI is working" modal -- the public upload flow and the logged-in
 * workspace flow both drive this off the same single request/response (see
 * lib/api.ts's uploadImage), so they share the exact same staged experience
 * instead of two copies of the same animation drifting apart. */
export function AnalysisDialog({
  phase,
  error,
  previewUrl,
  onRetry,
  onChooseAnother,
  doneCopy,
}: {
  phase: AnalysisPhase;
  error: string | null;
  previewUrl: string | null;
  onRetry: () => void;
  onChooseAnother: () => void;
  /** Override the "done" title/body -- the public upload and workspace
   * flows both navigate away afterward ("Đang chuyển đến trang kết quả…"),
   * but not every caller does (e.g. the doctor's in-place photo capture). */
  doneCopy?: { title: string; body: string };
}) {
  const stepIndex = phase === "uploading" ? 0 : phase === "processing" ? 1 : phase === "done" ? 2 : -1;
  const copy = phase === "done" && doneCopy ? { ...PHASE_COPY, done: doneCopy } : PHASE_COPY;

  return (
    // Non-dismissable: open is only ever set by the caller, onOpenChange is a
    // no-op, so Escape/outside-click/close-button cannot get past a run in
    // progress -- don't let the user wander off mid-analysis.
    <Dialog open={phase !== "idle"} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="glossy shadow-bubble sm:max-w-lg">
        <div className="flex flex-col items-center gap-8 px-4 py-8 text-center sm:px-8">
          <p className="font-condensed text-xs uppercase tracking-[0.3em] text-teal-deep">Fundas · AI đang xử lý</p>

          {/* The user's own photo, scanned in place -- much more reassuring
              than a generic spinner, and it's the same ScopeFrame aperture
              as everywhere else instead of a one-off loading widget. */}
          <ScopeFrame
            size={190}
            ringColor={phase === "error" ? "var(--color-sev-4)" : phase === "done" ? "var(--color-sev-0)" : "var(--color-teal-deep)"}
            interiorClassName="bg-ink-raised"
          >
            {previewUrl && <Image src={previewUrl} alt="Ảnh vừa tải lên" fill className="object-cover" unoptimized />}

            <AnimatePresence>
              {(phase === "uploading" || phase === "processing") && (
                <motion.div
                  aria-hidden="true"
                  className="absolute inset-x-0 h-1/3"
                  style={{ background: "linear-gradient(to bottom, transparent, rgba(127,214,204,0.55), transparent)" }}
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
                <div key={step.key} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-300",
                        i < stepIndex && "border-teal-deep bg-teal-deep text-paper",
                        i === stepIndex && "border-teal-deep text-teal-deep",
                        i > stepIndex && "border-border text-muted-foreground"
                      )}
                    >
                      {i < stepIndex ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        "font-condensed text-[10px] uppercase tracking-wider transition-colors duration-300",
                        i <= stepIndex ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="mx-2 h-px flex-1 bg-border">
                      <motion.div
                        className="h-px bg-teal-deep"
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
                key={phase}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <DialogTitle className="text-lg font-semibold">{copy[phase].title}</DialogTitle>
                <DialogDescription className="mx-auto mt-2 max-w-sm">
                  {phase === "error" ? (error ?? PHASE_COPY.error.body) : copy[phase].body}
                </DialogDescription>
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
