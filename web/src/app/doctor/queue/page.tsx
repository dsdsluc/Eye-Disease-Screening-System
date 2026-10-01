import { ScanLine, Search } from "lucide-react";

import { prisma } from "@/lib/server/prisma";
import { ScopeFrame } from "@/components/scope-frame";
import { QueueCard } from "@/components/doctor/queue-card";
import { ScreeningQueueCard } from "@/components/doctor/screening-queue-card";
import { GlaucomaQueueCard } from "@/components/doctor/glaucoma-queue-card";
import { CataractQueueCard } from "@/components/doctor/cataract-queue-card";

/** "Hàng đợi" -- four SEPARATE lists, not one merged feed: "Sàng lọc võng
 * mạc" (DR scans), "Sàng lọc đa bệnh" (every unprocessed multi-disease
 * screening, standalone OR linked to a Scan -- a screening tied to a scan
 * is its own review item now, not just a badge on that scan's card, so a
 * single upload with both a DR grade and a multi-disease read produces TWO
 * queue entries, one per model, each independently reviewable), "Sàng lọc
 * tăng nhãn áp", and "Sàng lọc đục thủy tinh thể" (the two specialist models
 * added once GlaucomaReview/CataractReview -- schema.prisma -- gave them
 * somewhere to go). Keeping all four in separate sections, not interleaved
 * by date, is the same never-equal-confidence language the rest of this
 * feature uses everywhere it sits next to a DR result (doctor-case-view.tsx,
 * ScreeningHistoryCard).
 *
 * Only unprocessed cases show up here at all -- a Scan with a DoctorReview
 * row, or a screening with its own *Review row (schema.prisma), already has
 * its doctor confirmation chốt, so it drops off the queue entirely rather
 * than sticking around in a collapsed section. */
export default async function DoctorQueuePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const patientFilter = query
    ? { user: { OR: [{ fullName: { contains: query, mode: "insensitive" as const } }, { email: { contains: query, mode: "insensitive" as const } }] } }
    : {};

  const [scans, screenings, glaucomaScreenings, cataractScreenings] = await Promise.all([
    prisma.scan.findMany({
      where: { doctorReview: null, ...patientFilter },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { fullName: true, email: true } },
        _count: { select: { multidiseaseScreenings: true } },
      },
    }),
    prisma.multidiseaseScreening.findMany({
      where: { screeningReview: null, ...patientFilter },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { fullName: true, email: true } } },
    }),
    prisma.glaucomaScreening.findMany({
      where: { glaucomaReview: null, ...patientFilter },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { fullName: true, email: true } } },
    }),
    prisma.cataractScreening.findMany({
      where: { cataractReview: null, ...patientFilter },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { fullName: true, email: true } } },
    }),
  ]);

  const isEmpty =
    scans.length === 0 && screenings.length === 0 && glaucomaScreenings.length === 0 && cataractScreenings.length === 0;

  return (
    <>
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-7">
        <p className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">Fundas · Bàn khám</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Hàng đợi</h1>
      </div>

      <form action="/doctor/queue" className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Lọc theo tên hoặc email bệnh nhân..."
          className="h-12 w-full rounded-full border border-border bg-card pr-4 pl-11 text-sm text-foreground outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </form>

      {isEmpty ? (
        <div className="flex flex-col items-center gap-6 rounded-[2rem] border border-border/60 bg-linear-to-br from-secondary/70 via-background to-background px-6 py-20 text-center sm:rounded-[2.75rem]">
          <ScopeFrame size={140} ringColor="var(--color-border)" interiorClassName="bg-linear-to-br from-secondary to-background">
            <div className="flex h-full w-full items-center justify-center">
              <ScanLine className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
          </ScopeFrame>
          <p className="text-sm text-muted-foreground">
            {query ? `Không có ca nào đang chờ khớp với "${query}".` : "Chưa có ca nào đang chờ xử lý."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {scans.length > 0 && (
            <div>
              <p className="mb-4 font-condensed text-xs uppercase tracking-[0.2em] text-teal-deep">
                Sàng lọc võng mạc · {scans.length} ca chờ xử lý
              </p>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {scans.map((scan, i) => (
                  <QueueCard
                    key={scan.id}
                    index={i}
                    scan={{
                      id: scan.id,
                      cloudUrl: scan.cloudUrl,
                      grade: scan.grade,
                      score: scan.score,
                      backboneScores: scan.backboneScores as Record<string, number>,
                      qualityLabel: scan.qualityLabel,
                      createdAt: scan.createdAt.toISOString(),
                      patientName: scan.user.fullName,
                      patientEmail: scan.user.email,
                      screeningCount: scan._count.multidiseaseScreenings,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {screenings.length > 0 && (
            <div>
              <p className="mb-4 font-condensed text-xs uppercase tracking-[0.2em] text-gold-deep">
                Sàng lọc đa bệnh (thử nghiệm) · {screenings.length} ca chờ xử lý
              </p>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {screenings.map((screening, i) => (
                  <ScreeningQueueCard
                    key={screening.id}
                    index={i}
                    screening={{
                      id: screening.id,
                      cloudUrl: screening.cloudUrl,
                      topLabel: screening.topLabel,
                      topProb: screening.topProb,
                      createdAt: screening.createdAt.toISOString(),
                      patientName: screening.user.fullName,
                      patientEmail: screening.user.email,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {glaucomaScreenings.length > 0 && (
            <div>
              <p className="mb-4 font-condensed text-xs uppercase tracking-[0.2em] text-teal-deep">
                Sàng lọc tăng nhãn áp · {glaucomaScreenings.length} ca chờ xử lý
              </p>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {glaucomaScreenings.map((screening, i) => (
                  <GlaucomaQueueCard
                    key={screening.id}
                    index={i}
                    screening={{
                      id: screening.id,
                      cloudUrl: screening.cloudUrl,
                      label: screening.label,
                      probGlaucoma: screening.probGlaucoma,
                      createdAt: screening.createdAt.toISOString(),
                      patientName: screening.user.fullName,
                      patientEmail: screening.user.email,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {cataractScreenings.length > 0 && (
            <div>
              <p className="mb-4 font-condensed text-xs uppercase tracking-[0.2em] text-sev-1">
                Sàng lọc đục thủy tinh thể · {cataractScreenings.length} ca chờ xử lý
              </p>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {cataractScreenings.map((screening, i) => (
                  <CataractQueueCard
                    key={screening.id}
                    index={i}
                    screening={{
                      id: screening.id,
                      cloudUrl: screening.cloudUrl,
                      probCataract: screening.probCataract,
                      eyeCropApplied: screening.eyeCropApplied,
                      createdAt: screening.createdAt.toISOString(),
                      patientName: screening.user.fullName,
                      patientEmail: screening.user.email,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
