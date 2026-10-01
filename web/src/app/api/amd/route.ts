import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";
import { screenAmd } from "@/lib/server/inference-client";
import { uploadImage } from "@/lib/server/cloudinary";
import { rejectIfTooLarge } from "@/lib/server/upload-limits";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

function extOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

/** AMD specialist screening (plans/plan_AMD.txt) -- same "separate opt-in
 * table" shape as /api/glaucoma and /api/cataract, minus both of those
 * routes' extra complexity: no multidiseaseScreeningId reuse branch, no
 * crop-confirm step. Same anonymous/logged-in split as every other
 * screening route here: anonymous gets a full result with nothing
 * persisted, logged in gets an AmdScreening row. No AmdReview model exists
 * (unlike glaucoma/cataract), so this route never surfaces a doctorReview
 * field -- that's out of scope for the fix that made this route real. */
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

  const buffer = Buffer.from(await file.arrayBuffer());
  const user = await getSessionUser();

  let prediction;
  try {
    prediction = await screenAmd(buffer, file.name);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Không thể phân tích ảnh, vui lòng thử lại." },
      { status: 502 }
    );
  }

  const resultData = {
    label: prediction.label,
    probAmd: prediction.prob_amd,
    modelVersion: prediction.model_version,
    isExperimental: prediction.is_experimental,
  };

  if (!user) {
    return NextResponse.json({ ...resultData, cloudUrl: null });
  }

  // Fail-open by design, same convention as /api/scans, /api/glaucoma and
  // /api/cataract -- a Cloudinary failure shouldn't fail the whole screen.
  let cloudUrl: string | null = null;
  try {
    cloudUrl = await uploadImage(buffer, crypto.randomUUID());
  } catch {
    // leave cloudUrl null
  }

  const screening = await prisma.amdScreening.create({
    data: {
      userId: user.id,
      filename: file.name,
      cloudUrl,
      label: prediction.label,
      probAmd: prediction.prob_amd,
      modelVersion: prediction.model_version,
    },
  });

  return NextResponse.json({ ...resultData, cloudUrl, id: screening.id });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const screenings = await prisma.amdScreening.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    screenings: screenings.map((s) => ({
      id: s.id,
      filename: s.filename,
      cloudUrl: s.cloudUrl,
      label: s.label,
      probAmd: s.probAmd,
      modelVersion: s.modelVersion,
      createdAt: s.createdAt,
    })),
  });
}
