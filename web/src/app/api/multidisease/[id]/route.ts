import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const screening = await prisma.multidiseaseScreening.findUnique({
    where: { id },
    include: { screeningReview: { include: { doctor: { select: { fullName: true } } } } },
  });
  // Not found AND not-yours both 404 -- don't leak whether a given id exists
  // for someone else's account (same policy as /api/scans/[imageId]).
  if (!screening || screening.userId !== user.id) {
    return NextResponse.json({ error: "Không tìm thấy kết quả." }, { status: 404 });
  }

  // top3 isn't a column on MultidiseaseScreening (schema.prisma) -- derived
  // here from the stored full distribution instead of persisting a second
  // copy of the same information.
  const probs = screening.probs as Record<string, number>;
  const top3 = Object.entries(probs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, prob]) => ({ label, prob }));

  return NextResponse.json({
    id: screening.id,
    cloudUrl: screening.cloudUrl,
    createdAt: screening.createdAt,
    topLabel: screening.topLabel,
    topProb: screening.topProb,
    top3,
    probs,
    modelVersion: screening.modelVersion,
    isExperimental: true,
    doctorReview: screening.screeningReview
      ? {
          doctorName: screening.screeningReview.doctor.fullName,
          confirmedLabels: screening.screeningReview.confirmedLabels,
          recommendation: screening.screeningReview.recommendation,
          note: screening.screeningReview.note,
          updatedAt: screening.screeningReview.updatedAt,
        }
      : null,
  });
}
