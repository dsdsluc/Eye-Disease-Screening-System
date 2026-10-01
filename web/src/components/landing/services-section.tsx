"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

// tone drives the badge color and CTA copy: "live" = fully supported,
// "beta" = fully wired (real model, real persistence) but explicitly
// lower-confidence -- the status string says so with the actual number
// (e.g. ~62%) rather than a vague "thử nghiệm" that could read as "not
// really built yet", and the dot stays gold, not green, so the homepage
// doesn't overstate confidence before the visitor even reaches the feature
// page's own disclaimer -- "auto" = live but runs automatically inside
// another flow, no standalone page to link to -- "soon" = not built yet.
const SERVICES = [
  {
    title: "Sàng lọc võng mạc tiểu đường",
    body: "Tải ảnh đáy mắt, nhận mức độ bệnh (thang 0-4) trong vài giây, kèm diễn giải hỗ trợ đọc ảnh từ AI.",
    status: "Đang hoạt động",
    tone: "live",
    href: "/upload",
  },
  {
    title: "Sàng lọc đa bệnh",
    body: "Một ảnh đáy mắt, đối chiếu nhanh với 8 nhóm bệnh lý mắt thường gặp (tiểu đường, tăng nhãn áp, đục thủy tinh thể...).",
    status: "Độ chính xác ~62%",
    tone: "beta",
    href: "/multidisease",
  },
  {
    title: "Sàng lọc tăng nhãn áp",
    body: "Mô hình chuyên biệt cho glaucoma, tự động khoanh vùng đĩa thị giác trước khi phân tích — tách riêng khỏi sàng lọc đa bệnh vì đây là mô hình và số liệu riêng.",
    status: "Độ chính xác ~77%",
    tone: "beta",
    href: "/glaucoma",
  },
  {
    title: "Sàng lọc đục thủy tinh thể",
    body: "Chụp ảnh cận mặt/mắt (không phải ảnh đáy mắt), mô hình tự động nhận diện khuôn mặt và khoanh vùng mắt trước khi phân tích.",
    status: "Đang hoạt động",
    tone: "live",
    href: "/cataract",
  },
  {
    title: "Sàng lọc thoái hóa điểm vàng",
    body: "Mô hình chuyên biệt cho AMD, tự động cân chỉnh sáng và tương phản ảnh trước khi phân tích để khớp với cách dữ liệu huấn luyện đã được xử lý.",
    status: "Đang hoạt động",
    tone: "live",
    href: "/amd",
  },
  {
    title: "Kiểm tra chất lượng ảnh",
    body: "Tự động phát hiện ảnh mờ, thiếu sáng ngay khi tải ảnh lên sàng lọc võng mạc tiểu đường, giảm sai số do ảnh chụp kém.",
    status: "Tự động khi tải ảnh",
    tone: "auto",
  },
  {
    title: "Khoanh vùng tổn thương",
    body: "Định vị chi tiết vi phình mạch, xuất huyết, xuất tiết trên ảnh — hỗ trợ bác sĩ khoanh vùng cần chú ý.",
    status: "Sắp ra mắt",
    tone: "soon",
  },
  {
    title: "Tư vấn cùng bác sĩ",
    body: "Kết nối kết quả sàng lọc AI với bác sĩ chuyên khoa mắt để theo dõi và điều trị.",
    status: "Sắp ra mắt",
    tone: "soon",
  },
] as const;

const TONE_DOT: Record<(typeof SERVICES)[number]["tone"], string> = {
  live: "bg-sev-0",
  beta: "bg-gold-deep",
  auto: "bg-sev-0",
  soon: "bg-muted-foreground/50",
};

const TONE_CTA: Partial<Record<(typeof SERVICES)[number]["tone"], string>> = {
  live: "Dùng thử →",
  beta: "Xem thử →",
};

export function ServicesSection() {
  return (
    <section id="dich-vu" className="relative overflow-hidden pt-36 pb-24">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-40 h-120 w-120 opacity-[0.14] sm:-right-20">
        <Image src="/samples/grade-2.png" alt="" fill sizes="480px" className="rounded-full object-cover blur-2xl" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-3 font-condensed text-xs uppercase tracking-[0.3em] text-teal-deep"
        >
          Dịch vụ
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="max-w-xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          Một điểm chăm sóc cho đôi mắt, không chỉ một phép đo.
        </motion.h2>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => {
            const clickable = "href" in service;
            const dimmed = service.tone === "soon";
            const cta = TONE_CTA[service.tone];
            const card = (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={clickable ? { y: -4 } : undefined}
                className={
                  "h-full rounded-3xl border border-border/60 bg-card/80 px-6 py-6 backdrop-blur-xl transition-shadow " +
                  (dimmed ? "opacity-70" : "glossy shadow-bubble hover:shadow-xl hover:shadow-black/10")
                }
              >
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[service.tone]}`} />
                  <span className="font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
                    {service.status}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-foreground">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{service.body}</p>
                {cta && (
                  <span className="mt-4 inline-block font-condensed text-xs uppercase tracking-wider text-teal-deep">
                    {cta}
                  </span>
                )}
              </motion.div>
            );

            return clickable && "href" in service ? (
              <Link key={service.title} href={service.href} className="block">
                {card}
              </Link>
            ) : (
              <div key={service.title}>{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
