import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { createSessionCookie, toSessionUser, verifyPassword } from "@/lib/server/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Vui lòng nhập email và mật khẩu." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // No passwordHash means this is a walk-in patient record (app/doctor/
  // new-case, schema.prisma) with no login of their own -- same "wrong
  // credentials" response, not a different error that would confirm the
  // email belongs to a real account either way.
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Email hoặc mật khẩu không đúng." }, { status: 401 });
  }

  await createSessionCookie(user.id);

  return NextResponse.json({ user: toSessionUser(user) });
}
