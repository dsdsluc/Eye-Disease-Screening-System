"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FilePlus2, LayoutGrid, ListChecks, LogOut, User, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/doctor", label: "Bàn khám", icon: LayoutGrid, exact: true },
  { href: "/doctor/queue", label: "Hàng đợi", icon: ListChecks, exact: false },
  { href: "/doctor/patients", label: "Bệnh nhân", icon: User, exact: false },
  { href: "/doctor/new-case", label: "Ca mới", icon: FilePlus2, exact: false },
  { href: "/doctor/profile", label: "Hồ sơ bác sĩ", icon: UserRound, exact: false },
] as const;

/** The doctor-workspace equivalent of AppNavCard (components/app-nav-card.tsx)
 * -- same card shell, same "standing card in the content column, not an
 * app-shell sidebar" philosophy, but its own destinations: this is a
 * different workspace, not a 6th item bolted onto the patient nav. No auth
 * gate for now (this whole route tree is intentionally public -- see
 * app/doctor/layout.tsx's own comment on why), so `doctorName` is whatever
 * session happens to exist, not a verified doctor identity yet -- logging
 * out here just clears that same shared session (lib/auth-context.tsx),
 * same as AppNavCard's own logout button. Unlike the patient side, no page
 * under /doctor auto-redirects once `user` goes null (this tree has no auth
 * guard), so this button pushes to "/" itself afterward -- staying on a
 * doctor page showing a stale name right after an explicit logout would be
 * confusing even though the route itself stays viewable. */
export function DoctorNavCard({ doctorName }: { doctorName: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <div className="glossy shadow-bubble flex w-64 shrink-0 flex-col gap-1.5 rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur-xl">
      <Link href="/" className="px-2 pb-3 font-display text-base font-semibold tracking-tight text-foreground">
        Fundas
      </Link>

      <div className="flex items-center gap-3 px-2 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-maroon to-gold-deep font-condensed text-xs font-semibold text-white">
          BS
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{doctorName ?? "Chưa xác định"}</p>
          <p className="truncate text-xs text-muted-foreground">Bàn khám (demo)</p>
        </div>
      </div>

      <div className="my-1.5 border-t border-border" />

      {NAV_ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors",
              active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}

      <div className="my-1.5 border-t border-border" />

      <button
        type="button"
        onClick={() => {
          logout();
          router.push("/");
        }}
        className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.75} />
        Đăng xuất
      </button>
    </div>
  );
}
