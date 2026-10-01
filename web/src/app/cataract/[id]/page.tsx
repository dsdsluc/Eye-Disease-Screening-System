"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import { getCataractScreening, type CataractDetail } from "@/lib/cataract";
import { ScopeFrame } from "@/components/scope-frame";
import { CataractResultPanel } from "@/components/cataract/cataract-result-panel";

/** The cataract equivalent of /glaucoma/[id] -- reached only from
 * /history's "Sàng lọc đục thủy tinh thể" section (this feature has no
 * anonymous-persisted flow, so there's no other way in). Same shell as
 * glaucoma's saved-result page: a loading/failed ScopeFrame state, then the
 * full result panel once loaded. `onReset` here means "start a new screen"
 * (navigate to /cataract) rather than clearing local state, since
 * CataractResultPanel doesn't know it's being reused for a saved result
 * instead of a just-finished one. */
export default function CataractResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [screening, setScreening] = useState<CataractDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCataractScreening(id)
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
            <CataractResultPanel
              imageUrl={screening.cloudUrl}
              imageAlt="Ảnh đã sàng lọc"
              result={screening}
              onReset={() => router.push("/cataract")}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
