"use client";

import Image from "next/image";
import { motion } from "motion/react";

import { AnimatedNumber } from "@/components/animated-number";
import { RadialRing } from "@/components/radial-ring";

const BACKBONES = ["Inception v4", "Inception-ResNet v2", "SE-ResNeXt50", "SE-ResNeXt101"];

export function TrustSection() {
  return (
    <section id="do-tin-cay" className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute -top-20 right-0 h-96 w-96 opacity-[0.1]">
        <Image src="/samples/grade-3.png" alt="" fill sizes="384px" className="rounded-full object-cover blur-2xl" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p className="mb-3 font-condensed text-xs uppercase tracking-[0.3em] text-teal-deep">
              Kiểm chứng minh bạch
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Số liệu thật, không phải lời quảng cáo.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              QWK (Quadratic Weighted Kappa) là chỉ số đo độ khớp giữa mức độ AI chấm và
              mức độ thật trên thang thứ tự 0-4 — cũng là chỉ số dùng để tối ưu ensemble.
              4 trường hợp lệch trong lần kiểm thử gần nhất đều lệch đúng một bậc liền kề,
              không có trường hợp lệch xa.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="glossy shadow-bubble grid grid-cols-1 gap-10 rounded-[2rem] border border-border bg-card px-8 py-9 sm:grid-cols-[auto_1fr]"
          >
            <div className="flex flex-col items-center justify-center gap-3 sm:items-start">
              <RadialRing value={0.9524} size={128} strokeWidth={10}>
                <span className="font-mono text-2xl font-semibold text-foreground">
                  <AnimatedNumber value={0.9524} decimals={4} />
                </span>
              </RadialRing>
              <span className="text-center font-condensed text-[11px] uppercase tracking-wider text-muted-foreground sm:text-left">
                QWK trên tập validate nội bộ
              </span>
            </div>

            <div className="flex flex-col justify-center gap-5 border-t border-border pt-6 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-10">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-3xl font-semibold text-foreground">
                  <AnimatedNumber value={20} />
                </span>
                <span className="text-sm text-muted-foreground">model trong ensemble</span>
              </div>

              {/* 4 architectures x 5-fold = 20 -- an honest, literal breakdown
                  of the number above, not a decorative pattern. */}
              <div className="flex flex-col gap-1.5">
                {BACKBONES.map((name) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
                      {name}
                    </span>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} className="h-1.5 w-1.5 rounded-full bg-teal-deep/70" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <p className="mt-10 border-t border-border pt-6 font-condensed text-xs leading-relaxed text-muted-foreground/80">
          * Kiểm thử nội bộ trên tập mẫu nhỏ do đội ngũ phát triển tự thực hiện — không
          thay thế cho thẩm định lâm sàng chính thức. Fundas là công cụ hỗ trợ, quyết
          định chẩn đoán và điều trị luôn thuộc về bác sĩ chuyên khoa.
        </p>
      </div>
    </section>
  );
}
