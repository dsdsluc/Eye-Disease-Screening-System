"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Focus, ScanFace, Sun } from "lucide-react";

import { analyzeCataract, previewCataractCrop, type CataractResult } from "@/lib/cataract";
import { useAuth } from "@/lib/auth-context";
import { notifyError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { UploadDropzone } from "@/components/upload-dropzone";
import { CameraCapture } from "@/components/cataract/camera-capture";
import { CataractCropConfirm } from "@/components/cataract/cataract-crop-confirm";
import { CataractResultPanel } from "@/components/cataract/cataract-result-panel";
import { CataractAnalysisDialog } from "@/components/cataract/cataract-analysis-dialog";
import { AnonymousSaveNudge } from "@/components/anonymous-save-nudge";
import { ScreeningWorkspaceShell } from "@/components/screening-workspace-shell";
import type { AnalysisPhase } from "@/components/analysis-dialog";

/** data: URI -> File, so the crop the user just confirmed on
 * CataractCropConfirm can be POSTed through analyzeCataract() exactly like
 * any other upload -- /cataract-crop-preview only ever hands back base64
 * PNG bytes (inference/cataract_engine.py's detect_crop()), never a File. */
function dataUriToFile(dataUri: string, filename: string): File {
  const [meta, b64] = dataUri.split(",");
  const mime = /data:(.*);base64/.exec(meta)?.[1] ?? "image/png";
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

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
    body: "Giữ máy ổn định, lấy nét rõ vào mắt.",
  },
  {
    icon: ScanFace,
    title: "Thấy rõ khuôn mặt",
    body: "Ảnh cần thấy rõ khuôn mặt và mắt để mô hình khoanh vùng chính xác -- tránh cắt mất cạnh ảnh.",
  },
];

const PILLS = ["Không lưu trữ công khai", "Xử lý trong vài giây", "Không dùng để chẩn đoán"];

const DROPZONE_HINT = "hoặc bấm để chọn ảnh cận mặt/mắt — .jpg / .png";

/** Floor on the whole "uploading" -> "done" screen, enforced regardless of
 * how fast analyzeCataract actually resolves -- same convention as /amd,
 * /upload, /multidisease, and /glaucoma's own MIN_LOADING_MS. Only gates
 * the success path: an error still surfaces as soon as it's known. */
const MIN_LOADING_MS = 3000;

/** /cataract -- a standalone entry point for the cataract specialist model
 * (inference/cataract_engine.py: YuNet face detection -> eye-ROI crop,
 * then the same seresnext50_32x4d shape glaucoma/AMD use). The ONE
 * screening feature here that does NOT take a fundus photo -- it wants a
 * close-up face/eye shot instead (inference/cataract_engine.py's own
 * docstring: "the first task in this system that does NOT use fundus
 * photos") -- so the copy below and UploadDropzone's `hint` override both
 * say so explicitly instead of leaving every other page's fundus-photo
 * wording in place, which would be actively misleading here.
 *
 * Same dual-shell chrome as /upload, /multidisease, and /glaucoma -- a
 * logged-in visitor gets the workspace shell (AppNavCard, mobile AppHeader,
 * floating Home, split page header), an anonymous visitor gets the plain
 * "← Trang chủ" + OtherModelsNav header -- now factored into
 * ScreeningWorkspaceShell (components/screening-workspace-shell.tsx) rather
 * than a fifth copy of the same ~45 lines those three pages used to each
 * carry independently; see that component's own header comment. `useAuth`
 * is also used for one thing beyond that: hiding AnonymousSaveNudge for a
 * logged-in visitor, since `analyzeCataract` (lib/cataract.ts) calls the
 * REAL /api/cataract route (Cloudinary + a CataractScreening row when
 * logged in), not a client-side fake -- the nudge would otherwise wrongly
 * tell an already-saved visitor to sign up to save what's already saved.
 * /amd's threshold-advice result panel and specialist loading dialog
 * conventions are carried over here too, rather than the plain-disclaimer/
 * generic-dialog shape glaucoma still uses -- see components/cataract/
 * cataract-result-panel.tsx and cataract-analysis-dialog.tsx for why those
 * fit this model's own caveats (config/cataract/config.json's
 * "known_caveats") better. */
