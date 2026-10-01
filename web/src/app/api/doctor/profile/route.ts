import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";

function str(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}

function intOrNull(v: unknown): number | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/** Doctor CV self-edit (components/doctor/doctor-profile-edit-form.tsx) --
 * only the doctor themselves can touch their own row, unlike every other
 * /api/doctor/* route so far (those are all fine for "any logged-in
 * session" since /doctor has no role gate yet, per the layout's own
 * comment). Editing identity/credentials is different: nothing stops a
 * patient session from hitting this route otherwise, and there's no
 * "target id" param -- it always updates the caller's own row -- so a
 * patient session could only ever edit ITS OWN row through here anyway,
 * but the role check keeps this endpoint meaningfully doctor-only rather
 * than a way for a patient account to grow CV fields it has no UI for. */
export async function PATCH(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  if (session.role !== "doctor") {
    return NextResponse.json({ error: "Chỉ tài khoản bác sĩ mới chỉnh sửa được hồ sơ này." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const fullName = str(body?.fullName);
  if (!fullName) return NextResponse.json({ error: "Thiếu họ tên." }, { status: 400 });

  const doctor = await prisma.user.update({
    where: { id: session.id },
    data: {
      fullName,
      title: str(body?.title),
      specialty: str(body?.specialty),
      licenseNumber: str(body?.licenseNumber),
      hospital: str(body?.hospital),
      yearsOfExperience: intOrNull(body?.yearsOfExperience),
      phone: str(body?.phone),
      education: str(body?.education),
      bio: str(body?.bio),
      avatarUrl: str(body?.avatarUrl),
    },
  });

  return NextResponse.json({
    doctor: {
      id: doctor.id,
      fullName: doctor.fullName,
      email: doctor.email,
      phone: doctor.phone,
      title: doctor.title,
      specialty: doctor.specialty,
      licenseNumber: doctor.licenseNumber,
      hospital: doctor.hospital,
      yearsOfExperience: doctor.yearsOfExperience,
      education: doctor.education,
      bio: doctor.bio,
      avatarUrl: doctor.avatarUrl,
      createdAt: doctor.createdAt,
    },
  });
}
