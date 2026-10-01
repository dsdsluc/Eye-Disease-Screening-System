// Client for web/'s own `/api/auth/*` routes -- session is an httpOnly
// cookie, so these are plain same-origin fetches with no token to manage.

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
};

export type ProfileUpdate = {
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
};

async function parseOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? fallback);
  }
  return res.json();
}

export async function register(email: string, fullName: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, fullName, password }),
  });
  const data = await parseOrThrow<{ user: AuthUser }>(res, "Đăng ký thất bại");
  return data.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseOrThrow<{ user: AuthUser }>(res, "Đăng nhập thất bại");
  return data.user;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function updateProfile(profile: ProfileUpdate): Promise<AuthUser> {
  const res = await fetch("/api/auth/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  const data = await parseOrThrow<{ user: AuthUser }>(res, "Không cập nhật được hồ sơ");
  return data.user;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch("/api/auth/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  await parseOrThrow(res, "Không đổi được mật khẩu");
}

/** Where a logged-in user lands -- doctors go straight to their workspace
 * (app/doctor/), everyone else to their scan history. */
export function routeForRole(role: string): string {
  return role === "doctor" ? "/doctor" : "/history";
}

export async function getMe(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user;
}
