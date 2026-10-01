import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";
import { screenGlaucoma } from "@/lib/server/inference-client";
import { uploadImage } from "@/lib/server/cloudinary";
import { rejectIfTooLarge } from "@/lib/server/upload-limits";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

function extOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

/** Glaucoma specialist deep-dive (plans/plan_glaucoma.txt) -- same
 * "separate opt-in table" shape as /api/multidisease, triggered from a
 * multidisease result screen (the probability-threshold banner, or the
 * "Phân tích chuyên sâu" button inside DiseaseInfoDialog for the glaucoma
 * tile) rather than folded into that screen's own response, since this is a
 * DIFFERENT model with its own caveats (internal optic-disc auto-crop --
 * inference/glaucoma_engine.py).
 *
 * Accepts `file` (fresh bytes -- the live /multidisease page still has the
 * just-uploaded File in memory, so it resends it directly instead of
 * round-tripping through Cloudinary) and/or `multidiseaseScreeningId` (to
 * link back to the originating screening, and as the image source when no
 * `file` is sent -- e.g. from /multidisease/[id], which only has a saved
 * screening's cloudUrl, not the original File). Same ownership/404 policy
 * as /api/multidisease's scanId reuse. */
export async function POST(req: Request) {
  const tooLarge = rejectIfTooLarge(req);
  if (tooLarge) return tooLarge;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });

  const file = form.get("file");
  const multidiseaseScreeningId = form.get("multidiseaseScreeningId");
  const user = await getSessionUser();

  let linkedScreening: { id: string; cloudUrl: string | null; filename: string | null } | null = null;
  if (typeof multidiseaseScreeningId === "string" && multidiseaseScreeningId) {
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const screening = await prisma.multidiseaseScreening.findUnique({
      where: { id: multidiseaseScreeningId },
      select: { id: true, userId: true, cloudUrl: true, filename: true },
    });
    if (!screening || screening.userId !== user.id) {
      return NextResponse.json({ error: "Không tìm thấy kết quả sàng lọc đa bệnh." }, { status: 404 });
    }
    linkedScreening = screening;
  }

  let buffer: Buffer;
  let filename: string;
  let reusedCloudUrl: string | null = null;

  if (file instanceof File) {
    const ext = extOf(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: `Định dạng không hỗ trợ: ${ext}` }, { status: 400 });
    }
    buffer = Buffer.from(await file.arrayBuffer());
    filename = file.name;
  } else if (linkedScreening?.cloudUrl) {
    const imageRes = await fetch(linkedScreening.cloudUrl).catch(() => null);
    if (!imageRes || !imageRes.ok) {
      return NextResponse.json({ error: "Không tải được ảnh gốc, vui lòng thử tải ảnh mới." }, { status: 502 });
    }
    buffer = Buffer.from(await imageRes.arrayBuffer());
    filename = linkedScreening.filename ?? "scan.jpg";
    reusedCloudUrl = linkedScreening.cloudUrl;
  } else {
    return NextResponse.json({ error: "Thiếu file ảnh." }, { status: 400 });
  }

  let prediction;
  try {
    prediction = await screenGlaucoma(buffer, filename);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Không thể phân tích ảnh, vui lòng thử lại." },
      { status: 502 }
    );
  }

  const resultData = {
    label: prediction.label,
    probGlaucoma: prediction.prob_glaucoma,
    opticDiscCenter: prediction.optic_disc_center,
    modelVersion: prediction.model_version,
    isExperimental: prediction.is_experimental,
  };

  if (!user) {
    return NextResponse.json({ ...resultData, cloudUrl: null });
  }

  // Same fail-open upload policy as /api/scans and /api/multidisease -- a
  // Cloudinary failure shouldn't fail the whole screen. Reusing the linked
  // screening's own image avoids uploading the same photo a second time.
  let cloudUrl: string | null = reusedCloudUrl;
  if (!reusedCloudUrl) {
    try {
      cloudUrl = await uploadImage(buffer, crypto.randomUUID());
    } catch {
      // leave cloudUrl null
    }
  }

  const screening = await prisma.glaucomaScreening.create({
    data: {
      userId: user.id,
      multidiseaseScreeningId: linkedScreening?.id ?? null,
      filename,
      cloudUrl,
      label: prediction.label,
      probGlaucoma: prediction.prob_glaucoma,
      opticDiscCenter: prediction.optic_disc_center,
      modelVersion: prediction.model_version,
    },
  });

  return NextResponse.json({ ...resultData, cloudUrl, id: screening.id });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const screenings = await prisma.glaucomaScreening.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { glaucomaReview: { include: { doctor: { select: { fullName: true } } } } },
  });

  return NextResponse.json({
    screenings: screenings.map((s) => ({
      id: s.id,
      multidiseaseScreeningId: s.multidiseaseScreeningId,
      filename: s.filename,
      cloudUrl: s.cloudUrl,
      label: s.label,
      probGlaucoma: s.probGlaucoma,
      opticDiscCenter: s.opticDiscCenter,
      modelVersion: s.modelVersion,
      createdAt: s.createdAt,
      // Closes the patient <-> doctor loop, same convention as /api/scans's
      // own doctorReview field.
      doctorReview: s.glaucomaReview
        ? {
            doctorName: s.glaucomaReview.doctor.fullName,
            confirmedLabel: s.glaucomaReview.confirmedLabel,
            note: s.glaucomaReview.note,
            followUp: s.glaucomaReview.followUp,
            updatedAt: s.glaucomaReview.updatedAt,
          }
        : null,
    })),
  });
}
