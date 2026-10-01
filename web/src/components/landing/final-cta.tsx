"use client";

import Link from "next/link";
import { motion } from "motion/react";

export function FinalCta() {
  return (
    <section className="px-4 pb-4 sm:px-6">
      <div className="glossy shadow-bubble relative overflow-hidden rounded-[2.5rem] bg-[#0d211f] text-[#f4f1ea]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-16 h-80 w-80 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--color-gold)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -bottom-24 h-96 w-96 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--color-teal)" }}
        />

        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-24 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-3 font-condensed text-xs uppercase tracking-[0.3em] text-[#7fd6cc]">Bắt đầu</p>
            <h2 className="max-w-md text-3xl font-semibold tracking-tight sm:text-4xl">
              Thử Fundas với một ảnh đáy mắt ngay bây giờ.
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Link
              href="/upload"
              className="glossy shadow-bubble inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-[#f4f1ea] px-7 text-base font-medium text-[#12312e] transition-transform hover:scale-[1.03] hover:bg-white active:scale-[0.98]"
            >
              Thử với ảnh của bạn
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
