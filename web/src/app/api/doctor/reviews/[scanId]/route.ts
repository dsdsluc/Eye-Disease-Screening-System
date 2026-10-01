import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";
import { sanitizeNote } from "@/lib/server/sanitize-note";

function serialize(review: {
  id: string;
  scanId: string;
  doctorId: string;
  doctorGrade: number;
  note: string | null;
  followUp: string;
  createdAt: Date;
  updatedAt: Date;
  doctor: { fullName: string };
}) {
  return {
    id: review.id,
    scanId: review.scanId,
    doctorId: review.doctorId,
    doctorName: review.doctor.fullName,
    doctorGrade: review.doctorGrade,
    note: review.note,
    followUp: review.followUp,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;

  const review = await prisma.doctorReview.findUnique({
    where: { scanId },
    include: { doctor: { select: { fullName: true } } },
  });
  if (!review) return NextResponse.json({ error: "Chưa có ghi chú." }, { status: 404 });

  return NextResponse.json({ review: serialize(review) });
}

/** Upsert -- one DoctorReview row per Scan (schema.prisma), so "Chốt ca" the
 * first time creates it and "Chỉnh sửa lại" + chốt again just updates the
 * same row (doctorId moves to whoever is logged in when they save, so a
 * second doctor editing a case takes over authorship of the one row rather
 * than leaving a stale name behind). This never touches Scan.grade itself --
 * additive by construction, since it's a different table. */
export async function PUT(req: Request, { params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const doctorGrade = typeof body?.doctorGrade === "number" ? body.doctorGrade : null;
  if (doctorGrade === null || !Number.isInteger(doctorGrade) || doctorGrade < 0 || doctorGrade > 4) {
    return NextResponse.json({ error: "Mức độ không hợp lệ." }, { status: 400 });
  }
  const followUp = typeof body?.followUp === "string" ? body.followUp.trim() : "";
  if (!followUp) return NextResponse.json({ error: "Thiếu đề xuất tái khám." }, { status: 400 });
  const note = sanitizeNote(typeof body?.note === "string" ? body.note : "");

  const scan = await prisma.scan.findUnique({ where: { id: scanId }, select: { id: true } });
  if (!scan) return NextResponse.json({ error: "Không tìm thấy ca khám." }, { status: 404 });

  const review = await prisma.doctorReview.upsert({
    where: { scanId },
    create: { scanId, doctorId: user.id, doctorGrade, note, followUp },
    update: { doctorId: user.id, doctorGrade, note, followUp },
    include: { doctor: { select: { fullName: true } } },
  });

  return NextResponse.json({ review: serialize(review) });
}
