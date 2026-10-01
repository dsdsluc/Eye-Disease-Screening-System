"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, FilePlus2, LayoutGrid, ListChecks, LogOut, User, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuLinkItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";

const menuItemClass =
  "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground outline-none select-none data-highlighted:bg-secondary";

/** Mobile equivalent of DoctorNavCard, same relationship AppHeader has to
 * AppNavCard on the patient side -- a sticky top bar with everything behind
 * one dropdown instead of a standing card, since there's no room for one on
 * a phone. Same logout button + "push to /" reasoning as DoctorNavCard's own
 * header comment. */
export function DoctorHeader({ doctorName }: { doctorName: string | null }) {
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="font-display text-base font-semibold tracking-tight text-foreground">
          Fundas
        </Link>

        <Menu>
          <MenuTrigger className="flex items-center gap-2 rounded-full border border-border/60 bg-card py-1 pr-2.5 pl-1 transition-colors outline-none hover:bg-secondary data-[popup-open]:bg-secondary">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-maroon to-gold-deep font-condensed text-[11px] font-semibold text-white">
              BS
            </span>
            <span className="max-w-28 truncate text-sm font-medium text-foreground">{doctorName ?? "Bàn khám"}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 data-[popup-open]:rotate-180" />
          </MenuTrigger>
          <MenuContent align="end">
            <MenuLabel>Bàn khám (demo)</MenuLabel>
            <MenuSeparator />
            <MenuLinkItem render={<Link href="/doctor" />} closeOnClick className={menuItemClass}>
              <LayoutGrid className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              Bàn khám
            </MenuLinkItem>
            <MenuLinkItem render={<Link href="/doctor/queue" />} closeOnClick className={menuItemClass}>
              <ListChecks className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              Hàng đợi
            </MenuLinkItem>
            <MenuLinkItem render={<Link href="/doctor/patients" />} closeOnClick className={menuItemClass}>
              <User className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              Bệnh nhân
            </MenuLinkItem>
            <MenuLinkItem render={<Link href="/doctor/new-case" />} closeOnClick className={menuItemClass}>
              <FilePlus2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              Ca mới
            </MenuLinkItem>
            <MenuLinkItem render={<Link href="/doctor/profile" />} closeOnClick className={menuItemClass}>
              <UserRound className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              Hồ sơ bác sĩ
            </MenuLinkItem>
            <MenuSeparator />
            <MenuItem
              onClick={() => {
                logout();
                router.push("/");
              }}
              closeOnClick
              className={cn(menuItemClass, "text-muted-foreground data-highlighted:bg-destructive/10 data-highlighted:text-destructive")}
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Đăng xuất
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </header>
  );
}
