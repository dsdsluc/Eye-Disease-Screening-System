import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";

function str(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}

function dateOrNull(v: unknown): Date | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Doctor-side edit of a patient's own intake-form fields (app/doctor/
 * patients/[id]) -- the one gap "Ca mới" (new-case/route.ts) left open:
 * that route can only ever CREATE these fields at walk-in intake time, with
 * no way to fix a typo or fill in what was skipped afterward. Same field
 * set and same str()/dateOrNull() parsing convention as that route, minus
 * fullName being required to already exist here (this only ever targets a
 * real patient row, findFirst below 404s otherwise) -- email is
 * deliberately NOT editable here, since that's account identity, not
 * intake data, and this route has no auth flow of its own to safely change
 * it through. No `role === "doctor"` check, matching every other
 * /api/doctor/* route's current phase-1 scope. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const patient = await prisma.user.findFirst({ where: { id, role: "patient" } });
  if (!patient) return NextResponse.json({ error: "Không tìm thấy bệnh nhân." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const fullName = str(body?.fullName);
  if (!fullName) return NextResponse.json({ error: "Thiếu họ và tên." }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id },
    data: {
      fullName,
      phone: str(body?.phone),
      dateOfBirth: dateOrNull(body?.dateOfBirth),
      gender: str(body?.gender),
      nationalId: str(body?.nationalId),
      address: str(body?.address),
      occupation: str(body?.occupation),
      bloodType: str(body?.bloodType),
      emergencyContactName: str(body?.emergencyContactName),
      emergencyContactPhone: str(body?.emergencyContactPhone),
      medicalHistory: str(body?.medicalHistory),
      insuranceNumber: str(body?.insuranceNumber),
    },
  });

  return NextResponse.json({
    patient: {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      gender: updated.gender,
      dateOfBirth: updated.dateOfBirth ? updated.dateOfBirth.toISOString() : null,
      nationalId: updated.nationalId,
      address: updated.address,
      occupation: updated.occupation,
      bloodType: updated.bloodType,
      emergencyContactName: updated.emergencyContactName,
      emergencyContactPhone: updated.emergencyContactPhone,
      medicalHistory: updated.medicalHistory,
      insuranceNumber: updated.insuranceNumber,
      createdAt: updated.createdAt.toISOString(),
    },
  });
}
