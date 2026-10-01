import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/server/prisma";
import { DISEASE_LABELS, type DiseaseLabel } from "@/lib/multidisease";
import { DoctorScreeningView } from "@/components/doctor/doctor-screening-view";

export default async function DoctorScreeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const screening = await prisma.multidiseaseScreening.findUnique({
    where: { id },
    include: { user: { select: { fullName: true } } },
  });
  if (!screening) notFound();

  const probs = screening.probs as Record<DiseaseLabel, number>;
  const top3 = [...DISEASE_LABELS]
    .sort((a, b) => probs[b] - probs[a])
    .slice(0, 3)
    .map((label) => ({ label, prob: probs[label] }));

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border pb-7">
        <div>
          <p className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">Fundas · Bàn khám</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {screening.user.fullName}
          </h1>
        </div>
        <Link
          href="/doctor/queue"
          className="font-condensed text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-teal-deep"
        >
          ← Về hàng đợi
        </Link>
      </div>

      <DoctorScreeningView
        caseId={screening.id}
        result={{
          topLabel: screening.topLabel as DiseaseLabel,
          topProb: screening.topProb,
          top3,
          probs,
          modelVersion: screening.modelVersion,
          isExperimental: true,
          cloudUrl: screening.cloudUrl,
        }}
      />
    </>
  );
}
