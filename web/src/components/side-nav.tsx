"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";

import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "nhan-dien", label: "Nhận diện" },
  { id: "benh-ve-mat", label: "Bệnh về mắt" },
  { id: "dich-vu", label: "Dịch vụ" },
  { id: "thang-cham-diem", label: "Thang điểm" },
  { id: "cach-hoat-dong", label: "Quy trình" },
  { id: "do-tin-cay", label: "Độ tin cậy" },
] as const;

/**
 * A separate quick-jump rail, distinct from the header: appears fixed on the
 * left once the hero has scrolled past, tracks which section is in view, and
 * lets a long-scroll visitor jump around without scrolling back to the top.
 */
export function SideNav() {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useMotionValueEvent(scrollY, "change", (y) => setVisible(y > 480));

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    for (const { id } of SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          aria-label="Điều hướng nhanh theo mục"
          className="glossy shadow-bubble fixed top-1/2 left-6 z-20 hidden -translate-y-1/2 flex-col gap-1 rounded-full border border-border/60 bg-card/90 p-2 backdrop-blur-md xl:flex"
        >
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="group relative flex items-center px-2 py-2" aria-label={s.label}>
              <span
                className={cn(
                  "h-2 w-2 rounded-full transition-all duration-300",
                  active === s.id ? "scale-125 bg-teal-deep" : "bg-border group-hover:bg-muted-foreground"
                )}
              />
              <span className="pointer-events-none absolute left-full ml-3 rounded-md bg-card px-2.5 py-1 font-condensed text-[10px] whitespace-nowrap uppercase tracking-wider text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                {s.label}
              </span>
            </a>
          ))}
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
