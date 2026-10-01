import { NextResponse } from "next/server";

import { previewCataractCrop } from "@/lib/server/inference-client";
import { rejectIfTooLarge } from "@/lib/server/upload-limits";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

function extOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

/** First half of /cataract's confirm-before-classify flow (plans/
 * archetechture.txt) -- proxies to inference/'s /cataract-crop-preview
 * (CLIP modality gate + YuNet eye-crop, no classification yet) so the
 * browser gets back a real crop to show the user before ../route.ts's
 * POST (the actual classify call) ever runs. Deliberately its own route
 * rather than a mode on ../route.ts: the two calls have unrelated response
 * shapes and neither persists anything, unlike that route's POST. */
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

  try {
    const preview = await previewCataractCrop(buffer, file.name);
    return NextResponse.json({ croppedPng: preview.cropped_png, eyeCropApplied: preview.eye_crop_applied });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Không thể xử lý ảnh, vui lòng thử lại." },
      { status: 502 }
    );
  }
}
