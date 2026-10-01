"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Eye, ScanFace } from "lucide-react";

// Same source copy DiseaseInfoDialog shows post-screen (components/
// multidisease/disease-explanations.ts) -- condensed to the one line that
// carries the point, not reworded, so a visitor who reads this here and
// later opens "Có thể bạn chưa biết" on a real result sees the same claim
// twice, not two versions of it. Cataract used to be one of these four --
// moved out into its own featured card below once /cataract became a real,
// fully working standalone screening page, the same promotion glaucoma got
// before it.
const OTHER_CONDITIONS = [
  {
    label: "Thoái hóa điểm vàng",
    color: "var(--color-sev-3)",
    body: "Vùng điểm vàng — trung tâm võng mạc, chịu trách nhiệm nhìn chi tiết — bị thoái hóa dần.",
  },
  {
    label: "Võng mạc do tăng huyết áp",
    color: "var(--color-sev-4)",
    body: "Huyết áp cao kéo dài có thể làm hẹp và tổn thương mạch máu võng mạc.",
  },
  {
    label: "Cận thị bệnh lý",
    color: "var(--color-sev-1)",
    body: "Trục nhãn cầu dài quá mức khiến ảnh hội tụ trước võng mạc, gây nhìn xa mờ.",
  },
] as const;

/** "Bệnh về mắt" -- sits right after the hero (id="nhan-dien"), before
 * ServicesSection: the hero already promises several AI screening services,
 * so before pitching those as services, this section motivates WHY a second
 * disease matters, glaucoma especially -- it's the one condition in this
 * app's own copy (disease-explanations.ts) whose defining trait is that it
 * "diễn tiến âm thầm" (progresses silently), which is exactly the case for
 * screening to catch early. Same card language as ServicesSection right
 * after it (glossy/bubble on card/80 + backdrop-blur, condensed-caps status
 * row, teal-deep eyebrow) so the two sections read as one family, not two
 * different design passes.
 *
 * Glaucoma and cataract each get their own full-width featured card (their
 * own colors everywhere else this app shows them -- teal-deep and sev-1)
 * and the only working links here: straight to /glaucoma and /cataract, the
 * standalone specialist models' own screening pages, not the multidisease
 * flow either used to only be reachable through -- not "sắp ra mắt"
 * placeholders either, since both pages are fully working (cataract's the
 * newer promotion: real backend, real persistence, its own confirm-crop
 * flow). Cataract's card also has to say the one thing that makes it
 * different from every other card on this whole page: it wants a close-up
 * face/eye photo, not a fundus photo. The remaining conditions stay plain
 * and non-clickable -- context for why multi-disease screening matters, not
 * a queue of features each needing their own status (AMD has a real backend
 * too now, same as glaucoma/cataract, but stays a plain card here rather
 * than a third featured slot -- this section was never meant to grow a
 * featured card per screening feature). */
export function EyeConditionsSection() {
  return (
    <section id="benh-ve-mat" className="relative mx-auto max-w-6xl px-6 pt-24 pb-8 sm:px-10">
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mb-3 font-condensed text-xs uppercase tracking-[0.3em] text-teal-deep"
      >
        Bệnh về mắt
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
      >
        Nhiều bệnh mắt tiến triển âm thầm, không chỉ võng mạc tiểu đường.
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground"
      >
        Từ cùng một ảnh chụp đáy mắt, Sàng lọc đa bệnh có thể gợi ý dấu hiệu của những bệnh lý dưới đây — sớm hơn là chờ
        đến khi có triệu chứng.
      </motion.p>

      <div className="mt-10 flex flex-col gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/glaucoma"
            className="glossy shadow-bubble group flex flex-col gap-5 rounded-3xl border border-teal-deep/25 bg-linear-to-br from-teal/10 via-card to-card px-7 py-7 backdrop-blur-xl transition-shadow hover:shadow-xl hover:shadow-black/10 sm:flex-row sm:items-center sm:justify-between sm:px-8"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-deep" />
                <span className="font-condensed text-[10px] uppercase tracking-wider text-teal-deep">
                  Sàng lọc chuyên biệt
                </span>
              </div>
              <h3 className="mt-3 flex items-center gap-2 text-xl font-semibold text-foreground">
                <Eye className="h-4 w-4 shrink-0 text-teal-deep" strokeWidth={1.75} />
                Tăng nhãn áp (Glaucoma)
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Áp lực trong mắt tăng cao, có thể làm tổn thương dây thần kinh thị giác theo thời gian — thường{" "}
                <strong className="font-medium text-foreground">diễn tiến âm thầm</strong>, và mất thị lực ngoại vi
                thường chỉ xuất hiện khi đã ở giai đoạn muộn.
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 self-start rounded-full border border-teal-deep/30 bg-card px-4 py-2 text-sm font-medium text-teal-deep transition-transform group-hover:translate-x-0.5 sm:self-center">
              Sàng lọc ngay
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <Link
            href="/cataract"
            className="glossy shadow-bubble group flex flex-col gap-5 rounded-3xl border border-sev-1/25 bg-linear-to-br from-sev-1/10 via-card to-card px-7 py-7 backdrop-blur-xl transition-shadow hover:shadow-xl hover:shadow-black/10 sm:flex-row sm:items-center sm:justify-between sm:px-8"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sev-1" />
                <span className="font-condensed text-[10px] uppercase tracking-wider text-sev-1">
                  Sàng lọc chuyên biệt · ảnh cận mặt/mắt
                </span>
              </div>
              <h3 className="mt-3 flex items-center gap-2 text-xl font-semibold text-foreground">
                <ScanFace className="h-4 w-4 shrink-0 text-sev-1" strokeWidth={1.75} />
                Đục thủy tinh thể (Cataract)
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Thủy tinh thể mờ đục dần theo tuổi tác — tiến triển chậm nên dễ bị bỏ qua ở giai đoạn đầu. Mô hình
                chuyên biệt nhận diện qua ảnh chụp cận mặt/mắt,{" "}
                <strong className="font-medium text-foreground">không phải ảnh đáy mắt</strong> như các sàng lọc
                còn lại.
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 self-start rounded-full border border-sev-1/30 bg-card px-4 py-2 text-sm font-medium text-sev-1 transition-transform group-hover:translate-x-0.5 sm:self-center">
              Sàng lọc ngay
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {OTHER_CONDITIONS.map((condition, i) => (
            <motion.div
              key={condition.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: 0.08 * (i + 1) }}
              className="rounded-3xl border border-border/60 bg-card/80 px-6 py-6 backdrop-blur-xl"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: condition.color }} />
              <h3 className="mt-3 text-base font-semibold text-foreground">{condition.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{condition.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
