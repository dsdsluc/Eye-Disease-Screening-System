"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { ScopeFrame } from "@/components/scope-frame";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export function HeroSection() {
  const reduced = useReducedMotion();

  return (
    <section id="nhan-dien" className="px-4 pt-4 sm:px-6">
      {/* Plain soft panel, not the glossy/bubble treatment -- that's reserved for
          tappable components (buttons, cards), not a full section frame. */}
      <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-linear-to-br from-secondary/70 via-background to-background sm:rounded-[2.75rem]">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 pt-16 pb-28 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pt-24">
        <motion.div
          className="min-w-0"
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: reduced ? 0 : 0.12, delayChildren: 0.05 }}
        >
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mb-5 font-condensed text-xs uppercase tracking-[0.3em] text-teal-deep"
          >
            Fundas · Trung tâm chăm sóc mắt ứng dụng AI
          </motion.p>
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-5xl leading-[1.05] font-semibold tracking-tight text-foreground sm:text-6xl"
          >
            Chăm sóc đôi mắt,
            <br />
            bắt đầu từ một ảnh chụp.
          </motion.h1>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground"
          >
            Fundas là điểm khởi đầu cho việc chăm sóc mắt chủ động — bốn dịch vụ sàng lọc
            bằng AI (võng mạc tiểu đường, đa bệnh, tăng nhãn áp, đục thủy tinh thể), cùng
            diễn giải kết quả dễ hiểu hỗ trợ bác sĩ đọc ảnh. Nhiều dịch vụ chăm sóc mắt
            khác đang được xây dựng thêm.
          </motion.p>
          <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="mt-9 flex flex-wrap items-center gap-5">
            <Link
              href="/upload"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "glossy shadow-bubble h-12 rounded-full px-7 text-base transition-transform hover:scale-[1.03] active:scale-[0.98]"
              )}
            >
              Bắt đầu sàng lọc
            </Link>
            <Link
              href="/#dich-vu"
              className="font-condensed text-xs uppercase tracking-wider text-foreground/70 transition-colors hover:text-foreground"
            >
              Xem các dịch vụ ↓
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          className="relative min-w-0 flex justify-center lg:justify-end"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            aria-hidden="true"
            className="absolute -inset-16 -z-10 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)" }}
          />
          <motion.div
            className="w-full lg:translate-x-10"
            style={{ maxWidth: 440 }}
            animate={reduced ? undefined : { rotate: 360 }}
            transition={reduced ? undefined : { duration: 180, repeat: Infinity, ease: "linear" }}
          >
            <ScopeFrame size={440} ringColor="var(--foreground)">
              <motion.div
                className="relative h-full w-full"
                animate={reduced ? undefined : { rotate: -360 }}
                transition={reduced ? undefined : { duration: 180, repeat: Infinity, ease: "linear" }}
              >
                <Image
                  src="/hero-fundus.png"
                  alt="Ảnh đáy mắt mẫu được Fundas phân tích"
                  fill
                  sizes="440px"
                  className="object-cover"
                  priority
                />
              </motion.div>
            </ScopeFrame>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="glossy shadow-bubble absolute -bottom-4 left-2 flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 sm:left-8"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sev-0" />
            <div>
              <p className="font-mono text-sm font-semibold text-foreground">Mức độ 0</p>
              <p className="font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
                Không có dấu hiệu
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
      </div>
    </section>
  );
}
