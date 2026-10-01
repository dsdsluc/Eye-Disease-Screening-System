import Link from "next/link";
import { ArrowRight, Microscope } from "lucide-react";

import { prisma } from "@/lib/server/prisma";
import { GRADE_COLORS, GRADE_LABELS } from "@/lib/api";

/** "Bàn khám" -- back to the light "glossy" card language every other
 * /doctor/* page already uses (patients/queue/case), not an invented
 * one-off look: a dark instrument-panel console was tried and rejected as
 * too heavy, then a plain-text-only version tried and felt like it had no
 * design left. This lands in between -- one gradient-wash hero card (the
 * same treatment ScanResultPanel/DoctorScreeningView wrap their photo in,
 * components/scan-result-panel.tsx) leading with the one number that says
 * "how busy am I" (ca chưa xử lý -- the same definition Hàng đợi itself
 * uses), then two smaller supporting cards side by side below -- the same
 * equal-width two-column shape the patient chart's own history grid uses
 * (app/doctor/patients/[id]/page.tsx), not three same-weight stat tiles in
 * a row. No shortcut-tile grid -- DoctorNavCard/DoctorHeader already cover
 * navigation on every /doctor page. */
export default async function DoctorDashboardPage() {
  const [
    patientCount,
    scanCount,
    screeningCount,
    glaucomaCount,
    cataractCount,
    pendingScans,
    pendingScreenings,
    pendingGlaucoma,
    pendingCataract,
    gradeGroups,
    recentScans,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "patient" } }),
    prisma.scan.count(),
    prisma.multidiseaseScreening.count(),
    prisma.glaucomaScreening.count(),
    prisma.cataractScreening.count(),
    prisma.scan.count({ where: { doctorReview: null } }),
    prisma.multidiseaseScreening.count({ where: { screeningReview: null } }),
    prisma.glaucomaScreening.count({ where: { glaucomaReview: null } }),
    prisma.cataractScreening.count({ where: { cataractReview: null } }),
    prisma.scan.groupBy({ by: ["grade"], _count: { _all: true } }),
    prisma.scan.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { fullName: true } } },
    }),
  ]);

  const pendingCount = pendingScans + pendingScreenings + pendingGlaucoma + pendingCataract;
  const gradeCounts = new Map(gradeGroups.map((g) => [g.grade, g._count._all]));

  return (
    <>
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-7">
        <p className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">Fundas · Bàn khám</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Bàn khám</h1>
      </div>

      <div className="glossy shadow-bubble overflow-hidden rounded-[2rem] border border-border/60 bg-linear-to-br from-secondary/70 via-background to-background sm:rounded-[2.75rem]">
        <Link href="/doctor/queue" className="group flex flex-wrap items-center justify-between gap-4 px-8 py-8 sm:px-10">
          <div>
            <p className="font-condensed text-xs uppercase tracking-[0.25em] text-sev-3">Cần xử lý</p>
            <p className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
              <span className="font-mono">{pendingCount}</span> ca đang chờ trong Hàng đợi
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors group-hover:bg-secondary">
            Xem hàng đợi
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.75} />
          </span>
        </Link>

        <div className="grid grid-cols-3 divide-x divide-border border-t border-border/70 sm:grid-cols-5">
          <div className="px-6 py-5 text-center">
            <p className="font-mono text-xl font-semibold text-foreground">{patientCount}</p>
            <p className="mt-0.5 font-condensed text-[9px] uppercase tracking-wider text-muted-foreground">Bệnh nhân</p>
          </div>
          <div className="px-6 py-5 text-center">
            <p className="font-mono text-xl font-semibold text-foreground">{scanCount}</p>
            <p className="mt-0.5 font-condensed text-[9px] uppercase tracking-wider text-muted-foreground">Võng mạc</p>
          </div>
          <div className="px-6 py-5 text-center">
            <p className="font-mono text-xl font-semibold text-foreground">{screeningCount}</p>
            <p className="mt-0.5 font-condensed text-[9px] uppercase tracking-wider text-muted-foreground">Đa bệnh</p>
          </div>
          <div className="px-6 py-5 text-center">
            <p className="font-mono text-xl font-semibold text-foreground">{glaucomaCount}</p>
            <p className="mt-0.5 font-condensed text-[9px] uppercase tracking-wider text-muted-foreground">Tăng nhãn áp</p>
          </div>
          <div className="px-6 py-5 text-center">
            <p className="font-mono text-xl font-semibold text-foreground">{cataractCount}</p>
            <p className="mt-0.5 font-condensed text-[9px] uppercase tracking-wider text-muted-foreground">Đục T.T.T</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glossy shadow-bubble rounded-2xl border border-border/60 bg-card px-6 py-6">
          <p className="font-condensed text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Phân bố mức độ võng mạc tiểu đường
          </p>
          {scanCount === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Chưa có dữ liệu.</p>
          ) : (
            <>
              <p className="mt-1 text-xs text-muted-foreground">Tổng {scanCount} ca</p>

              {/* Stacked proportion bar -- a 2px surface gap between segments
                  (gap-0.5) instead of touching fills, each segment rounded so
                  the gap reads as a real cut, not a stray hairline. */}
              <div className="mt-4 flex h-2.5 w-full gap-0.5">
                {[0, 1, 2, 3, 4].map((grade) => {
                  const count = gradeCounts.get(grade) ?? 0;
                  if (count === 0) return null;
                  return (
                    <div
                      key={grade}
                      className="first:rounded-l-full last:rounded-r-full"
                      style={{ flexGrow: count, backgroundColor: GRADE_COLORS[grade] }}
                      title={`${GRADE_LABELS[grade]}: ${count} (${Math.round((count / scanCount) * 100)}%)`}
                    />
                  );
                })}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                {[0, 1, 2, 3, 4].map((grade) => {
                  const count = gradeCounts.get(grade) ?? 0;
                  const pct = Math.round((count / scanCount) * 100);
                  return (
                    <div key={grade} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: GRADE_COLORS[grade] }} />
                        <span className="truncate font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
                          {GRADE_LABELS[grade]}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-xs">
                        <span className="font-semibold text-foreground">{count}</span>
                        <span className="text-muted-foreground"> · {pct}%</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="glossy shadow-bubble rounded-2xl border border-border/60 bg-card">
          <p className="px-6 pt-6 font-condensed text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Gần đây nhất
          </p>
          {recentScans.length === 0 ? (
            <p className="flex items-center gap-2.5 px-6 py-6 text-sm text-muted-foreground">
              <Microscope className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              Chưa có ca sàng lọc nào trong hệ thống.
            </p>
          ) : (
            <div className="mt-3 flex flex-col divide-y divide-border">
              {recentScans.map((scan) => (
                <Link
                  key={scan.id}
                  href={`/doctor/case/${scan.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-3 transition-colors hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{scan.user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{scan.createdAt.toLocaleDateString("vi-VN")}</p>
                  </div>
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold text-white"
                    style={{ backgroundColor: GRADE_COLORS[scan.grade] }}
                  >
                    {scan.grade}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
