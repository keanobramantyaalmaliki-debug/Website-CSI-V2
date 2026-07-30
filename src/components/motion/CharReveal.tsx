"use client";

import { motion, useReducedMotion } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.022, delayChildren: 0.05 } },
};

const char = {
  hidden: { opacity: 0, y: 8, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: EASE },
  },
};

/**
 * T7 — per-character reveal (blur→sharp, y-slide) driven on enter-view.
 * Signature "atmospheric" heading reveal (ala izanami hero statement).
 *
 * A11y: wrapper carries the full text as aria-label; every visual span is
 * aria-hidden with `whitespace: pre` so spaces survive and screen readers
 * read the sentence intact — never loose letters.
 *
 * Reduced-motion: renders the text immediately, no transform/blur/stagger.
 */
export default function CharReveal({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <span className={className}>{text}</span>;
  }

  return (
    <motion.span
      className={className}
      aria-label={text}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      variants={container}
      transition={{ delayChildren: delay }}
    >
      {Array.from(text).map((c, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          variants={char}
          style={{ display: "inline-block", whiteSpace: "pre", willChange: "transform, filter" }}
        >
          {c}
        </motion.span>
      ))}
    </motion.span>
  );
}
