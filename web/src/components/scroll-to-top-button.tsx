"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowUp } from "lucide-react";
import { useState } from "react";

/** Mirrors SideNav's fixed floating-pill treatment, but SideNav only shows
 * at `xl:` -- this covers the mobile/tablet visitor who scrolled the whole
 * long single-page marketing site and has no quick way back to the top
 * (or to the header nav) without a long manual scroll. */
export function ScrollToTopButton() {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setVisible(y > 800));

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.9 }}
          transition={{ duration: 0.25 }}
          aria-label="Lên đầu trang"
          className="glossy shadow-bubble fixed right-6 bottom-6 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/90 text-foreground backdrop-blur-md transition-colors hover:bg-secondary"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={1.75} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
