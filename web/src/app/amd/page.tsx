"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Focus, ScanEye, Sun } from "lucide-react";

import { analyzeAmd, type AmdResult } from "@/lib/amd";
import { useAuth } from "@/lib/auth-context";
import { notifyError } from "@/lib/toast";
import { UploadDropzone } from "@/components/upload-dropzone";
import { AmdResultPanel } from "@/components/amd/amd-result-panel";
import { AmdAnalysisDialog } from "@/components/amd/amd-analysis-dialog";
import { AnonymousSaveNudge } from "@/components/anonymous-save-nudge";
import { ScreeningWorkspaceShell } from "@/components/screening-workspace-shell";
import type { AnalysisPhase } from "@/components/analysis-dialog";

/** Floor on the whole "uploading" -> "done" screen, enforced regardless of
 * how fast analyzeAmd actually resolves -- inference/'s own docs put
 * warm-cache predictions at ~1.3-1.9s. AmdAnalysisDialog's staged
 * gamma/CLAHE/model copy needs real time on screen to read as genuine
 * instead of flashing past -- without this floor a fast response would cut
 * that sequence short. Only gates the success path: an error still surfaces
 * as soon as it's known, never held back for the sake of the animation. */
const MIN_LOADING_MS = 3000;

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

const TIPS = [
  {
    icon: Sun,
    title: "Đủ ánh sáng",
    body: "Chụp trong phòng đủ sáng, tránh bóng đổ lên mắt.",
  },
  {
    icon: Focus,
    title: "Ảnh rõ nét",
    body: "Giữ máy ổn định, lấy nét đúng vào vùng đáy mắt.",
  },
  {
    icon: ScanEye,
    title: "Thấy rõ điểm vàng",
    body: "Mô hình cần thấy rõ vùng trung tâm võng mạc (điểm vàng) -- tránh cắt mất cạnh ảnh.",
  },
];

const PILLS = ["Không lưu trữ công khai", "Xử lý trong vài giây", "Không dùng để chẩn đoán"];

/** /amd -- a standalone entry point for the AMD specialist model
 * (inference/amd_engine.py: gamma correction + CLAHE to match how AMDNet23's
 * training images were pre-processed, then the same seresnext50_32x4d shape
 * glaucoma uses), backed by a real /api/amd route + AmdScreening persistence
 * (same shape as /api/glaucoma) -- no AmdReview model exists though, so
 * unlike glaucoma/cataract there's no doctor-side review loop for this one
 * yet. Same dual anonymous/workspace shell as /glaucoma/page.tsx (this
 * page's structure is a direct copy of that one), except the loading modal:
 * this page uses its own AmdAnalysisDialog (components/amd/) instead of the
 * shared AnalysisDialog, since AMD is the only model here with a real
 * preprocessing story (gamma + CLAHE) worth narrating step by step -- see
 * that component's header comment, and MIN_LOADING_MS below, for why that
 * only works with a floor on the total loading time. */
export default function AmdPage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AmdResult | null>(null);
  const fileRef = useRef<File | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runScreen = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setPhase("uploading");
    const startedAt = Date.now();
    timerRef.current = setTimeout(() => setPhase((p) => (p === "uploading" ? "processing" : p)), 500);
    try {
      const screened = await analyzeAmd(file);
      const remaining = MIN_LOADING_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      clearTimeout(timerRef.current);
      setResult(screened);
      setPhase("done");
      timerRef.current = setTimeout(() => setPhase("idle"), 900);
    } catch (e) {
      clearTimeout(timerRef.current);
      const message = e instanceof Error ? e.message : "Có lỗi xảy ra, thử lại nhé.";
      setError(message);
      setPhase("error");
      notifyError(message);
    }
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      fileRef.current = file;
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      runScreen(file);
    },
    [runScreen]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setPhase("idle");
    fileRef.current = null;
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!result) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") reset();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [result, reset]);

  const uploadOrResult = (
    <AnimatePresence mode="wait">
      {!result ? (
        <motion.div
          key="intro"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-border/60 bg-linear-to-br from-secondary/70 via-background to-background sm:rounded-[2.75rem]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 h-140 w-140 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--color-sev-3) 0%, transparent 70%)" }}
          />

          <div className="relative grid gap-14 px-6 py-14 sm:px-10 sm:py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10">
            <motion.div
              initial="hidden"
              animate="show"
              transition={{ staggerChildren: 0.12, delayChildren: 0.05 }}
              className="min-w-0"
            >
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="mb-4 font-condensed text-xs uppercase tracking-[0.3em] text-teal-deep"
              >
                Fundas · Sàng lọc thoái hóa điểm vàng
              </motion.p>
              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
              >
                Thoái hóa điểm vàng ảnh hưởng thị lực trung tâm — sàng lọc sớm từ một ảnh chụp
              </motion.h1>
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground"
              >
                Mô hình chuyên biệt cho thoái hóa điểm vàng (AMD), tự động cân chỉnh sáng và tương phản ảnh trước khi
                phân tích để khớp với cách dữ liệu huấn luyện đã được xử lý — tách riêng khỏi sàng lọc đa bệnh vì đây
                là một mô hình khác, còn mới và ít được kiểm định hơn.
              </motion.p>

              <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="mt-9 flex flex-col gap-5">
                {TIPS.map((tip) => (
                  <div key={tip.title} className="flex items-start gap-3.5">
                    <span className="glossy shadow-bubble flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                      <tip.icon className="h-4.5 w-4.5 text-teal-deep" strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{tip.title}</p>
                      <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{tip.body}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex min-w-0 flex-col items-center gap-6"
            >
              <UploadDropzone onFile={handleFile} disabled={phase !== "idle"} />
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {PILLS.map((text) => (
                  <span
                    key={text}
                    className="glossy rounded-full border border-border bg-secondary px-3.5 py-1.5 font-condensed text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {text}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="result"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full overflow-hidden rounded-[2rem] border border-border/60 bg-linear-to-br from-secondary/70 via-background to-background sm:rounded-[2.75rem]"
        >
          <AmdResultPanel imageUrl={previewUrl} imageAlt="Ảnh đáy mắt vừa tải lên" result={result} onReset={reset} />
          {!user && <AnonymousSaveNudge />}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <ScreeningWorkspaceShell
      user={user}
      eyebrow="Fundas · Sàng lọc thoái hóa điểm vàng"
      title="Thoái hóa điểm vàng"
      otherModelsCurrent="amd"
      content={uploadOrResult}
    >
      <AmdAnalysisDialog
        phase={phase}
        error={error}
        previewUrl={previewUrl}
        onRetry={() => fileRef.current && runScreen(fileRef.current)}
        onChooseAnother={() => setPhase("idle")}
      />
    </ScreeningWorkspaceShell>
  );
}
