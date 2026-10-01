"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import { getMultidiseaseScreening, type MultiDiseaseDetail } from "@/lib/multidisease";
import { analyzeGlaucomaFromScreening, type GlaucomaResult } from "@/lib/glaucoma";
import { ScopeFrame } from "@/components/scope-frame";
import { MultidiseaseResultPanel } from "@/components/multidisease/result-panel";
import { GlaucomaResultDialog } from "@/components/glaucoma/glaucoma-result-dialog";
import { AnalysisDialog, type AnalysisPhase } from "@/components/analysis-dialog";

/** The multi-disease equivalent of /results/[imageId] -- reached only by
 * clicking a saved entry in /history's "Sàng lọc đa bệnh" section (this
 * feature has no anonymous-persisted flow, so there's no other way in).
 * Same shell as the DR results page: a loading/failed ScopeFrame state,
 * then the full result panel once loaded. `onReset` here means "start a
 * new screen" (navigate to /multidisease) rather than clearing local
 * state, since MultidiseaseResultPanel doesn't know it's being reused for
 * a saved result instead of a just-finished one. */
export default function MultidiseaseResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [screening, setScreening] = useState<MultiDiseaseDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Glaucoma deep-dive (plans/plan_glaucoma.txt) -- same as /multidisease's
  // own state, but there's no File here (this page only ever has a saved
  // screening's cloudUrl), so the API call reuses that image server-side
  // instead (lib/glaucoma.ts's analyzeGlaucomaFromScreening).
  const [glaucomaPhase, setGlaucomaPhase] = useState<AnalysisPhase>("idle");
  const [glaucomaError, setGlaucomaError] = useState<string | null>(null);
  const [glaucomaResult, setGlaucomaResult] = useState<GlaucomaResult | null>(null);

  const runGlaucomaAnalysis = useCallback(async () => {
    setGlaucomaError(null);
    setGlaucomaResult(null);
    setGlaucomaPhase("processing");
    try {
      const analyzed = await analyzeGlaucomaFromScreening(id);
      setGlaucomaPhase("idle");
      setGlaucomaResult(analyzed);
    } catch (e) {
      setGlaucomaError(e instanceof Error ? e.message : "Có lỗi xảy ra, thử lại nhé.");
      setGlaucomaPhase("error");
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    getMultidiseaseScreening(id)
      .then((s) => {
        if (!cancelled) setScreening(s);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Không tìm thấy kết quả.");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex w-full items-center justify-between px-6 py-5 sm:px-12">
        <Link
          href="/history"
          className="font-condensed text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-teal-deep"
        >
          ← Về sổ khám mắt
        </Link>
        <Link href="/" className="font-display text-sm font-semibold tracking-tight text-foreground">
          Fundas
        </Link>
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pb-16 sm:px-6">
        {!screening ? (
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 py-20 text-center">
            <ScopeFrame
              size={260}
              ringColor={loadError ? "var(--color-sev-4)" : "var(--color-border)"}
              interiorClassName="bg-linear-to-br from-secondary to-background"
            >
              {loadError ? (
                <div className="flex h-full w-full items-center justify-center px-6 text-center font-mono text-xs text-sev-4">
                  LỖI TẢI DỮ LIỆU
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center px-6 text-center">
                  <span className="animate-pulse font-mono text-xs tracking-wide text-teal-deep">ĐANG TẢI…</span>
                </div>
              )}
            </ScopeFrame>
            {loadError && <p className="max-w-sm font-mono text-sm text-sev-4">{loadError}</p>}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-linear-to-br from-secondary/70 via-background to-background sm:rounded-[2.75rem]"
          >
            <MultidiseaseResultPanel
              imageUrl={screening.cloudUrl}
              imageAlt="Ảnh đáy mắt đã sàng lọc"
              result={screening}
              onReset={() => router.push("/multidisease")}
              onAnalyzeGlaucoma={runGlaucomaAnalysis}
            />
          </motion.div>
        )}
      </main>

      <AnalysisDialog
        phase={glaucomaPhase}
        error={glaucomaError}
        previewUrl={screening?.cloudUrl ?? null}
        onRetry={runGlaucomaAnalysis}
        onChooseAnother={() => setGlaucomaPhase("idle")}
      />
      <GlaucomaResultDialog
        result={glaucomaResult}
        imageUrl={screening?.cloudUrl}
        imageAlt="Ảnh đáy mắt đã sàng lọc"
        onOpenChange={(open) => !open && setGlaucomaResult(null)}
      />
    </div>
  );
}
