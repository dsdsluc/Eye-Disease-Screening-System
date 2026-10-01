import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";
import { sanitizeNote } from "@/lib/server/sanitize-note";

const LABELS = ["normal", "cataract"] as const;

function serialize(review: {
  id: string;
  cataractScreeningId: string;
  doctorId: string;
  confirmedLabel: string;
  note: string | null;
  followUp: string;
  createdAt: Date;
  updatedAt: Date;
  doctor: { fullName: string };
}) {
  return {
    id: review.id,
    cataractScreeningId: review.cataractScreeningId,
    doctorId: review.doctorId,
    doctorName: review.doctor.fullName,
    confirmedLabel: review.confirmedLabel,
    note: review.note,
    followUp: review.followUp,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ screeningId: string }> }) {
  const { screeningId } = await params;

  const review = await prisma.cataractReview.findUnique({
    where: { cataractScreeningId: screeningId },
    include: { doctor: { select: { fullName: true } } },
  });
  if (!review) return NextResponse.json({ error: "Chưa có ghi chú." }, { status: 404 });

  return NextResponse.json({ review: serialize(review) });
}

/** Upsert -- one CataractReview row per CataractScreening (schema.prisma),
 * same shape/behavior as /api/doctor/glaucoma-reviews: confirmedLabel is a
 * single "normal"/"cataract" string, this classifier is binary
 * (config/cataract/config.json). */
export async function PUT(req: Request, { params }: { params: Promise<{ screeningId: string }> }) {
  const { screeningId } = await params;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const confirmedLabel = typeof body?.confirmedLabel === "string" ? body.confirmedLabel : "";
  if (!(LABELS as readonly string[]).includes(confirmedLabel)) {
    return NextResponse.json({ error: "Kết luận không hợp lệ." }, { status: 400 });
  }
  const followUp = typeof body?.followUp === "string" ? body.followUp.trim() : "";
  if (!followUp) return NextResponse.json({ error: "Thiếu đề xuất tái khám." }, { status: 400 });
  const note = sanitizeNote(typeof body?.note === "string" ? body.note : "");

  const screening = await prisma.cataractScreening.findUnique({ where: { id: screeningId }, select: { id: true } });
  if (!screening) return NextResponse.json({ error: "Không tìm thấy lượt sàng lọc." }, { status: 404 });

  const review = await prisma.cataractReview.upsert({
    where: { cataractScreeningId: screeningId },
    create: { cataractScreeningId: screeningId, doctorId: user.id, confirmedLabel, note, followUp },
    update: { doctorId: user.id, confirmedLabel, note, followUp },
    include: { doctor: { select: { fullName: true } } },
  });

  return NextResponse.json({ review: serialize(review) });
}
