"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Microscope } from "lucide-react";

import { getScan, GRADE_COLORS, GRADE_EXPLANATIONS, type ScanResult } from "@/lib/api";
import { screenExistingScan } from "@/lib/multidisease";
import { ScopeFrame } from "@/components/scope-frame";
import { ScanResultPanel } from "@/components/scan-result-panel";
import { Button } from "@/components/ui/button";

export default function ResultsPage(props: PageProps<"/results/[imageId]">) {
  const { imageId } = use(props.params);
  const router = useRouter();

  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const [screening, setScreening] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getScan(imageId)
      .then((s) => {
        if (!cancelled) setScan(s);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Không tìm thấy ảnh.");
      });
    return () => {
      cancelled = true;
    };
  }, [imageId]);

  const isFailed = scan?.status === "failed" || !!loadError;
  const result = scan && scan.status === "done" ? scan : null;
  const gradeColor = result ? GRADE_COLORS[result.grade] : "var(--color-border)";

  // plans/plan_multidisease.txt section 4.3: re-screen this same photo for
  // the 8-class multi-disease model instead of asking for it again --
  // /api/multidisease re-fetches the image server-side from this scan's own
  // Cloudinary URL. Navigates straight to the new screening's own detail
  // page rather than rendering a second result inline here (that's a
  // different model with a different confidence level -- plan section 2 --
  // so it gets its own page, not a second panel bolted onto this one).
  async function handleScreenMultidisease() {
    setScreenError(null);
    setScreening(true);
    try {
      const screened = await screenExistingScan(imageId);
      if (screened.id) {
        router.push(`/multidisease/${screened.id}`);
        return;
      }
      setScreenError("Không lưu được kết quả, vui lòng thử lại.");
    } catch (e) {
      setScreenError(e instanceof Error ? e.message : "Không thể sàng lọc thêm, thử lại nhé.");
    } finally {
      setScreening(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* /results/[imageId] is only ever reached by clicking a saved exam
          on /history (an anonymous /upload result is shown inline, never
          persisted, so there's no history to click into) -- "back" always
          means /history, not another upload. */}
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
        {!result ? (
          // Edge case: direct link / refresh while still processing, or a
          // failed job. The primary "please wait" experience already
          // happened in the upload modal, so this can stay simple.
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 py-20 text-center">
            <ScopeFrame
              size={260}
              ringColor={isFailed ? "var(--color-sev-4)" : "var(--color-border)"}
              interiorClassName="bg-linear-to-br from-secondary to-background"
            >
              {isFailed ? (
                <div className="flex h-full w-full items-center justify-center px-6 text-center font-mono text-xs text-sev-4">
                  LỖI XỬ LÝ
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center px-6 text-center">
                  <span className="animate-pulse font-mono text-xs tracking-wide text-teal-deep">
                    ĐANG PHÂN TÍCH…
                  </span>
                </div>
              )}
            </ScopeFrame>
            {isFailed && (
              <p className="max-w-sm font-mono text-sm text-sev-4">
                {scan?.error ?? loadError ?? "Có lỗi xảy ra trong lúc xử lý ảnh."}
              </p>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-linear-to-br from-secondary/70 via-background to-background sm:rounded-[2.75rem]"
          >
            <ScanResultPanel
              imageUrl={scan?.cloudUrl}
              imageAlt="Ảnh đáy mắt đã tải lên"
              imagePriority
              gradeColor={gradeColor}
              grade={result.grade}
              explanation={GRADE_EXPLANATIONS[result.grade]}
              backboneScores={result.backboneScores}
              doctorReview={result.doctorReview}
              showTechnical={showTechnical}
              onToggleTechnical={() => setShowTechnical((v) => !v)}
              actionsLeft={
                <div className="flex flex-col gap-1.5">
                  <Button variant="outline" onClick={handleScreenMultidisease} disabled={screening}>
                    <Microscope className="h-4 w-4" data-icon="inline-start" />
                    {screening ? "Đang sàng lọc…" : "Sàng lọc thêm các bệnh khác"}
                  </Button>
                  {screenError && <p className="text-xs text-sev-4">{screenError}</p>}
                </div>
              }
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
