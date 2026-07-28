"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** T1 — clip-mask heading reveal. Wrap text inside a heading/p element. */
export default function LineMask({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });
  const reduced = useReducedMotion();

  return (
    <span ref={ref} className="block overflow-hidden">
      <motion.span
        className="block"
        initial={{ y: reduced ? 0 : "110%" }}
        animate={inView ? { y: 0 } : undefined}
        transition={{ duration: 0.8, ease: EASE, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}
