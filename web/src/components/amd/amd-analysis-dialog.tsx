"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScopeFrame } from "@/components/scope-frame";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AnalysisPhase } from "@/components/analysis-dialog";

const STEPS = [
  { label: "Tải lên" },
  { label: "Cân sáng" },
  { label: "Tương phản" },
  { label: "Phân tích" },
  { label: "Hoàn tất" },
] as const;

/** Sub-stages shown while phase === "processing" -- inference/amd_engine.py
 * runs gamma correction, CLAHE, and the model's forward pass as one blocking
 * Python call with no real progress events to hook into, so this timeline is
 * cosmetic, timed against elapsed time rather than driven by the actual
 * request. It only reads as genuine because app/amd/page.tsx's runScreen
 * enforces a >=3s floor on the whole screen regardless of how fast the
 * (currently faked, later real) call actually resolves -- without that
 * floor a fast response would cut this sequence off before it finishes. */
const PROCESSING_STEPS = [
  {
    title: "Đang cân chỉnh ánh sáng…",
    body: "Hiệu chỉnh gamma để làm rõ vùng trung tâm võng mạc trước khi phân tích.",
  },
  {
    title: "Đang tăng cường tương phản…",
    body: "CLAHE giúp khớp ảnh với cách dữ liệu huấn luyện mô hình đã được xử lý.",
  },
  {
    title: "Đang phân tích với mô hình AI…",
    body: "Mô hình chuyên biệt cho thoái hóa điểm vàng đang đọc ảnh đã xử lý.",
  },
] as const;

const PROCESSING_STEP_DELAYS_MS = [0, 1000, 2000];

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

/** /amd's own "AI is working" modal -- NOT the shared AnalysisDialog every
 * other screening page reuses: AMD is the only model here with a real,
 * distinctive preprocessing step (gamma + CLAHE, to match how AMDNet23's
 * training images were enhanced -- config/amd/config.json), so this dialog
 * narrates THAT instead of a generic "đang phân tích" stall. Same visual
 * shell as AnalysisDialog (ScopeFrame scan, step dots, Dialog chrome) so it
 * still reads as the same product, just with AMD-specific staging. */
export function AmdAnalysisDialog({
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
    // Index 0's delay is 0ms (still an async macrotask, not a synchronous
    // setState-in-effect call) so a re-run (Thử lại) always starts this
    // sequence over instead of carrying over wherever it last left off.
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
    // Non-dismissable, same convention as AnalysisDialog -- don't let the
    // user wander off mid-analysis.
    <Dialog open={phase !== "idle"} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="glossy shadow-bubble sm:max-w-lg">
        <div className="flex flex-col items-center gap-8 px-4 py-8 text-center sm:px-8">
          <p className="font-condensed text-xs uppercase tracking-[0.3em] text-teal-deep">Fundas · AI đang xử lý</p>

          <ScopeFrame
            size={190}
            ringColor={phase === "error" ? "var(--color-sev-4)" : phase === "done" ? "var(--color-sev-0)" : "var(--color-sev-3)"}
            interiorClassName="bg-ink-raised"
          >
            {previewUrl && <Image src={previewUrl} alt="Ảnh vừa tải lên" fill className="object-cover" unoptimized />}

            <AnimatePresence>
              {(phase === "uploading" || phase === "processing") && (
                <motion.div
                  aria-hidden="true"
                  className="absolute inset-x-0 h-1/3"
                  style={{ background: "linear-gradient(to bottom, transparent, rgba(201,106,46,0.5), transparent)" }}
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
                        i < stepIndex && "border-sev-3 bg-sev-3 text-paper",
                        i === stepIndex && "border-sev-3 text-sev-3",
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
                        className="h-px bg-sev-3"
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
