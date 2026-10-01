import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getSessionUser, toSessionUser } from "@/lib/server/auth";

const GENDERS = new Set(["female", "male", "other"]);

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  if (!fullName) {
    return NextResponse.json({ error: "Vui lòng nhập họ tên." }, { status: 400 });
  }

  // All three are optional demographic/contact fields (see schema.prisma) --
  // an empty string clears the field rather than being rejected, since
  // there's no requirement to fill them in.
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const dateOfBirthRaw = typeof body?.dateOfBirth === "string" ? body.dateOfBirth.trim() : "";
  const dateOfBirth = dateOfBirthRaw ? new Date(dateOfBirthRaw) : null;
  if (dateOfBirthRaw && Number.isNaN(dateOfBirth?.getTime())) {
    return NextResponse.json({ error: "Ngày sinh không hợp lệ." }, { status: 400 });
  }
  const genderRaw = typeof body?.gender === "string" ? body.gender.trim() : "";
  if (genderRaw && !GENDERS.has(genderRaw)) {
    return NextResponse.json({ error: "Giới tính không hợp lệ." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.id },
    data: {
      fullName,
      phone: phone || null,
      dateOfBirth,
      gender: genderRaw || null,
    },
  });
  return NextResponse.json({ user: toSessionUser(user) });
}
