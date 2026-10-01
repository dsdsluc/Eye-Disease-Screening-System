"use client";

import Link from "next/link";
import { ChevronDown, Eye, History, LogOut, Microscope, ScanEye, ScanFace, UploadCloud, UserRound } from "lucide-react";

import { Menu, MenuContent, MenuItem, MenuLinkItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1]?.[0]?.toUpperCase() ?? "?";
}

const menuItemClass =
  "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground outline-none select-none data-highlighted:bg-secondary";

/** The in-app header (history, account, and anywhere else behind login) --
 * deliberately NOT SiteHeader (marketing landing nav: "Nhận diện"/"Dịch
 * vụ" section anchors make no sense once you're past login). Theme-inert
 * on purpose: every class here reads off the current `--background`/
 * `--foreground`/`--border` tokens, so it renders correctly whether its
 * page is the light theme (e.g. /account) or opts into `.dark` (e.g.
 * /history's "instrument panel" treatment) -- one component, no variant
 * prop needed. */
export function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="font-display text-base font-semibold tracking-tight text-foreground">
          Fundas
        </Link>

        {user && (
          <Menu>
            <MenuTrigger className="flex items-center gap-2 rounded-full border border-border/60 bg-card py-1 pr-2.5 pl-1 transition-colors outline-none hover:bg-secondary data-[popup-open]:bg-secondary">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-gold to-teal font-condensed text-[11px] font-semibold text-white">
                {initials(user.fullName)}
              </span>
              <span className="max-w-28 truncate text-sm font-medium text-foreground">{user.fullName}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 data-[popup-open]:rotate-180" />
            </MenuTrigger>
            {/* Header block mirrors AppNavCard's own (same avatar gradient,
                same initials() helper, same name/email stack) -- the plain
                all-caps MenuLabel this used to be read as an afterthought
                next to that card's polish. Email now sits under the name
                instead of being the only line, same "who am I logged in as"
                job, better presented. */}
            <MenuContent align="end" className="w-68">
              <div className="flex items-center gap-2.5 px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-gold to-teal font-condensed text-[11px] font-semibold text-white">
                  {initials(user.fullName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{user.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <MenuSeparator />
              <MenuLinkItem render={<Link href="/history" />} closeOnClick className={menuItemClass}>
                <History className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                Lịch sử sàng lọc
              </MenuLinkItem>
              <MenuLinkItem render={<Link href="/upload" />} closeOnClick className={menuItemClass}>
                <UploadCloud className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                Sàng lọc võng mạc
              </MenuLinkItem>
              <MenuLinkItem render={<Link href="/multidisease" />} closeOnClick className={menuItemClass}>
                <Microscope className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                Sàng lọc đa bệnh
              </MenuLinkItem>
              <MenuLinkItem render={<Link href="/glaucoma" />} closeOnClick className={menuItemClass}>
                <Eye className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                Sàng lọc tăng nhãn áp
              </MenuLinkItem>
              <MenuLinkItem render={<Link href="/amd" />} closeOnClick className={menuItemClass}>
                <ScanEye className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                Sàng lọc thoái hóa điểm vàng
              </MenuLinkItem>
              <MenuLinkItem render={<Link href="/cataract" />} closeOnClick className={menuItemClass}>
                <ScanFace className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                Sàng lọc đục thủy tinh thể
              </MenuLinkItem>
              <MenuLinkItem render={<Link href="/account" />} closeOnClick className={menuItemClass}>
                <UserRound className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                Hồ sơ &amp; mật khẩu
              </MenuLinkItem>
              <MenuSeparator />
              {/* Footer, same "own row below a divider" placement as
                  AppNavCard's own logout button -- was a bare icon-only
                  button standing outside the dropdown entirely before. */}
              <MenuItem
                onClick={() => logout()}
                closeOnClick
                className={cn(menuItemClass, "text-muted-foreground data-highlighted:bg-destructive/10 data-highlighted:text-destructive")}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                Đăng xuất
              </MenuItem>
            </MenuContent>
          </Menu>
        )}
      </div>
    </header>
  );
}
