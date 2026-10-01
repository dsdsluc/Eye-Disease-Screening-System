"use client";

import Link from "next/link";

import type { AuthUser } from "@/lib/account";
import { AppHeader } from "@/components/app-header";
import { AppNavCard } from "@/components/app-nav-card";
import { WorkspaceHomeButton } from "@/components/workspace-home-button";
import { OtherModelsNav, type ModelKey } from "@/components/other-models-nav";

/** Shared chrome for every standalone screening page (/upload, /multidisease,
 * /glaucoma, /cataract): a logged-in visitor gets the same workspace shell
 * as /account and /history (AppNavCard, mobile AppHeader dropdown, floating
 * WorkspaceHomeButton, split eyebrow/heading page header), an anonymous
 * visitor gets the plain "← Trang chủ" + OtherModelsNav header instead. This
 * was four independent, byte-for-byte-identical copies of the same ~45
 * lines of JSX (one per page above) before being factored out here --
 * /cataract's own pass was the one that finally made a fourth copy feel
 * wrong rather than a fourth reasonable "copy the page next to it" edit.
 *
 * `content` is what actually differs page to page (each page's own
 * upload-widget/result AnimatePresence swap) and renders inside BOTH
 * branches' <main>, in the one spot appropriate to each. `children` is for
 * anything that must render once, after the branch, regardless of login
 * state -- every page's own "AI đang xử lý" dialog, and (only on
 * /multidisease) the glaucoma deep-dive's extra dialogs layered on top. */
export function ScreeningWorkspaceShell({
  user,
  eyebrow,
  title,
  otherModelsCurrent,
  content,
  children,
}: {
  user: AuthUser | null;
  eyebrow: string;
  title: string;
  otherModelsCurrent: ModelKey;
  content: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Logged-in visitors get the same workspace chrome as /history and
          /account (nav card, floating Home) instead of the anonymous
          top-left "← Trang chủ" link -- they're already past that door. */}
      {user && <WorkspaceHomeButton />}

      {user ? (
        <>
          <div className="lg:hidden">
            <AppHeader />
          </div>
          <div className="mx-auto flex w-full max-w-[1400px] flex-1 items-start gap-8 px-4 pt-10 pb-16 sm:px-6 lg:pr-10 lg:pl-[6px]">
            <div className="hidden lg:sticky lg:top-8 lg:block">
              <AppNavCard />
            </div>
            <main className="flex min-w-0 flex-1 flex-col gap-8">
              {/* Split eyebrow/heading, matching /account and /history --
                  same page-header pattern across the whole workspace. */}
              <div className="flex items-baseline justify-between gap-4 border-b border-border pb-7">
                <p className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">{eyebrow}</p>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center">{content}</div>
            </main>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
            <Link
              href="/"
              className="font-condensed text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-teal-deep"
            >
              ← Trang chủ
            </Link>
            <OtherModelsNav current={otherModelsCurrent} />
          </div>
          <div className="mx-auto w-full max-w-6xl">
            <main className="flex w-full flex-1 flex-col items-center justify-center px-4 pb-16 sm:px-6">{content}</main>
          </div>
        </>
      )}

      {children}
    </div>
  );
}
