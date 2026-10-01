import Link from "next/link";
import { Home } from "lucide-react";

/** Fixed floating exit back to the marketing site -- used on every
 * logged-in workspace page (/account, /history, /upload). AppNavCard (the
 * desktop sidebar these pages share) only links within the workspace, so
 * without this a desktop user has no click back to "/" at all; the mobile
 * AppHeader already carries its own "Fundas" logo link, which is why this
 * only shows at `lg:` and up. */
export function WorkspaceHomeButton() {
  return (
    <Link
      href="/"
      aria-label="Về trang chủ"
      title="Về trang chủ"
      className="glossy shadow-bubble fixed top-8 right-6 z-20 hidden h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/80 text-muted-foreground backdrop-blur-xl transition-colors hover:bg-secondary hover:text-foreground lg:flex"
    >
      <Home className="h-4 w-4" strokeWidth={1.75} />
    </Link>
  );
}
