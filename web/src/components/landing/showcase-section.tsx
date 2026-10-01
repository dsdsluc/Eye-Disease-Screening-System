"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import Autoplay from "embla-carousel-autoplay";

import { ScopeFrame } from "@/components/scope-frame";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

const GRADES = [
  { grade: 0, label: "Không DR", color: "var(--color-sev-0)", src: "/samples/grade-0.png" },
  { grade: 1, label: "Nhẹ", color: "var(--color-sev-1)", src: "/samples/grade-1.png" },
  { grade: 2, label: "Trung bình", color: "var(--color-sev-2)", src: "/samples/grade-2.png" },
  { grade: 3, label: "Nặng", color: "var(--color-sev-3)", src: "/samples/grade-3.png" },
  { grade: 4, label: "Tăng sinh", color: "var(--color-sev-4)", src: "/samples/grade-4.png" },
] as const;

export function ShowcaseSection() {
  const reduced = useReducedMotion();
  const autoplay = useRef(Autoplay({ delay: 2600, stopOnInteraction: false, stopOnMouseEnter: true }));

  return (
    <section id="thang-cham-diem" className="px-4 pt-32 pb-20 sm:px-6">
      {/* A dark "display case" -- the same signature ScopeFrame aperture used
          for the upload/result screens, now showing all 5 grades glowing
          against a dark stage, echoing the app's core visual instead of
          another light card grid. */}
      <div className="dark glossy relative overflow-hidden rounded-[2.5rem] bg-[#12312e] py-16 text-[#f4f1ea]">
        <div className="relative mx-auto max-w-6xl px-6">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mb-3 font-condensed text-xs uppercase tracking-[0.3em] text-[#7fd6cc]"
          >
            Thang chấm điểm
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            5 mức độ, cùng một thang đánh giá chuẩn quốc tế.
          </motion.h2>
        </div>

        <div className="relative mx-auto mt-14 max-w-6xl px-6">
          <Carousel opts={{ loop: true, align: "start" }} plugins={reduced ? [] : [autoplay.current]}>
            <CarouselContent>
              {GRADES.map((g) => (
                <CarouselItem key={g.grade} className="basis-[68%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <ScopeFrame size={220} ringColor={g.color}>
                      <Image
                        src={g.src}
                        alt={`Ảnh mẫu mức độ ${g.grade} - ${g.label}`}
                        fill
                        className="object-cover"
                        sizes="220px"
                      />
                    </ScopeFrame>
                    <div>
                      <p className="font-mono text-base font-semibold">Mức {g.grade}</p>
                      <p className="font-condensed text-[10px] uppercase tracking-wider text-[#f4f1ea]/60">
                        {g.label}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
  );
}
