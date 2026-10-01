"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useMotionValue } from "motion/react";

export function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState((0).toFixed(decimals));

  useEffect(() => {
    return motionValue.on("change", (v) => setDisplay(v.toFixed(decimals)));
  }, [motionValue, decimals]);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(motionValue, value, { duration: 1.3, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [isInView, value, motionValue]);

  return <span ref={ref}>{display}</span>;
}
