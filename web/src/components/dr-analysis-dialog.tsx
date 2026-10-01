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
  { label: "Chất lượng" },
  { label: "Phân tích" },
  { label: "Tổng hợp" },
  { label: "Hoàn tất" },
] as const;

/** Sub-stages shown while phase === "processing" -- inference/'s own real
 * pipeline (see inference/engine.py + web/src/app/api/scans/route.ts):
 * QualityEngine's fail-open gate runs first, then InferenceEngine forwards
 * the image through 4 backbones x 5 folds each (20 independent reads,
 * vmapped into 4 batched calls) and combines them into one weighted grade --
 * this narrates those two real stages instead of a generic "đang phân tích"
 * stall. No progress events exist to hook into mid-request though, so the
 * timeline below is timed against elapsed time, same convention as
 * components/amd/amd-analysis-dialog.tsx -- it only reads as genuine because
 * app/upload/page.tsx's runUpload enforces a floor on the whole screen (see
 * MIN_LOADING_MS there) regardless of how fast the request actually
 * resolves. */
const PROCESSING_STEPS = [
  {
    title: "Đang kiểm tra chất lượng ảnh…",
    body: "Phát hiện ảnh mờ hoặc thiếu sáng trước khi đưa vào chẩn đoán.",
  },
  {
    title: "Đang chạy 20 lượt phân tích…",
    body: "4 mô hình AI, mỗi mô hình 5 lượt đọc độc lập trên ảnh của bạn.",
  },
  {
    title: "Đang tổng hợp kết quả…",
    body: "Kết hợp 20 lượt phân tích thành một mức độ chung (thang 0-4).",
  },
] as const;

const PROCESSING_STEP_DELAYS_MS = [0, 900, 1800];

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

/** /upload's own "AI is working" modal -- narrates the DR ensemble's real
 * two-stage pipeline (quality gate, then the 20-model ensemble) instead of
 * the shared AnalysisDialog's generic 3-step copy. Same visual shell as
 * that component and its AMD/glaucoma siblings (ScopeFrame scan, step dots,
 * Dialog chrome), teal-deep accent since that's this flow's own color
 * everywhere else in the app (OtherModelsNav's dr badge, the shared
 * dialog's own default). doneCopy is fixed here (not a prop) since only one
 * caller uses this dialog. */
export function DrAnalysisDialog({
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
                <div key={step.label} className="flex flex-1 items-center last:flex-none">
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
