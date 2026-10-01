import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { prisma } from "@/lib/server/prisma";

const SESSION_COOKIE = "fundas_session";
const SESSION_DURATION = "14d";

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: Date;
  phone: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
};

/** The one shape every auth route (register/login/me) sends back to the
 * client -- factored out so a field added here doesn't need to be
 * remembered in three separate route handlers too.
 *
 * `email` is nullable on User now (a walk-in patient created from
 * app/doctor/new-case has no login of their own -- see schema.prisma), but
 * this is only ever called for a user going through register/login or an
 * already-established session, all of which require a real account with an
 * email. The `!` below is safe for exactly that reason, not an assumption
 * about every User row. */
export function toSessionUser(user: {
  id: string;
  email: string | null;
  fullName: string;
  role: string;
  createdAt: Date;
  phone: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
}): SessionUser {
  return {
    id: user.id,
    email: user.email!,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt,
    phone: user.phone,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
  };
}

export async function createSessionCookie(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Reads the session cookie, verifies it, and loads the user from Postgres.
 * Returns null for a missing/invalid/expired session -- callers decide
 * whether that's a 401 (protected route) or just "logged out" (optional auth). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string") return null;
    userId = payload.sub;
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  return toSessionUser(user);
}
