import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";
import { checkImageQuality, predictImage, screenMultiDisease } from "@/lib/server/inference-client";
import { uploadImage } from "@/lib/server/cloudinary";
import { sanitizeNote } from "@/lib/server/sanitize-note";
import { rejectIfTooLarge } from "@/lib/server/upload-limits";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

function extOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

function str(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}

function intOrNull(v: FormDataEntryValue | null): number | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function floatOrNull(v: FormDataEntryValue | null): number | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function dateOrNull(v: FormDataEntryValue | null): Date | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Ca mới" (app/doctor/new-case) -- a doctor creating both a walk-in
 * PATIENT (a User row with no email/passwordHash, schema.prisma -- they
 * never log in, so they never need credentials) and their first Scan in
 * one request. Same predict/quality-check/upload sequence as /api/scans,
 * just against a brand-new user id instead of the caller's own -- this is
 * exactly the gap this page's own comment used to cite for staying UI-only
 * (a doctor session writing a Scan under someone else's id needs its own
 * path, not a reuse of /api/scans's "current session's own history"
 * assumption). No `role === "doctor"` check yet, matching every other
 * /api/doctor/* route and the layout's own stated phase-1 scope -- any
 * logged-in session can do this for now. */
export async function POST(req: Request) {
  const tooLarge = rejectIfTooLarge(req);
  if (tooLarge) return tooLarge;

  const doctor = await getSessionUser();
  if (!doctor) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });

  const fullName = str(form.get("fullName"));
  if (!fullName) return NextResponse.json({ error: "Thiếu họ tên bệnh nhân." }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Thiếu ảnh." }, { status: 400 });

  const ext = extOf(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: `Định dạng không hỗ trợ: ${ext}` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

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

  const patient = await prisma.user.create({
    data: {
      fullName,
      role: "patient",
      phone: str(form.get("phone")),
      dateOfBirth: dateOrNull(form.get("dateOfBirth")),
      gender: str(form.get("gender")),
      nationalId: str(form.get("nationalId")),
      address: str(form.get("address")),
      occupation: str(form.get("occupation")),
      bloodType: str(form.get("bloodType")),
      emergencyContactName: str(form.get("emergencyContactName")),
      emergencyContactPhone: str(form.get("emergencyContactPhone")),
    },
  });

  // Cloudinary is display-only (the grade doesn't depend on it) -- a
  // failure here shouldn't fail the whole intake, same policy as /api/scans.
  let cloudUrl: string | null = null;
  try {
    cloudUrl = await uploadImage(buffer, crypto.randomUUID());
  } catch {
    // leave cloudUrl null
  }

  const scan = await prisma.scan.create({
    data: {
      userId: patient.id,
      filename: file.name,
      cloudUrl,
      grade: prediction.grade,
      score: prediction.score,
      backboneScores: prediction.backbone_scores,
      perFoldScores: prediction.per_fold_scores,
      qualityLabel: quality?.label,
      qualityProbs: quality?.probs ?? undefined,
      diabetesDurationYears: intOrNull(form.get("diabetesDurationYears")),
      hba1c: floatOrNull(form.get("hba1c")),
      bloodPressure: str(form.get("bloodPressure")),
      clinicalNote: sanitizeNote(str(form.get("note")) ?? ""),
    },
  });

  // Opt-in only (the wizard's own checkbox) -- multi-disease is experimental
  // (~62% val accuracy, plans/plan_multidisease.txt section 6) and must
  // never be something a walk-in intake runs automatically. Reuses the
  // SAME buffer/cloudUrl as the Scan above rather than asking for the photo
  // twice, same scan-reuse policy as /api/multidisease's own scanId branch.
  // A failure here shouldn't fail the whole intake -- the Scan already
  // exists and is the point of this endpoint; multi-disease is an add-on.
  let multidiseaseScreeningId: string | null = null;
  if (str(form.get("alsoScreenMultidisease")) === "true") {
    try {
      const md = await screenMultiDisease(buffer, file.name);
      const screening = await prisma.multidiseaseScreening.create({
        data: {
          userId: patient.id,
          scanId: scan.id,
          filename: file.name,
          cloudUrl,
          topLabel: md.top_label,
          topProb: md.top_prob,
          probs: md.probs,
          modelVersion: md.model_version,
        },
      });
      multidiseaseScreeningId = screening.id;
    } catch {
      // leave multidiseaseScreeningId null -- the DR scan above still stands
    }
  }

  return NextResponse.json({ patientId: patient.id, scanId: scan.id, multidiseaseScreeningId });
}
