import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { createSessionCookie, hashPassword, toSessionUser } from "@/lib/server/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !fullName || password.length < 8) {
    return NextResponse.json({ error: "Vui lòng nhập đủ thông tin, mật khẩu tối thiểu 8 ký tự." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email này đã được đăng ký." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { email, fullName, passwordHash: await hashPassword(password) },
  });

  await createSessionCookie(user.id);

  return NextResponse.json({ user: toSessionUser(user) });
}
