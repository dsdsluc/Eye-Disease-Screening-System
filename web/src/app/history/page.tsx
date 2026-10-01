"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ScanLine } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { getMyScans, type ScanSummary } from "@/lib/api";
import { getMyMultidiseaseScreenings, type MultiDiseaseSummary } from "@/lib/multidisease";
import { getMyGlaucomaScreenings, type GlaucomaSummary } from "@/lib/glaucoma";
import { getMyAmdScreenings, type AmdSummary } from "@/lib/amd";
import { getMyCataractScreenings, type CataractSummary } from "@/lib/cataract";
import { AppHeader } from "@/components/app-header";
import { AppNavCard } from "@/components/app-nav-card";
import { WorkspaceHomeButton } from "@/components/workspace-home-button";
import { ScopeFrame } from "@/components/scope-frame";
import { buttonVariants } from "@/components/ui/button";
import { yPercent } from "@/components/history/format";
import { HistoryOverview, type HistoryStats } from "@/components/history/history-overview";
import { InsightRail } from "@/components/history/insight-rail";
import { InsightDialog } from "@/components/history/insight-dialog";
import { ScanCard } from "@/components/history/scan-card";
import { ScreeningHistoryCard } from "@/components/multidisease/screening-history-card";
import { GlaucomaHistoryCard } from "@/components/glaucoma/glaucoma-history-card";
import { AmdHistoryCard } from "@/components/amd/amd-history-card";
import { CataractHistoryCard } from "@/components/cataract/cataract-history-card";
import type { InsightPanel } from "@/components/history/insight-items";

/** Phase 1 (plans/plan_web.txt). Fifth pass. Feedback on pass 4: drop
 * "average consensus" (a real number, but an AI-ensemble internal that
 * means nothing to a patient -- see plans/plan_web.txt for why it looked
 * reasonable on paper anyway); the table's 40px thumbnails were too small
 * to actually see the photo; a huge max-w-6xl centered column wasted the
 * whole left/right edge on a wide monitor; and add a standing nav card
 * (AppNavCard) so History/Upload/Account/Logout are one click away
 * instead of behind AppHeader's dropdown. This pass: wider shell with that
 * nav card filling the left column instead of dead margin, a 3-stat grid
 * (down from 4), and the history list rebuilt as roomy cards with a much
 * bigger photo instead of a cramped data-table row. Sixth pass: split the
 * monolithic page into components/history/* (overview card, insight rail
 * + dialog, progression chart, scan card) -- this file is now just data
 * fetching/shaping plus layout. */
