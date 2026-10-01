"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { changePassword } from "@/lib/account";
import { AppHeader } from "@/components/app-header";
import { AppNavCard } from "@/components/app-nav-card";
import { WorkspaceHomeButton } from "@/components/workspace-home-button";
import { ProfileForm } from "@/components/account/profile-form";
import { PasswordForm } from "@/components/account/password-form";

/** Phase 1 (plans/plan_web.txt): the two account actions that already had
 * working API/lib code (updateProfile, changePassword) but nowhere to
 * trigger them from. Extended with phone/date-of-birth/gender (see
 * schema.prisma) -- optional demographic/contact fields relevant to a DR
 * screening app (age is a real risk factor, phone is how a clinic would
 * reach the patient), not just filler to bulk out the card. Still no email
 * change (needs its own verification flow) and no account deletion, per
 * the plan. This page is now just orchestration -- the two cards
 * (ProfileForm, PasswordForm) own their own draft state and submit logic. */
export default function AccountPage() {
  const router = useRouter();
  const { user, loading: authLoading, updateProfile } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  return (
    <div className="flex flex-1 flex-col">
      <div className="lg:hidden">
        <AppHeader />
      </div>
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 items-start gap-8 px-4 pt-10 pb-16 sm:px-6 lg:pr-10 lg:pl-[6px]">
        <div className="hidden lg:sticky lg:top-8 lg:block">
          <AppNavCard />
        </div>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
          <WorkspaceHomeButton />

          {/* Split eyebrow/heading, matching /history -- same page-header
              pattern across the workspace instead of each page inventing
              its own. */}
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-7">
            <p className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">
              Fundas · Tài khoản
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Hồ sơ &amp; mật khẩu
            </h1>
          </div>

          {/* Hồ sơ carries more fields now (contact + demographic, not just
              a name) so it gets the wider 3-of-5 share instead of an even
              split -- Đổi mật khẩu still only ever needs its two fields.
              Same lg breakpoint as /history's exam grid for the same
              reason: consistent, not a one-off. */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <ProfileForm
              user={user}
              onSave={updateProfile}
              className="glossy shadow-bubble flex flex-col gap-5 rounded-2xl border border-border bg-card px-6 py-6 lg:col-span-3"
            />
            <PasswordForm
              onSave={changePassword}
              className="glossy shadow-bubble flex flex-col gap-5 rounded-2xl border border-border bg-card px-6 py-6 lg:col-span-2"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
