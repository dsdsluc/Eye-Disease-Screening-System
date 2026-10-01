import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";
import { checkImageQuality, predictImage } from "@/lib/server/inference-client";
import { uploadImage } from "@/lib/server/cloudinary";
import { rejectIfTooLarge } from "@/lib/server/upload-limits";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

function extOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

export async function POST(req: Request) {
  const tooLarge = rejectIfTooLarge(req);
  if (tooLarge) return tooLarge;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file ảnh." }, { status: 400 });
  }

  const ext = extOf(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: `Định dạng không hỗ trợ: ${ext}` }, { status: 400 });
  }

  // Two branches only (no doctor-intake case -- see plans/plan_web.txt Phase 1):
  // logged in -> persisted to the user's own history; anonymous -> nothing
  // saved, /upload shows the result inline and it's gone once they navigate
  // away (see web/src/app/upload/page.tsx).
  const user = await getSessionUser();
  const buffer = Buffer.from(await file.arrayBuffer());

  // Fail-open by design (gate_mode=fail_open in checkImageQuality): a bad
  // photo still gets graded, this only adds a `quality` field the client can
  // warn on. Quality-check itself failing shouldn't block grading either.
  const quality = await checkImageQuality(buffer, file.name).catch(() => null);

  let prediction;
  try {
    prediction = await predictImage(buffer, file.name);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Không thể phân tích ảnh, vui lòng thử lại." },
      { status: 502 }
    );
  }

  const resultData = {
    grade: prediction.grade,
    score: prediction.score,
    backboneScores: prediction.backbone_scores,
    perFoldScores: prediction.per_fold_scores,
  };

  if (!user) {
    return NextResponse.json({
      imageId: crypto.randomUUID(),
      status: "done",
      cloudUrl: null,
      quality,
      ...resultData,
    });
  }

  // Cloudinary is display-only (the grade doesn't depend on it) -- a failure
  // here shouldn't fail the whole upload.
  let cloudUrl: string | null = null;
  try {
    cloudUrl = await uploadImage(buffer, crypto.randomUUID());
  } catch {
    // leave cloudUrl null
  }

  const scan = await prisma.scan.create({
    data: {
      userId: user.id,
      filename: file.name,
      cloudUrl,
      qualityLabel: quality?.label,
      qualityProbs: quality?.probs,
      ...resultData,
    },
  });

  return NextResponse.json({
    imageId: scan.id,
    status: "done",
    cloudUrl: scan.cloudUrl,
    quality,
    grade: scan.grade,
    score: scan.score,
    backboneScores: scan.backboneScores,
    perFoldScores: scan.perFoldScores,
  });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const scans = await prisma.scan.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { doctorReview: { include: { doctor: { select: { fullName: true } } } } },
  });

  return NextResponse.json({
    scans: scans.map((s) => ({
      imageId: s.id,
      filename: s.filename,
      cloudUrl: s.cloudUrl,
      status: "done" as const,
      createdAt: s.createdAt,
      grade: s.grade,
      score: s.score,
      qualityLabel: s.qualityLabel,
      backboneScores: s.backboneScores,
      // Closes the patient <-> doctor loop (previously only DoctorReview
      // existed with no patient-facing read path at all -- InsightRail's
      // "Đánh giá của bác sĩ" was a static placeholder, plans/plan_web.txt).
      // null when nobody has chốt this scan yet -- same "reviewed or not"
      // signal ScanCard needs to decide whether to show a badge at all.
      doctorReview: s.doctorReview
        ? {
            doctorName: s.doctorReview.doctor.fullName,
            doctorGrade: s.doctorReview.doctorGrade,
            note: s.doctorReview.note,
            followUp: s.doctorReview.followUp,
            updatedAt: s.doctorReview.updatedAt,
          }
        : null,
    })),
  });
}
