import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";
import { sanitizeNote } from "@/lib/server/sanitize-note";
import { DISEASE_LABELS, RECOMMENDATION_OPTIONS } from "@/lib/multidisease";

function serialize(review: {
  id: string;
  screeningId: string;
  doctorId: string;
  confirmedLabels: string[];
  recommendation: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  doctor: { fullName: string };
}) {
  return {
    id: review.id,
    screeningId: review.screeningId,
    doctorId: review.doctorId,
    doctorName: review.doctor.fullName,
    confirmedLabels: review.confirmedLabels,
    recommendation: review.recommendation,
    note: review.note,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ screeningId: string }> }) {
  const { screeningId } = await params;

  const review = await prisma.screeningReview.findUnique({
    where: { screeningId },
    include: { doctor: { select: { fullName: true } } },
  });
  if (!review) return NextResponse.json({ error: "Chưa có xác nhận." }, { status: 404 });

  return NextResponse.json({ review: serialize(review) });
}

/** Upsert -- one ScreeningReview row per MultidiseaseScreening (schema.prisma),
 * same "chỉnh sửa lại updates the same row" behavior as /api/doctor/reviews.
 * confirmedLabels is a SET (Postgres String[]), not a single grade -- see
 * schema.prisma's comment on ScreeningReview for why a doctor can confirm
 * more than one label here. */
export async function PUT(req: Request, { params }: { params: Promise<{ screeningId: string }> }) {
  const { screeningId } = await params;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const body = await req.json().catch(() => null);

  const confirmedLabelsRaw: unknown[] = Array.isArray(body?.confirmedLabels) ? body.confirmedLabels : [];
  const confirmedLabels = [...new Set(confirmedLabelsRaw)].filter(
    (l): l is string => typeof l === "string" && (DISEASE_LABELS as readonly string[]).includes(l)
  );
  if (confirmedLabels.length === 0) {
    return NextResponse.json({ error: "Chọn ít nhất một bệnh lý." }, { status: 400 });
  }

  const recommendation = typeof body?.recommendation === "string" ? body.recommendation : "";
  if (!(RECOMMENDATION_OPTIONS as readonly string[]).includes(recommendation)) {
    return NextResponse.json({ error: "Hướng xử lý không hợp lệ." }, { status: 400 });
  }

  const note = sanitizeNote(typeof body?.note === "string" ? body.note : "");

  const screening = await prisma.multidiseaseScreening.findUnique({ where: { id: screeningId }, select: { id: true } });
  if (!screening) return NextResponse.json({ error: "Không tìm thấy lượt sàng lọc." }, { status: 404 });

  const review = await prisma.screeningReview.upsert({
    where: { screeningId },
    create: { screeningId, doctorId: user.id, confirmedLabels, recommendation, note },
    update: { doctorId: user.id, confirmedLabels, recommendation, note },
    include: { doctor: { select: { fullName: true } } },
  });

  return NextResponse.json({ review: serialize(review) });
}
