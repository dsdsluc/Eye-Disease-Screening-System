"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Crosshair, Focus, Sun } from "lucide-react";

import { screenMultiDisease, type MultiDiseaseResult } from "@/lib/multidisease";
import { analyzeGlaucoma, type GlaucomaResult } from "@/lib/glaucoma";
import { useAuth } from "@/lib/auth-context";
import { notifyError } from "@/lib/toast";
import { UploadDropzone } from "@/components/upload-dropzone";
import { MultidiseaseResultPanel } from "@/components/multidisease/result-panel";
import { MultidiseaseAnalysisDialog } from "@/components/multidisease/multidisease-analysis-dialog";
import { GlaucomaResultDialog } from "@/components/glaucoma/glaucoma-result-dialog";
import { AnonymousSaveNudge } from "@/components/anonymous-save-nudge";
import { ScreeningWorkspaceShell } from "@/components/screening-workspace-shell";
import { AnalysisDialog, type AnalysisPhase } from "@/components/analysis-dialog";

/** Floor on the MAIN screening's "uploading" -> "done" screen (not the
 * glaucoma deep-dive below, which keeps the shared AnalysisDialog and no
 * floor), enforced regardless of how fast screenMultiDisease actually
 * resolves -- MultidiseaseAnalysisDialog's staged copy needs real time on
 * screen to read as genuine instead of flashing past. Same convention as
 * /amd, /upload, and /glaucoma's own MIN_LOADING_MS. Only gates the success
 * path: an error still surfaces as soon as it's known. */
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
    title: "Canh giữa khung hình",
    body: "Đưa vùng đáy mắt vào chính giữa ảnh chụp.",
  },
];

const PILLS = ["Không lưu trữ công khai", "Xử lý trong vài giây", "Không dùng để chẩn đoán"];

/** /multidisease -- the multi-disease screening feature (plans/plan_
 * multidisease.txt). UI ONLY still: inference/'s /multidisease-screen
 * endpoint and web/'s /api/multidisease route (plan sections 3, 4.2-4.3)
 * don't exist yet, so `screenMultiDisease` (lib/multidisease.ts) fakes the
 * response -- see that file's header comment for the swap-in point. The
 * MultidiseaseScreening Prisma model (plan section 4.1) now exists (a
 * separate pass), but nothing here persists to it yet -- that's the next
 * step once the API route lands.
 *
 * Same auth-aware chrome split as /upload: anonymous visitors get the
 * plain "← Trang chủ" flow (unchanged from the first pass); a logged-in
 * user gets the same workspace shell as /account, /history, and /upload
 * (AppNavCard, mobile AppHeader, floating Home, split page header) --
 * AppNavCard now also lists this feature (see components/app-nav-card.tsx)
 * so it's one click away like Lịch sử/Sàng lọc võng mạc/Hồ sơ already are.
 * Deliberately its own route, not folded into /upload's result view, per
 * plan section 2's "separate feature" decision: this model's ~62% accuracy
 * is well below the DR ensemble's, so it must never look like the same
 * kind of result. Renamed from /screening -- "screening" (sàng lọc) is also
 * what the DR flow calls itself, so the route now matches the
 * MultidiseaseScreening model name instead of colliding with that term. */
