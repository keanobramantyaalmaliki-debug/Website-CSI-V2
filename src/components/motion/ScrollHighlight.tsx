"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "motion/react";

/** Single word whose color is driven by scroll progress (or shown bright immediately if motion reduced). */
function Word({
  word,
  progress,
  start,
  end,
}: {
  word: string;
  progress: MotionValue<number>;
  start: number;
  end: number;
}) {
  const reduced = useReducedMotion();
  // Comfort-first: text is ALWAYS readable. The scroll effect is a subtle emphasis
  // (already-legible → full-bright), never a dark→light reveal that hides content.
  // When reduced: both stops are full-bright → no animation.
  const color = useTransform(
    progress,
    [start, end],
    reduced ? ["#f4f5f7", "#f4f5f7"] : ["#a9adb6", "#f4f5f7"]
  );
  return (
    <motion.span style={{ color }} className="mr-[0.25em] inline-block">
      {word}
    </motion.span>
  );
}

interface Props {
  text: string;
  className?: string;
  /**
   * Penggerak dari luar. WAJIB diisi kalau paragraf ini berada di dalam section
   * yang menahan (PinnedSection): selama ditahan, posisi paragraf terhadap
   * layar tidak berubah, jadi pengukuran sendirinya berhenti dan sorotannya
   * membeku separuh jalan sampai pin-nya lepas.
   */
  progress?: MotionValue<number>;
  /**
   * Potongan `progress` yang jadi jatah paragraf ini, saat beberapa paragraf
   * berbagi satu penggerak dan harus menyala bergiliran. Diabaikan kalau
   * `progress` tidak diberikan — yang mengukur sendiri selalu memakai penuh.
   */
  range?: [number, number];
}

/**
 * T3 — scroll-driven word highlight.
 * Words transition from zinc-600 to zinc-100 as the element scrolls through the viewport.
 * Renders consistent markup for SSR; reduced-motion handled inside Word.
 */
export default function ScrollHighlight({
  text,
  className,
  progress,
  range = [0, 1],
}: Props) {
  const ref = useRef<HTMLParagraphElement>(null);
  // Selalu dipanggil supaya urutan hook tetap sama di kedua mode; hasilnya
  // diabaikan kalau pemanggilnya menyetir sendiri.
  const self = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.3"],
  });
  const driver = progress ?? self.scrollYProgress;
  const [from, to] = progress ? range : ([0, 1] as const);
  const span = to - from;

  const words = text.split(" ");

  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => (
        <Word
          key={`${word}-${i}`}
          word={word}
          progress={driver}
          start={from + (i / words.length) * span}
          // +2 supaya tiap kata masih menyala saat kata berikutnya mulai —
          // yang terbaca satu sapuan, bukan kata-kata yang berkedip sendiri.
          end={from + Math.min((i + 2) / words.length, 1) * span}
        />
      ))}
    </p>
  );
}
