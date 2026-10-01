"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, History, LogOut, Microscope, ScanEye, ScanFace, UploadCloud, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1]?.[0]?.toUpperCase() ?? "?";
}

const NAV_ITEMS = [
  { href: "/history", label: "Lịch sử sàng lọc", icon: History },
  { href: "/upload", label: "Sàng lọc võng mạc", icon: UploadCloud },
  { href: "/multidisease", label: "Sàng lọc đa bệnh", icon: Microscope },
  { href: "/glaucoma", label: "Sàng lọc tăng nhãn áp", icon: Eye },
  { href: "/amd", label: "Sàng lọc thoái hóa điểm vàng", icon: ScanEye },
  { href: "/cataract", label: "Sàng lọc đục thủy tinh thể", icon: ScanFace },
  { href: "/account", label: "Hồ sơ & mật khẩu", icon: UserRound },
];

/** A standing nav card, not an app-shell sidebar: it's a self-contained
 * bordered box that sits inline in the page's own content column (desktop
 * only -- AppHeader's dropdown remains the way in on narrow screens), for
 * one-click access to the same 4 destinations instead of a menu you have
 * to open first. Not sticky on its own -- callers that want it (and
 * whatever else shares the left column) to stay put while the page scrolls
 * wrap it in their own `sticky` container, since some pages pair it with
 * more content below (e.g. /history's featured-scan card). */
export function AppNavCard() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="glossy shadow-bubble flex w-72 shrink-0 flex-col gap-1.5 rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-2 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-gold to-teal font-condensed text-xs font-semibold text-white">
          {initials(user.fullName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{user.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="my-1.5 border-t border-border" />

      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
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
        onClick={() => logout()}
        className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.75} />
        Đăng xuất
      </button>
    </div>
  );
}
