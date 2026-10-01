import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await params;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const scan = await prisma.scan.findUnique({
    where: { id: imageId },
    include: { doctorReview: { include: { doctor: { select: { fullName: true } } } } },
  });
  // Not found AND not-yours both 404 -- don't leak whether a given id exists
  // for someone else's account.
  if (!scan || scan.userId !== user.id) {
    return NextResponse.json({ error: "Không tìm thấy ảnh." }, { status: 404 });
  }

  return NextResponse.json({
    imageId: scan.id,
    status: "done",
    cloudUrl: scan.cloudUrl,
    createdAt: scan.createdAt,
    filename: scan.filename,
    grade: scan.grade,
    score: scan.score,
    backboneScores: scan.backboneScores,
    perFoldScores: scan.perFoldScores,
    doctorReview: scan.doctorReview
      ? {
          doctorName: scan.doctorReview.doctor.fullName,
          doctorGrade: scan.doctorReview.doctorGrade,
          note: scan.doctorReview.note,
          followUp: scan.doctorReview.followUp,
          updatedAt: scan.doctorReview.updatedAt,
        }
      : null,
  });
}
