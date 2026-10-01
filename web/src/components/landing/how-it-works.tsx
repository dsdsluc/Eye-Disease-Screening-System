"use client";

import { GitMerge, Layers, Sparkles, UploadCloud } from "lucide-react";
import { motion } from "motion/react";

const STEPS = [
  {
    n: "01",
    icon: UploadCloud,
    title: "Tải ảnh đáy mắt",
    body: "Kéo-thả hoặc chọn một ảnh chụp đáy mắt (.jpg / .png) — không cần chỉnh sửa trước.",
  },
  {
    n: "02",
    icon: Layers,
    title: "20 model cùng đọc",
    body: "4 kiến trúc CNN × 5-fold cross-validation, mỗi model đưa ra một điểm số độc lập trên cùng một ảnh.",
  },
  {
    n: "03",
    icon: GitMerge,
    title: "Tổng hợp bằng ensemble",
    body: "20 điểm số được gộp theo trọng số tối ưu QWK, quy về thang 5 mức độ bệnh võng mạc tiểu đường (0-4).",
  },
  {
    n: "04",
    icon: Sparkles,
    title: "AI diễn giải kết quả",
    body: "Một lớp AI ngôn ngữ tóm tắt kết quả, nêu điểm cần chú ý và gợi ý lịch tái khám tham khảo.",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="cach-hoat-dong" className="bg-secondary/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-3 font-condensed text-xs uppercase tracking-[0.3em] text-teal-deep"
        >
          Quy trình
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="max-w-lg text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          Từ một ảnh chụp, đến một bản diễn giải bác sĩ có thể đọc trong vài giây.
        </motion.h2>

        {/* Connected stepper: a line that draws itself across the 4 stages,
            because this genuinely is one continuous pipeline, not four
            unrelated facts -- the line should encode that order matters. */}
        <div className="relative mt-20">
          <div className="absolute top-7 right-0 left-0 hidden h-px bg-border sm:block" />
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "left" }}
            className="absolute top-7 right-0 left-0 hidden h-px bg-teal-deep sm:block"
          />

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative"
              >
                <div className="glossy shadow-bubble relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card">
                  <step.icon className="h-6 w-6 text-gold-deep" strokeWidth={1.75} />
                </div>
                <span className="mt-4 block font-mono text-xs text-muted-foreground">{step.n}</span>
                <h3 className="mt-1 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
