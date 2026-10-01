import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/server/prisma";
import { DoctorCaseView } from "@/components/doctor/doctor-case-view";

export default async function DoctorCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const scan = await prisma.scan.findUnique({
    where: { id },
    include: { user: { select: { fullName: true, email: true } } },
  });
  if (!scan) notFound();

  // Screenings run against THIS same photo via the scan-reuse path (plans/
  // plan_multidisease.txt section 4.3, /api/multidisease's `scanId` branch)
  // -- not every screening this patient has ever done, just the ones tied
  // to this specific exam.
  const linkedScreenings = await prisma.multidiseaseScreening.findMany({
    where: { scanId: scan.id },
    orderBy: { createdAt: "desc" },
    include: { screeningReview: { select: { id: true } } },
  });

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border pb-7">
        <div>
          <p className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">Fundas · Bàn khám</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{scan.user.fullName}</h1>
        </div>
        <Link
          href="/doctor/queue"
          className="font-condensed text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-teal-deep"
        >
          ← Về hàng đợi
        </Link>
      </div>

      <DoctorCaseView
        scan={{
          id: scan.id,
          cloudUrl: scan.cloudUrl,
          grade: scan.grade,
          backboneScores: scan.backboneScores as Record<string, number>,
          qualityLabel: scan.qualityLabel,
        }}
        linkedScreenings={linkedScreenings.map((s) => ({
          id: s.id,
          topLabel: s.topLabel,
          topProb: s.topProb,
          createdAt: s.createdAt.toISOString(),
          reviewed: s.screeningReview !== null,
        }))}
      />
    </>
  );
}
