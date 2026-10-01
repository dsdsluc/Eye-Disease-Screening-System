import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/server/prisma";
import type { CataractLabel } from "@/lib/cataract";
import { DoctorCataractView } from "@/components/doctor/doctor-cataract-view";

export default async function DoctorCataractScreeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const screening = await prisma.cataractScreening.findUnique({
    where: { id },
    include: { user: { select: { fullName: true } } },
  });
  if (!screening) notFound();

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

      <DoctorCataractView
        caseId={screening.id}
        result={{
          label: screening.label as CataractLabel,
          probCataract: screening.probCataract,
          eyeCropApplied: screening.eyeCropApplied,
          modelVersion: screening.modelVersion,
          isExperimental: true,
          cloudUrl: screening.cloudUrl,
        }}
      />
    </>
  );
}