export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [scans, setScans] = useState<ScanSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [screenings, setScreenings] = useState<MultiDiseaseSummary[]>([]);
  const [glaucomaScreenings, setGlaucomaScreenings] = useState<GlaucomaSummary[]>([]);
  const [amdScreenings, setAmdScreenings] = useState<AmdSummary[]>([]);
  const [cataractScreenings, setCataractScreenings] = useState<CataractSummary[]>([]);
  const [openInsight, setOpenInsight] = useState<InsightPanel>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    getMyScans()
      .then(setScans)
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được lịch sử."));
    // Separate, silent fetches -- a failure here (e.g. the feature just
    // isn't used yet) shouldn't block or error out the main DR history above.
    getMyMultidiseaseScreenings()
      .then(setScreenings)
      .catch(() => {});
    getMyGlaucomaScreenings()
      .then(setGlaucomaScreenings)
      .catch(() => {});
    getMyAmdScreenings()
      .then(setAmdScreenings)
      .catch(() => {});
    getMyCataractScreenings()
      .then(setCataractScreenings)
      .catch(() => {});
  }, [authLoading, user, router]);

  const stats: HistoryStats | null = useMemo(() => {
    if (!scans || scans.length === 0) return null;
    const [latest, previous] = scans;
    const delta = previous && latest.grade !== null && previous.grade !== null ? latest.grade - previous.grade : null;
    const lowQualityCount = scans.filter((s) => s.qualityLabel && s.qualityLabel !== "good").length;
    const firstDate = scans[scans.length - 1].createdAt;
    return { total: scans.length, latest, delta, lowQualityCount, firstDate };
  }, [scans]);

  // Chart reads left (oldest) to right (newest) -- API returns newest first.
  const chartPoints = useMemo(() => {
    if (!scans || scans.length < 2) return [];
    const chronological = [...scans].reverse();
    const n = chronological.length;
    return chronological.map((scan, i) => ({
      scan,
      x: 6 + (i / (n - 1)) * 88,
      y: scan.grade !== null ? yPercent(scan.grade) : 50,
    }));
  }, [scans]);

  const pathD = useMemo(() => {
    if (chartPoints.length < 2) return "";
    return chartPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }, [chartPoints]);

  const showAllChartLabels = chartPoints.length <= 8;

  if (authLoading || !user) return null;

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <div className="lg:hidden">
        <AppHeader />
      </div>
      <WorkspaceHomeButton />

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 items-start gap-8 px-4 pt-10 pb-16 sm:px-6 lg:pr-10 lg:pl-[6px]">
        <div className="hidden lg:sticky lg:top-8 lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:gap-6">
          <AppNavCard />
        </div>

        <main className="flex min-w-0 flex-1 flex-col gap-10">
          {/* Page header -- compact, not an oversized hero: the content below
              is what needed to carry more weight, not this banner. No CTA
              here anymore -- "Sàng lọc võng mạc" already lives one click
              away in the nav card, a second copy of the same button had no
              job left to do. The stats readout used to be a tall card in
              the sidebar above; moved here instead since the eyebrow-to-
              heading stretch was otherwise just empty space on anything
              wider than a laptop. Back to items-baseline (not items-center)
              now that the readout is plain text, not a boxed pill -- it
              reads as a third line of header typography sitting on the
              same text baseline as the eyebrow, rather than a component
              floating in the row. */}
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border pb-7">
            <p className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">Fundas · {user.fullName}</p>
            {stats && <HistoryOverview stats={stats} />}
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Sổ khám mắt</h1>
          </div>

          {stats && <InsightRail onSelect={setOpenInsight} />}

          {error && <p className="font-mono text-sm text-sev-4">{error}</p>}

          {scans === null && !error ? (
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          ) : !stats ? (
            <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-linear-to-br from-secondary/70 via-background to-background sm:rounded-[2.75rem]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
                style={{ background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)" }}
              />
              <div className="relative flex flex-col items-center gap-6 px-6 py-20 text-center">
                <ScopeFrame size={180} ringColor="var(--color-border)" interiorClassName="bg-linear-to-br from-secondary to-background">
                  <div className="flex h-full w-full items-center justify-center">
                    <ScanLine className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                </ScopeFrame>
                <div>
                  <p className="text-lg font-semibold text-foreground">Sổ khám mắt của bạn còn trống</p>
                  <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                    Tải ảnh đáy mắt đầu tiên để bắt đầu theo dõi diễn tiến qua từng lần chụp.
                  </p>
                </div>
                <Link
                  href="/upload"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "glossy shadow-bubble h-12 rounded-full px-7 text-base transition-transform hover:scale-[1.03] active:scale-[0.98]"
                  )}
                >
                  Tải ảnh đầu tiên
                  <ArrowRight className="h-4 w-4" data-icon="inline-end" />
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {/* Full history -- exam plates, not table rows. Grid of 2 per
                  row on desktop, 1 on mobile. Leads the page (ahead of the
                  progression chart, which now lives in the report dialog):
                  the exams themselves are the primary content. Named for
                  what it actually holds ("Toàn bộ lịch sử" -- the whole
                  history -- stopped being accurate once the multi-disease
                  section below became a second history list on this same
                  page). */}
              <p className="mb-4 font-condensed text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Lịch sử sàng lọc võng mạc — {stats.total} lần
              </p>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {scans!.map((scan, i) => (
                  <ScanCard key={scan.imageId} scan={scan} userFullName={user.fullName} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* A separate SECTION, not merged into the grid above -- per
              plans/plan_multidisease.txt section 2, this experimental
              feature's history must stay clearly labeled apart from DR
              exams. The cards themselves now match ScanCard's own layout
              (same photo size, grid, hover affordance) so the two sections
              read as one consistent system; the "Thử nghiệm" pill on each
              card is what still carries the lower-confidence signal, not a
              different visual language. Hidden entirely when empty rather
              than showing an empty state: unlike DR screening, trying this
              feature isn't the point of a first visit to /history. */}
          {screenings.length > 0 && (
            <div>
              <p className="mb-4 font-condensed text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Sàng lọc đa bệnh (thử nghiệm) — {screenings.length} lần
              </p>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {screenings.map((screening, i) => (
                  <ScreeningHistoryCard key={screening.id} screening={screening} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Same "separate section, hidden when empty" treatment as
              multi-disease above -- glaucoma is its own specialist model
              (inference/glaucoma_engine.py), not the multidisease screen's
              own "glaucoma" softmax class, so its history stays apart from
              both the DR exams and the multidisease section rather than
              being folded into either. */}
          {glaucomaScreenings.length > 0 && (
            <div>
              <p className="mb-4 font-condensed text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Sàng lọc tăng nhãn áp — {glaucomaScreenings.length} lần
              </p>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {glaucomaScreenings.map((screening, i) => (
                  <GlaucomaHistoryCard key={screening.id} screening={screening} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Same "separate section, hidden when empty" treatment as
              multi-disease/glaucoma above -- AMD is its own specialist model
              (inference/amd_engine.py), not one of multidisease's own
              softmax classes, so its history stays apart rather than being
              folded into either. */}
          {amdScreenings.length > 0 && (
            <div>
              <p className="mb-4 font-condensed text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Sàng lọc thoái hóa điểm vàng — {amdScreenings.length} lần
              </p>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {amdScreenings.map((screening, i) => (
                  <AmdHistoryCard key={screening.id} screening={screening} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Same "separate section, hidden when empty" treatment as
              multi-disease/glaucoma above -- cataract is its own specialist
              model (inference/cataract_engine.py) with its own caveats
              (config/cataract/config.json's "known_caveats"), the one
              feature here that isn't even a fundus photo, so its history
              stays apart from the others rather than being folded in. */}
          {cataractScreenings.length > 0 && (
            <div>
              <p className="mb-4 font-condensed text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Sàng lọc đục thủy tinh thể — {cataractScreenings.length} lần
              </p>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {cataractScreenings.map((screening, i) => (
                  <CataractHistoryCard key={screening.id} screening={screening} index={i} />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      <InsightDialog
        open={openInsight}
        onOpenChange={(open) => !open && setOpenInsight(null)}
        chart={stats ? { chartPoints, pathD, showAllChartLabels, latestScan: stats.latest } : null}
      />
    </div>
  );
}
