import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";

/** GET a single saved CataractScreening -- the /cataract/[id] equivalent of
 * /api/glaucoma/[id]. Same ownership policy: not found AND not-yours both
 * 404, so a guessed id can't be used to confirm whether it belongs to
 * someone else. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const screening = await prisma.cataractScreening.findUnique({
    where: { id },
    include: { cataractReview: { include: { doctor: { select: { fullName: true } } } } },
  });
  if (!screening || screening.userId !== user.id) {
    return NextResponse.json({ error: "Không tìm thấy kết quả." }, { status: 404 });
  }

  return NextResponse.json({
    id: screening.id,
    cloudUrl: screening.cloudUrl,
    createdAt: screening.createdAt,
    label: screening.label,
    probCataract: screening.probCataract,
    eyeCropApplied: screening.eyeCropApplied,
    modelVersion: screening.modelVersion,
    isExperimental: true,
    doctorReview: screening.cataractReview
      ? {
          doctorName: screening.cataractReview.doctor.fullName,
          confirmedLabel: screening.cataractReview.confirmedLabel,
          note: screening.cataractReview.note,
          followUp: screening.cataractReview.followUp,
          updatedAt: screening.cataractReview.updatedAt,
        }
      : null,
  });
}