export default function CataractPage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  // Two ways to get a File into handleFile below: pick one from disk
  // (UploadDropzone) or capture one live (CameraCapture, getUserMedia +
  // canvas -- see that component's own header comment for why this needs
  // zero changes on the inference side). Purely a web-layer choice.
  const [captureMode, setCaptureMode] = useState<"upload" | "camera">("upload");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<CataractResult | null>(null);
  // Set once /cataract-crop-preview returns, cleared once the user either
  // confirms (-> runScreen) or retakes (-> backToCapture). Non-null is what
  // switches the page into the confirm-crop view below -- see uploadOrResult.
  const [pendingCrop, setPendingCrop] = useState<{ croppedPng: string; eyeCropApplied: boolean } | null>(null);
  const fileRef = useRef<File | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Whichever async step last failed (crop-preview or the actual classify
  // call) -- the single CataractAnalysisDialog below is shared by both, so
  // its one onRetry needs to know which one to re-run.
  const retryRef = useRef<() => void>(() => {});

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Second half of the confirm-before-classify flow (plans/archetechture.txt):
  // takes the crop the user just approved on CataractCropConfirm and runs
  // the actual model on it, with already_cropped=true so inference/
  // cataract_engine.py classifies it as-is instead of re-running YuNet.
  // retryRef is set by callers (handleConfirmCrop), not here -- referencing
  // this function's own name from inside its body before the `const`
  // finishes assigning is fragile (react-hooks/immutability).
  const runScreen = useCallback((file: File, precropped: { eyeCropApplied: boolean }) => {
    setError(null);
    setResult(null);
    setPhase("uploading");
    const startedAt = Date.now();
    timerRef.current = setTimeout(() => setPhase((p) => (p === "uploading" ? "processing" : p)), 500);
    (async () => {
      try {
        const screened = await analyzeCataract(file, precropped);
        const remaining = MIN_LOADING_MS - (Date.now() - startedAt);
        if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
        clearTimeout(timerRef.current);
        setPendingCrop(null);
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
    })();
  }, []);

  // First half: CLIP modality gate + YuNet crop only, no classification yet
  // -- see inference/main.py's /cataract-crop-preview. Reuses the same
  // dialog's "uploading" phase since this IS a brief upload+detect step; it
  // never advances to "processing" (no fake sub-narrative needed for
  // something this quick) and closes back to idle once the crop is ready
  // for the user to review, rather than continuing on to "done". retryRef
  // is set by handleFile below, same reasoning as runScreen above.
  const runCropPreview = useCallback((file: File) => {
    setError(null);
    setPendingCrop(null);
    setPhase("uploading");
    (async () => {
      try {
        const preview = await previewCataractCrop(file);
        setPhase("idle");
        setPendingCrop(preview);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Không thể xử lý ảnh, thử lại nhé.";
        setError(message);
        setPhase("error");
        notifyError(message);
      }
    })();
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      fileRef.current = file;
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      retryRef.current = () => runCropPreview(file);
      runCropPreview(file);
    },
    [runCropPreview]
  );

  const handleConfirmCrop = useCallback(() => {
    if (!pendingCrop) return;
    const croppedFile = dataUriToFile(pendingCrop.croppedPng, "cataract-crop.png");
    // From here on, the crop the user approved -- not the original upload --
    // is "the photo" for the rest of this screen (analysis dialog + result
    // panel), since that's the exact image actually being classified.
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return pendingCrop.croppedPng;
    });
    const precropped = { eyeCropApplied: pendingCrop.eyeCropApplied };
    retryRef.current = () => runScreen(croppedFile, precropped);
    runScreen(croppedFile, precropped);
  }, [pendingCrop, runScreen]);

  const backToCapture = useCallback(() => {
    setPendingCrop(null);
    setError(null);
    setPhase("idle");
    fileRef.current = null;
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    backToCapture();
  }, [backToCapture]);

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
      {result ? (
        <motion.div
          key="result"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full overflow-hidden rounded-[2rem] border border-border/60 bg-linear-to-br from-secondary/70 via-background to-background sm:rounded-[2.75rem]"
        >
          <CataractResultPanel imageUrl={previewUrl} imageAlt="Vùng mắt đã phân tích" result={result} onReset={reset} />
          {!user && <AnonymousSaveNudge />}
        </motion.div>
      ) : pendingCrop ? (
        <motion.div
          key="confirm-crop"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-border/60 bg-linear-to-br from-secondary/70 via-background to-background sm:rounded-[2.75rem]"
        >
          <CataractCropConfirm
            croppedPng={pendingCrop.croppedPng}
            eyeCropApplied={pendingCrop.eyeCropApplied}
            onConfirm={handleConfirmCrop}
            onRetake={backToCapture}
          />
        </motion.div>
      ) : (
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
            style={{ background: "radial-gradient(circle, var(--color-sev-1) 0%, transparent 70%)" }}
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
                Fundas · Sàng lọc đục thủy tinh thể
              </motion.p>
              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
              >
                Đục thủy tinh thể làm mờ dần thị lực — sàng lọc từ một ảnh cận mắt
              </motion.h1>
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground"
              >
                Khác với các sàng lọc còn lại, tính năng này dùng ảnh <strong className="text-foreground">chụp cận mặt/mắt</strong> (như
                ảnh selfie cận cảnh) — <strong className="text-foreground">không phải</strong> ảnh soi đáy mắt. Mô hình tự động
                nhận diện khuôn mặt và khoanh vùng mắt trước khi phân tích.
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
              <div className="flex gap-1 rounded-full border border-border bg-secondary p-1">
                {(
                  [
                    ["upload", "Tải ảnh lên"],
                    ["camera", "Dùng camera"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={phase !== "idle"}
                    onClick={() => setCaptureMode(mode)}
                    className={cn(
                      "rounded-full px-4 py-1.5 font-condensed text-[11px] uppercase tracking-[0.2em] transition-colors disabled:cursor-not-allowed",
                      captureMode === mode
                        ? "bg-card text-gold-deep shadow-bubble"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {captureMode === "upload" ? (
                <UploadDropzone onFile={handleFile} disabled={phase !== "idle"} hint={DROPZONE_HINT} />
              ) : (
                <CameraCapture onCapture={handleFile} disabled={phase !== "idle"} />
              )}
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
      )}
    </AnimatePresence>
  );

  return (
    <ScreeningWorkspaceShell
      user={user}
      eyebrow="Fundas · Sàng lọc đục thủy tinh thể"
      title="Đục thủy tinh thể"
      otherModelsCurrent="cataract"
      content={uploadOrResult}
    >
      <CataractAnalysisDialog
        phase={phase}
        error={error}
        previewUrl={previewUrl}
        onRetry={() => retryRef.current()}
        onChooseAnother={backToCapture}
      />
    </ScreeningWorkspaceShell>
  );
}
