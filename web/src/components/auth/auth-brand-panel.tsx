"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

import { ScopeFrame } from "@/components/scope-frame";
import { RadialRing } from "@/components/radial-ring";
import { AnimatedNumber } from "@/components/animated-number";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

/** Left column of the auth screens -- identical between login and register
 * (gradient glow, headline, trust pills, QWK stat card, rotating scope
 * frame), only the copy differs. Previously two full copies of this markup
 * drifting slightly apart; now one component both pages pass copy into. */
export function AuthBrandPanel({
  eyebrow,
  title,
  description,
  trustPills,
}: {
  eyebrow: string;
  title: string;
  description: string;
  trustPills: string[];
}) {
  const reduced = useReducedMotion();

  return (
    <div className="relative flex flex-col justify-between gap-12 overflow-hidden px-10 py-12 sm:px-12 sm:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)" }}
      />

      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: reduced ? 0 : 0.12, delayChildren: 0.05 }}
        className="relative min-w-0"
      >
        <motion.p
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="mb-5 font-condensed text-xs uppercase tracking-[0.3em] text-teal-deep"
        >
          {eyebrow}
        </motion.p>
        <motion.h1
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="text-4xl leading-[1.1] font-semibold tracking-tight text-foreground sm:text-[2.75rem]"
        >
          {title}
        </motion.h1>
        <motion.p variants={fadeUp} transition={{ duration: 0.6 }} className="mt-5 max-w-sm text-base leading-relaxed text-muted-foreground">
          {description}
        </motion.p>

        <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="mt-8 flex flex-wrap gap-2.5">
          {trustPills.map((text) => (
            <span
              key={text}
              className="glossy rounded-full border border-border bg-card/80 px-3.5 py-1.5 font-condensed text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              {text}
            </span>
          ))}
        </motion.div>
      </motion.div>

      <div className="relative flex items-end justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="glossy shadow-bubble flex items-center gap-4 rounded-2xl border border-border/60 bg-card px-5 py-4"
        >
          <RadialRing value={0.9524} size={56} strokeWidth={5}>
            <span className="font-mono text-xs font-semibold text-foreground">
              <AnimatedNumber value={95} />%
            </span>
          </RadialRing>
          <div>
            <p className="font-mono text-sm font-semibold text-foreground">
              QWK <AnimatedNumber value={0.9524} decimals={4} />
            </p>
            <p className="font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">Trên tập validate nội bộ</p>
          </div>
        </motion.div>

        <motion.div
          className="hidden shrink-0 sm:block"
          style={{ width: 128 }}
          animate={reduced ? undefined : { rotate: 360 }}
          transition={reduced ? undefined : { duration: 140, repeat: Infinity, ease: "linear" }}
        >
          <ScopeFrame size={128} ringColor="var(--color-teal-deep)">
            <motion.div
              className="relative h-full w-full"
              animate={reduced ? undefined : { rotate: -360 }}
              transition={reduced ? undefined : { duration: 140, repeat: Infinity, ease: "linear" }}
            >
              <Image src="/hero-fundus.png" alt="" fill sizes="128px" className="object-cover" />
            </motion.div>
          </ScopeFrame>
        </motion.div>
      </div>
    </div>
  );
}
