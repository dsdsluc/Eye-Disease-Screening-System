import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";
import { screenCataract } from "@/lib/server/inference-client";
import { uploadImage } from "@/lib/server/cloudinary";
import { rejectIfTooLarge } from "@/lib/server/upload-limits";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

function extOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

/** Cataract specialist screening (plans/plan_cataract.txt) -- same
 * "separate opt-in table" shape as /api/glaucoma, minus that route's
 * multidiseaseScreeningId reuse branch: cataract is never triggered from a
 * multidisease result screen (no "Phân tích chuyên sâu" for the cataract
 * tile), only run standalone from /cataract, so this only ever accepts a
 * fresh `file`. Same anonymous/logged-in split as every other screening
 * route here: anonymous gets a full result with nothing persisted, logged
 * in gets a CataractScreening row. */
export async function POST(req: Request) {
  const tooLarge = rejectIfTooLarge(req);
  if (tooLarge) return tooLarge;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file ảnh." }, { status: 400 });
  }

  const ext = extOf(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: `Định dạng không hỗ trợ: ${ext}` }, { status: 400 });
  }

  // Set by /cataract's confirm-crop screen (components/cataract/
  // cataract-crop-confirm.tsx) when `file` is exactly the crop the user
  // already reviewed via /api/cataract/crop-preview -- see screenCataract()'s
  // own docstring for why this skips re-running YuNet here.
  const alreadyCropped = form.get("alreadyCropped") === "true";
  const eyeCropApplied = form.get("eyeCropApplied") === "true";

  const buffer = Buffer.from(await file.arrayBuffer());
  const user = await getSessionUser();

  let prediction;
  try {
    prediction = await screenCataract(buffer, file.name, alreadyCropped ? { eyeCropApplied } : undefined);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Không thể phân tích ảnh, vui lòng thử lại." },
      { status: 502 }
    );
  }

  const resultData = {
    label: prediction.label,
    probCataract: prediction.prob_cataract,
    eyeCropApplied: prediction.eye_crop_applied,
    modelVersion: prediction.model_version,
    isExperimental: prediction.is_experimental,
  };

  if (!user) {
    return NextResponse.json({ ...resultData, cloudUrl: null });
  }

  // Fail-open by design, same convention as /api/scans and /api/glaucoma --
  // a Cloudinary failure shouldn't fail the whole screen.
  let cloudUrl: string | null = null;
  try {
    cloudUrl = await uploadImage(buffer, crypto.randomUUID());
  } catch {
    // leave cloudUrl null
  }

  const screening = await prisma.cataractScreening.create({
    data: {
      userId: user.id,
      filename: file.name,
      cloudUrl,
      label: prediction.label,
      probCataract: prediction.prob_cataract,
      eyeCropApplied: prediction.eye_crop_applied,
      modelVersion: prediction.model_version,
    },
  });

  return NextResponse.json({ ...resultData, cloudUrl, id: screening.id });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const screenings = await prisma.cataractScreening.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { cataractReview: { include: { doctor: { select: { fullName: true } } } } },
  });

  return NextResponse.json({
    screenings: screenings.map((s) => ({
      id: s.id,
      filename: s.filename,
      cloudUrl: s.cloudUrl,
      label: s.label,
      probCataract: s.probCataract,
      eyeCropApplied: s.eyeCropApplied,
      modelVersion: s.modelVersion,
      createdAt: s.createdAt,
      // Closes the patient <-> doctor loop, same convention as /api/scans's
      // own doctorReview field.
      doctorReview: s.cataractReview
        ? {
            doctorName: s.cataractReview.doctor.fullName,
            confirmedLabel: s.cataractReview.confirmedLabel,
            note: s.cataractReview.note,
            followUp: s.cataractReview.followUp,
            updatedAt: s.cataractReview.updatedAt,
          }
        : null,
    })),
  });
}
