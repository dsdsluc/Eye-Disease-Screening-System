"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Crosshair, Focus, Sun } from "lucide-react";

import { uploadImage, GRADE_COLORS, type ScanResult } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { notifyError } from "@/lib/toast";
import { UploadDropzone } from "@/components/upload-dropzone";
import { ScanResultPanel } from "@/components/scan-result-panel";
import { AnonymousSaveNudge } from "@/components/anonymous-save-nudge";
import { ScreeningWorkspaceShell } from "@/components/screening-workspace-shell";
import { DrAnalysisDialog } from "@/components/dr-analysis-dialog";
import type { AnalysisPhase } from "@/components/analysis-dialog";
import { Button } from "@/components/ui/button";

/** Floor on the whole "uploading" -> "done" screen, enforced regardless of
 * how fast uploadImage actually resolves (inference/'s own docs put
 * warm-cache predictions at ~1.3-1.9s) -- DrAnalysisDialog's staged
 * quality-check/ensemble copy needs real time on screen to read as genuine
 * instead of flashing past. Same convention as /amd, /multidisease, and
 * /glaucoma's own MIN_LOADING_MS. Only gates the success path: an error
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
    title: "Canh giữa khung hình",
    body: "Đưa vùng đáy mắt vào chính giữa ảnh chụp.",
  },
];

const PILLS = [
  "Không lưu trữ công khai",
  "Xử lý trong vài giây",
  "Không thay thế bác sĩ",
];

const QUALITY_WARNING: Record<"usable" | "reject", { title: string; body: string; variant: "default" | "destructive" }> = {
  usable: {
    title: "Chất lượng ảnh chỉ ở mức tạm được",
    body: "Ảnh hơi mờ, thiếu sáng hoặc lệch tâm -- kết quả bên dưới vẫn hiển thị nhưng có thể kém chính xác hơn. Nên chụp lại nếu có thể.",
    variant: "default",
  },
  reject: {
    title: "Chất lượng ảnh không đạt",
    body: "Ảnh quá mờ/tối/lệch tâm để đọc chính xác. Kết quả bên dưới có độ tin cậy thấp -- vui lòng chụp lại ảnh rõ nét, đủ sáng, canh giữa đáy mắt.",
    variant: "destructive",
  },
};

/** Public /upload is anonymous and never persisted (see web/src/app/api/scans/route.ts's
 * `persist` check) -- so unlike the logged-in workspace flow, there is no
 * imageId to redirect to and fetch by. The whole flow -- upload widget,
 * "AI is working" modal, and the result -- lives in this one client page,
 * switching its own layout once `result` is set instead of navigating away. */
export default function UploadPage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const fileRef = useRef<File | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runUpload = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setPhase("uploading");
    // uploadImage resolves with the finished grade in one round trip
    // (inference/ is synchronous) -- "processing" is a timed visual
    // transition, not a real status to poll for.
    timerRef.current = setTimeout(() => setPhase((p) => (p === "uploading" ? "processing" : p)), 500);
    const startedAt = Date.now();
    try {
      const uploaded = await uploadImage(file);
      if (uploaded.status === "failed") {
        clearTimeout(timerRef.current);
        const message = uploaded.error ?? "Xử lý ảnh thất bại.";
        setError(message);
        setPhase("error");
        notifyError(message);
        return;
      }
      const remaining = MIN_LOADING_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      clearTimeout(timerRef.current);
      setResult(uploaded);
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
      runUpload(file);
    },
    [runUpload]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setShowTechnical(false);
    setPhase("idle");
    fileRef.current = null;
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  // A quick "try another photo" path once a result is showing -- Esc is the
  // obvious key for "back out of this" and costs nothing to wire up.
  useEffect(() => {
    if (!result) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") reset();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [result, reset]);

  const gradeColor = result ? GRADE_COLORS[result.grade] : "var(--color-border)";
  const qualityWarning = result?.quality && result.quality.label !== "good" ? QUALITY_WARNING[result.quality.label] : null;

  // The upload widget / result view itself -- identical whether the visitor
  // is logged in or not; only the chrome around it (below) differs.
  const uploadOrResult = (
    <AnimatePresence mode="wait">
      {!result ? (
        <motion.div
          key="upload"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-border/60 bg-linear-to-br from-secondary/70 via-background to-background sm:rounded-[2.75rem]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 h-140 w-140 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
            style={{
              background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)",
            }}
          />

          <div className="relative grid gap-14 px-6 py-14 sm:px-10 sm:py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10">
            {/* Left: context + practical tips -- real guidance content, not
                filler, since photo quality genuinely affects the reading. */}
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
                Fundas · Sàng lọc võng mạc tiểu đường
              </motion.p>
              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
              >
                Tải ảnh đáy mắt của bạn
              </motion.h1>
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground"
              >
                AI sẽ phân tích và đưa ra mức độ đánh giá trong vài giây, kèm diễn giải hỗ trợ bác sĩ đọc lại ảnh.
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

            {/* Right: the aperture itself, plus reassurance pills right under it. */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.7,
                delay: 0.25,
                ease: [0.16, 1, 0.3, 1],
              }}
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
          <ScanResultPanel
            imageUrl={previewUrl}
            imageAlt="Ảnh đáy mắt vừa tải lên"
            gradeColor={gradeColor}
            grade={result.grade}
            backboneScores={result.backboneScores}
            qualityWarning={qualityWarning}
            showTechnical={showTechnical}
            onToggleTechnical={() => setShowTechnical((v) => !v)}
            actionsLeft={
              <div className="flex items-center gap-2.5">
                <Button variant="outline" onClick={reset}>
                  Thử ảnh khác
                </Button>
                <kbd className="hidden rounded-md border border-border bg-secondary px-1.5 py-1 font-mono text-[10px] text-muted-foreground sm:inline-block">
                  Esc
                </kbd>
              </div>
            }
          />
          {!user && <AnonymousSaveNudge />}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <ScreeningWorkspaceShell
      user={user}
      eyebrow="Fundas · Tải ảnh"
      title="Tải ảnh mới"
      otherModelsCurrent="dr"
      content={uploadOrResult}
    >
      <DrAnalysisDialog
        phase={phase}
        error={error}
        previewUrl={previewUrl}
        onRetry={() => fileRef.current && runUpload(fileRef.current)}
        onChooseAnother={() => setPhase("idle")}
      />
    </ScreeningWorkspaceShell>
  );
}