export default function MultidiseasePage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<MultiDiseaseResult | null>(null);
  const fileRef = useRef<File | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Glaucoma deep-dive (plans/plan_glaucoma.txt) -- a second, independent
  // request/result pair layered on top of the multidisease one above, since
  // it's a separate model run on demand (threshold banner or the dialog
  // button), not part of the multidisease response itself.
  const [glaucomaPhase, setGlaucomaPhase] = useState<AnalysisPhase>("idle");
  const [glaucomaError, setGlaucomaError] = useState<string | null>(null);
  const [glaucomaResult, setGlaucomaResult] = useState<GlaucomaResult | null>(null);
  const glaucomaTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(glaucomaTimerRef.current);
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
      const screened = await screenMultiDisease(file);
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

  const runGlaucomaAnalysis = useCallback(async () => {
    const file = fileRef.current;
    if (!file) return;
    setGlaucomaError(null);
    setGlaucomaResult(null);
    setGlaucomaPhase("uploading");
    glaucomaTimerRef.current = setTimeout(() => setGlaucomaPhase((p) => (p === "uploading" ? "processing" : p)), 500);
    try {
      // result?.id links the new GlaucomaScreening back to this
      // MultidiseaseScreening (logged in only -- undefined for an
      // anonymous, unsaved result, same as screenMultiDisease itself).
      const analyzed = await analyzeGlaucoma(file, result?.id);
      clearTimeout(glaucomaTimerRef.current);
      setGlaucomaPhase("idle");
      setGlaucomaResult(analyzed);
    } catch (e) {
      clearTimeout(glaucomaTimerRef.current);
      const message = e instanceof Error ? e.message : "Có lỗi xảy ra, thử lại nhé.";
      setGlaucomaError(message);
      setGlaucomaPhase("error");
      notifyError(message);
    }
  }, [result]);

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
    clearTimeout(glaucomaTimerRef.current);
    setGlaucomaResult(null);
    setGlaucomaError(null);
    setGlaucomaPhase("idle");
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

  // The upload widget / result view itself -- identical whether the visitor
  // is logged in or not; only the chrome around it (below) differs.
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
            style={{ background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)" }}
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
                Fundas · Sàng lọc đa bệnh
              </motion.p>
              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
              >
                Một ảnh, đối chiếu nhanh 8 nhóm bệnh về mắt
              </motion.h1>
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground"
              >
                Tiểu đường, tăng nhãn áp, đục thủy tinh thể, thoái hóa điểm vàng và các nhóm khác — cùng một ảnh đáy mắt,
                trong vài giây.
              </motion.p>

              <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="mt-9 flex flex-col gap-5">
                {TIPS.map((tip) => (
                  <div key={tip.title} className="flex items-start gap-3.5">
                    <span className="glossy shadow-bubble flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                      <tip.icon className="h-4.5 w-4.5 text-gold-deep" strokeWidth={1.75} />
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
          <MultidiseaseResultPanel
            imageUrl={previewUrl}
            imageAlt="Ảnh đáy mắt vừa tải lên"
            result={result}
            onReset={reset}
            onAnalyzeGlaucoma={runGlaucomaAnalysis}
          />
          {!user && <AnonymousSaveNudge />}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <ScreeningWorkspaceShell
      user={user}
      eyebrow="Fundas · Sàng lọc đa bệnh"
      title="Sàng lọc đa bệnh"
      otherModelsCurrent="multidisease"
      content={uploadOrResult}
    >
      <MultidiseaseAnalysisDialog
        phase={phase}
        error={error}
        previewUrl={previewUrl}
        onRetry={() => fileRef.current && runScreen(fileRef.current)}
        onChooseAnother={() => setPhase("idle")}
      />

      {/* Glaucoma deep-dive progress -- reuses the shared, generic
          AnalysisDialog (not MultidiseaseAnalysisDialog above): this is
          glaucoma's own model running as a secondary feature layered on top
          of a multidisease result, not this page's own pipeline, so it
          keeps the plain "AI đang xử lý" shell driven by glaucomaPhase
          instead of phase. No doneCopy override needed: the "processing" ->
          "idle" transition itself is what swaps this dialog out for
          GlaucomaResultDialog below. */}
      <AnalysisDialog
        phase={glaucomaPhase}
        error={glaucomaError}
        previewUrl={previewUrl}
        onRetry={runGlaucomaAnalysis}
        onChooseAnother={() => setGlaucomaPhase("idle")}
      />
      <GlaucomaResultDialog
        result={glaucomaResult}
        imageUrl={previewUrl}
        imageAlt="Ảnh đáy mắt vừa tải lên"
        onOpenChange={(open) => !open && setGlaucomaResult(null)}
      />
    </ScreeningWorkspaceShell>
  );
}
