"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Crosshair, Focus, Sun } from "lucide-react";

import { analyzeGlaucoma, type GlaucomaResult } from "@/lib/glaucoma";
import { useAuth } from "@/lib/auth-context";
import { notifyError } from "@/lib/toast";
import { UploadDropzone } from "@/components/upload-dropzone";
import { GlaucomaResultPanel } from "@/components/glaucoma/glaucoma-result-panel";
import { GlaucomaAnalysisDialog } from "@/components/glaucoma/glaucoma-analysis-dialog";
import { AnonymousSaveNudge } from "@/components/anonymous-save-nudge";
import { ScreeningWorkspaceShell } from "@/components/screening-workspace-shell";
import type { AnalysisPhase } from "@/components/analysis-dialog";

/** Floor on the whole "uploading" -> "done" screen, enforced regardless of
 * how fast analyzeGlaucoma actually resolves -- GlaucomaAnalysisDialog's
 * staged optic-disc-crop copy needs real time on screen to read as genuine
 * instead of flashing past. Same convention as /amd, /upload, and
 * /multidisease's own MIN_LOADING_MS. Only gates the success path: an error
 * still surfaces as soon as it's known. */
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
    icon: Crosshair,
    title: "Thấy rõ đĩa thị giác",
    body: "Mô hình cần khoanh được vùng đĩa thị giác -- tránh cắt mất cạnh ảnh.",
  },
];

const PILLS = ["Không lưu trữ công khai", "Xử lý trong vài giây", "Không dùng để chẩn đoán"];

/** /glaucoma -- a standalone entry point for the glaucoma specialist model
 * (inference/glaucoma_engine.py via /api/glaucoma), which until now only
 * ran as a deep-dive layered on top of an existing /multidisease result
 * (the threshold banner, or DiseaseInfoDialog's "Phân tích chuyên sâu"
 * button). `analyzeGlaucoma`'s `multidiseaseScreeningId` param is already
 * optional (lib/glaucoma.ts) and /api/glaucoma already accepts a bare
 * `file` with no multidisease screening at all -- this page is the first
 * thing to actually call it that way, so no backend changes were needed,
 * only this UI.
 *
 * Guest-first, same as the first pass of every other screening page here:
 * an anonymous visitor gets a full working result (GlaucomaResultPanel,
 * nothing saved -- /api/glaucoma's own anonymous branch), and a logged-in
 * visitor's screening persists automatically (GlaucomaScreening row) since
 * that's just what happens when `getSessionUser()` resolves server-side --
 * a saved-results view under /account or /history is real follow-up work,
 * not something to fake here. Structure and chrome are a direct copy of
 * /multidisease/page.tsx (same dual anonymous/workspace shell, same
 * AnalysisDialog + AnimatePresence intro/result swap) minus the
 * glaucoma-deep-dive-on-top logic that page needs and this page doesn't --
 * this page's whole point IS that model, not a nested feature on top of it. */
export default function GlaucomaPage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<GlaucomaResult | null>(null);
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
      const screened = await analyzeGlaucoma(file);
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
            style={{ background: "radial-gradient(circle, var(--color-teal) 0%, transparent 70%)" }}
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
                Fundas · Sàng lọc tăng nhãn áp
              </motion.p>
              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
              >
                Glaucoma tiến triển âm thầm — sàng lọc sớm từ một ảnh chụp
              </motion.h1>
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground"
              >
                Mô hình chuyên biệt cho tăng nhãn áp, tự động khoanh vùng đĩa thị giác trước khi phân tích — tách riêng
                khỏi sàng lọc đa bệnh vì đây là một mô hình khác, có độ chính xác riêng.
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
          <GlaucomaResultPanel imageUrl={previewUrl} imageAlt="Ảnh đáy mắt vừa tải lên" result={result} onReset={reset} />
          {!user && <AnonymousSaveNudge />}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <ScreeningWorkspaceShell
      user={user}
      eyebrow="Fundas · Sàng lọc tăng nhãn áp"
      title="Tăng nhãn áp"
      otherModelsCurrent="glaucoma"
      content={uploadOrResult}
    >
      <GlaucomaAnalysisDialog
        phase={phase}
        error={error}
        previewUrl={previewUrl}
        onRetry={() => fileRef.current && runScreen(fileRef.current)}
        onChooseAnother={() => setPhase("idle")}
      />
    </ScreeningWorkspaceShell>
  );
}
