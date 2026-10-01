import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";
import { sanitizeNote } from "@/lib/server/sanitize-note";

const LABELS = ["normal", "glaucoma"] as const;

function serialize(review: {
  id: string;
  glaucomaScreeningId: string;
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
    glaucomaScreeningId: review.glaucomaScreeningId,
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

  const review = await prisma.glaucomaReview.findUnique({
    where: { glaucomaScreeningId: screeningId },
    include: { doctor: { select: { fullName: true } } },
  });
  if (!review) return NextResponse.json({ error: "Chưa có ghi chú." }, { status: 404 });

  return NextResponse.json({ review: serialize(review) });
}

/** Upsert -- one GlaucomaReview row per GlaucomaScreening (schema.prisma),
 * same "chỉnh sửa lại updates the same row, doctorId moves to whoever saves"
 * behavior as /api/doctor/reviews (DR). confirmedLabel is a single
 * "normal"/"glaucoma" string, not a 0-4 grade or a label set -- this
 * classifier is binary (config/glaucoma/config.json). */
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

  const screening = await prisma.glaucomaScreening.findUnique({ where: { id: screeningId }, select: { id: true } });
  if (!screening) return NextResponse.json({ error: "Không tìm thấy lượt sàng lọc." }, { status: 404 });

  const review = await prisma.glaucomaReview.upsert({
    where: { glaucomaScreeningId: screeningId },
    create: { glaucomaScreeningId: screeningId, doctorId: user.id, confirmedLabel, note, followUp },
    update: { doctorId: user.id, confirmedLabel, note, followUp },
    include: { doctor: { select: { fullName: true } } },
  });

  return NextResponse.json({ review: serialize(review) });
}
