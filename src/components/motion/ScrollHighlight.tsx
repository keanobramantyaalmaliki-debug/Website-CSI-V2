"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

/** Single word whose color is driven by scroll progress (or shown bright immediately if motion reduced). */
function Word({
  word,
  progress,
  index,
  total,
}: {
  word: string;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  index: number;
  total: number;
}) {
  const reduced = useReducedMotion();
  const start = index / total;
  const end = Math.min((index + 2) / total, 1);
  // When reduced: both stops are bright → no animation, words appear at full opacity
  const color = useTransform(
    progress,
    [start, end],
    reduced ? ["#f4f4f5", "#f4f4f5"] : ["#52525b", "#f4f4f5"]
  );
  return (
    <motion.span style={{ color }} className="mr-[0.25em] inline-block">
      {word}
    </motion.span>
  );
}

/**
 * T3 — scroll-driven word highlight.
 * Words transition from zinc-600 to zinc-100 as the element scrolls through the viewport.
 * Renders consistent markup for SSR; reduced-motion handled inside Word.
 */
export default function ScrollHighlight({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.3"],
  });

  const words = text.split(" ");

  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => (
        <Word
          key={`${word}-${i}`}
          word={word}
          progress={scrollYProgress}
          index={i}
          total={words.length}
        />
      ))}
    </p>
  );
}
