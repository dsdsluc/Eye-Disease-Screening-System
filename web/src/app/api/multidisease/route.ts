import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";
import { screenMultiDisease } from "@/lib/server/inference-client";
import { uploadImage } from "@/lib/server/cloudinary";
import { rejectIfTooLarge } from "@/lib/server/upload-limits";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

function extOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

/** Multi-disease screening (plans/plan_multidisease.txt) -- same two-branch
 * shape as /api/scans: logged in -> persisted to its own MultidiseaseScreening
 * table (never Scan -- see schema.prisma's comment on why this stays a
 * separate model); anonymous -> the result is shown inline by
 * web/src/app/multidisease/page.tsx and nothing is saved. Deliberately its
 * own route, not folded into /api/scans -- this is an opt-in feature the
 * user triggers on demand, not something computed automatically for every
 * DR upload.
 *
 * Accepts either a fresh `file` upload OR a `scanId` (plan section 4.3):
 * the latter re-screens a DR exam already on file -- the "Sàng lọc thêm các
 * bệnh khác" button on /results/[imageId] -- without asking for the same
 * photo twice. scanId reuse only makes sense for a logged-in user re-
 * screening their OWN saved exam, so it 401s/404s the same way
 * /api/scans/[imageId] does rather than silently falling back to anonymous. */
export async function POST(req: Request) {
  const tooLarge = rejectIfTooLarge(req);
  if (tooLarge) return tooLarge;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });

  const file = form.get("file");
  const scanId = form.get("scanId");
  const user = await getSessionUser();

  let buffer: Buffer;
  let filename: string;
  let reusedScanCloudUrl: string | null = null;
  let linkedScanId: string | null = null;

  if (file instanceof File) {
    const ext = extOf(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: `Định dạng không hỗ trợ: ${ext}` }, { status: 400 });
    }
    buffer = Buffer.from(await file.arrayBuffer());
    filename = file.name;
  } else if (typeof scanId === "string" && scanId) {
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    // Not found AND not-yours both 404 -- same policy as every other
    // per-id lookup in this app (don't leak whether an id exists).
    if (!scan || scan.userId !== user.id || !scan.cloudUrl) {
      return NextResponse.json({ error: "Không tìm thấy ảnh để sàng lọc lại." }, { status: 404 });
    }

    const imageRes = await fetch(scan.cloudUrl).catch(() => null);
    if (!imageRes || !imageRes.ok) {
      return NextResponse.json({ error: "Không tải được ảnh gốc, vui lòng thử tải ảnh mới." }, { status: 502 });
    }
    buffer = Buffer.from(await imageRes.arrayBuffer());
    filename = scan.filename ?? "scan.jpg";
    reusedScanCloudUrl = scan.cloudUrl;
    linkedScanId = scan.id;
  } else {
    return NextResponse.json({ error: "Thiếu file ảnh." }, { status: 400 });
  }

  let prediction;
  try {
    prediction = await screenMultiDisease(buffer, filename);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Không thể sàng lọc ảnh, vui lòng thử lại." },
      { status: 502 }
    );
  }

  const resultData = {
    topLabel: prediction.top_label,
    topProb: prediction.top_prob,
    top3: prediction.top3,
    probs: prediction.probs,
    modelVersion: prediction.model_version,
    isExperimental: prediction.is_experimental,
  };

  if (!user) {
    return NextResponse.json({ ...resultData, cloudUrl: null });
  }

  // Reusing an existing scan's own Cloudinary image -- no need to upload the
  // same photo a second time under a new id. Otherwise, same fail-open
  // upload policy as /api/scans: a Cloudinary failure shouldn't fail the
  // whole screen.
  let cloudUrl: string | null = reusedScanCloudUrl;
  if (!linkedScanId) {
    try {
      cloudUrl = await uploadImage(buffer, crypto.randomUUID());
    } catch {
      // leave cloudUrl null
    }
  }

  const screening = await prisma.multidiseaseScreening.create({
    data: {
      userId: user.id,
      scanId: linkedScanId,
      filename,
      cloudUrl,
      topLabel: prediction.top_label,
      topProb: prediction.top_prob,
      probs: prediction.probs,
      modelVersion: prediction.model_version,
    },
  });

  return NextResponse.json({ ...resultData, cloudUrl, id: screening.id });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const screenings = await prisma.multidiseaseScreening.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { screeningReview: { include: { doctor: { select: { fullName: true } } } } },
  });

  return NextResponse.json({
    screenings: screenings.map((s) => ({
      id: s.id,
      filename: s.filename,
      cloudUrl: s.cloudUrl,
      topLabel: s.topLabel,
      topProb: s.topProb,
      probs: s.probs,
      modelVersion: s.modelVersion,
      createdAt: s.createdAt,
      // Closes the patient <-> doctor loop, same convention as /api/scans's
      // own doctorReview field.
      doctorReview: s.screeningReview
        ? {
            doctorName: s.screeningReview.doctor.fullName,
            confirmedLabels: s.screeningReview.confirmedLabels,
            recommendation: s.screeningReview.recommendation,
            note: s.screeningReview.note,
            updatedAt: s.screeningReview.updatedAt,
          }
        : null,
    })),
  });
}
