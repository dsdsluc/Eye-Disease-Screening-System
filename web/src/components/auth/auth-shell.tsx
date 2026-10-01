"use client";

import Link from "next/link";
import { motion } from "motion/react";

import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";

/** Outer chrome shared by /login and /register: the "← Trang chủ" link, the
 * centered two-column card (brand panel + form), and the entrance
 * animation. Each page supplies its own copy for the brand panel and its
 * own form as `children` -- everything else was byte-for-byte identical
 * between the two pages. */
export function AuthShell({
  eyebrow,
  title,
  description,
  trustPills,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  trustPills: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="px-6 py-5">
        <Link
          href="/"
          className="font-condensed text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-teal-deep"
        >
          ← Trang chủ
        </Link>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border/60 bg-linear-to-br from-secondary/70 via-background to-background sm:rounded-[2.75rem] lg:grid-cols-[1.05fr_1fr]"
        >
          <AuthBrandPanel eyebrow={eyebrow} title={title} description={description} trustPills={trustPills} />

          <div className="relative flex flex-col justify-center border-t border-border/60 bg-card/40 px-10 py-12 sm:px-12 sm:py-14 lg:border-t-0 lg:border-l">
            {children}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
