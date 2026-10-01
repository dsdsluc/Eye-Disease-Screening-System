"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { ChevronDown, Eye, History, LogOut, Microscope, ScanEye, ScanFace, UploadCloud, UserRound } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuLinkItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1]?.[0]?.toUpperCase() ?? "?";
}

const menuItemClass =
  "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground outline-none select-none data-highlighted:bg-secondary";

/** Option B (see plans/plan_web.txt): the avatar+name pill opens a dropdown
 * for everything that ISN'T logging out ("Lịch sử", "Sàng lọc võng mạc",
 * "Hồ sơ & mật khẩu"...) -- previously only the pill's own click target,
 * /history, was reachable at all. Logout now lives INSIDE the dropdown, as
 * its own footer row below a divider (same placement AppNavCard and
 * AppHeader's own dropdown use), not a bare icon button standing outside it
 * -- that stood alone next to the pill mainly because the dropdown itself
 * hadn't been built out with a proper header/footer yet, not because
 * logout specifically needed one click fewer than everything else here. */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY, scrollYProgress } = useScroll();
  const { user, logout } = useAuth();
  // Smoothed rather than 1:1 with scroll -- a raw scaleX snapping every
  // frame reads as jittery on a trackpad; the spring settles it into one
  // continuous sweep instead.
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 32, mass: 0.4 });

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  return (
    <>
      {/* A quiet reading progress thread along the very top edge -- this is
          a long single-page marketing site (SideNav's quick-jump exists for
          the same reason), so a visitor scrolled partway down has a sense of
          how much is left without hunting for a section marker. */}
      <motion.div
        aria-hidden="true"
        className="fixed top-0 right-0 left-0 z-30 h-0.5 origin-left bg-linear-to-r from-gold to-teal-deep"
        style={{ scaleX: progress }}
      />
      <div className="sticky top-0 z-20 flex justify-center px-4 pt-4">
      {/* layout (not animate={{maxWidth}}): resizing max-width directly forces a
          layout recalculation every animation frame, which is what read as
          "thô" (janky). `layout` instead measures the before/after box once and
          animates the transition as a GPU transform (FLIP), so it stays smooth
          regardless of how expensive the box's own layout is. */}
      <motion.header
        layout
        transition={{ type: "spring", stiffness: 300, damping: 32, mass: 0.7 }}
        className={cn(
          "w-full rounded-full border px-6 transition-colors duration-500 ease-out",
          scrolled
            ? "glossy shadow-bubble max-w-6xl border-border/60 bg-card/90 py-2.5 backdrop-blur-md"
            : "max-w-[1600px] border-transparent bg-transparent py-3"
        )}
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-base font-semibold tracking-tight text-foreground">
            Fundas
          </Link>
          <nav className="hidden items-center gap-10 font-display text-sm text-muted-foreground sm:flex">
            <Link href="/#nhan-dien" className="transition-colors hover:text-foreground">
              Nhận diện
            </Link>
            <Link href="/#benh-ve-mat" className="transition-colors hover:text-foreground">
              Bệnh về mắt
            </Link>
            <Link href="/#dich-vu" className="transition-colors hover:text-foreground">
              Dịch vụ
            </Link>
            <Link href="/#cach-hoat-dong" className="transition-colors hover:text-foreground">
              Cách hoạt động
            </Link>
            <Link href="/#do-tin-cay" className="transition-colors hover:text-foreground">
              Độ tin cậy
            </Link>
          </nav>
          {user ? (
            <Menu>
              <MenuTrigger
                className="glossy shadow-bubble flex items-center gap-2 rounded-full border border-border/60 bg-card py-1 pr-2.5 pl-1 transition-colors outline-none hover:bg-secondary data-[popup-open]:bg-secondary"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-gold to-teal-deep font-condensed text-[11px] font-semibold text-white">
                  {initials(user.fullName)}
                </span>
                <span className="max-w-28 truncate text-sm font-medium text-foreground">{user.fullName}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 data-[popup-open]:rotate-180" />
              </MenuTrigger>
              {/* Header block: avatar + name + email, same stack AppNavCard
                  and AppHeader's dropdown both use -- replaces the plain
                  all-caps email-only MenuLabel this used to be. */}
              <MenuContent align="end" className="w-68">
                <div className="flex items-center gap-2.5 px-3 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-gold to-teal-deep font-condensed text-[11px] font-semibold text-white">
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
          ) : (
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "default", size: "sm" }), "glossy rounded-full px-4")}
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </motion.header>
      </div>
    </>
  );
}
