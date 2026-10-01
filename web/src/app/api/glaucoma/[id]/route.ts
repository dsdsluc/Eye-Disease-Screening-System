import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";

/** GET a single saved GlaucomaScreening -- the /glaucoma/[id] equivalent of
 * /api/multidisease/[id]. Same ownership policy: not found AND not-yours
 * both 404, so a guessed id can't be used to confirm whether it belongs to
 * someone else. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const screening = await prisma.glaucomaScreening.findUnique({
    where: { id },
    include: { glaucomaReview: { include: { doctor: { select: { fullName: true } } } } },
  });
  if (!screening || screening.userId !== user.id) {
    return NextResponse.json({ error: "Không tìm thấy kết quả." }, { status: 404 });
  }

  return NextResponse.json({
    id: screening.id,
    cloudUrl: screening.cloudUrl,
    createdAt: screening.createdAt,
    label: screening.label,
    probGlaucoma: screening.probGlaucoma,
    opticDiscCenter: screening.opticDiscCenter,
    modelVersion: screening.modelVersion,
    isExperimental: true,
    doctorReview: screening.glaucomaReview
      ? {
          doctorName: screening.glaucomaReview.doctor.fullName,
          confirmedLabel: screening.glaucomaReview.confirmedLabel,
          note: screening.glaucomaReview.note,
          followUp: screening.glaucomaReview.followUp,
          updatedAt: screening.glaucomaReview.updatedAt,
        }
      : null,
  });
}
