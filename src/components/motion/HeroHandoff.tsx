"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

/**
 * Cinematic bridge between the 3D hero and the first content section.
 * Purpose (one sentence): make "leaving the office" feel continuous instead of
 * a hard cut — the dark scene color melts into the lifted content base as you
 * scroll out of the hero.
 *
 * Comfort/restraint: purely scroll-linked opacity on a gradient (no pin, no
 * hijack, GPU-safe transform/opacity only). Under reduced motion it renders as
 * a plain static gradient seam — no scroll coupling.
 */
export default function HeroHandoff() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Faint guide line + label strengthen as the seam enters, then fade — a beat
  // that reads as "transition", not decoration.
  const lineOpacity = useTransform(scrollYProgress, [0.2, 0.5, 0.8], [0, 0.5, 0]);
  const labelOpacity = useTransform(scrollYProgress, [0.25, 0.5, 0.75], [0, 1, 0]);
  const labelY = useTransform(scrollYProgress, [0.25, 0.5], [12, 0]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      /* h-16 di HP (dulu h-40 di semua ukuran).
         Sejak hero dipendekkan jadi 70dvh (lihat Hero.tsx), sisa layar cuma
         ±256px di iPhone 15 — dan seam ini sendirian memakan 160px, menyisakan
         terlalu sedikit untuk baris pertama Manifesto muncul. Karena ia murni
         dekoratif (`aria-hidden`, cuma gradien), ia yang mengalah.
         Desktop tidak berubah: `sm:h-52` tetap, dan di sana hero masih setinggi
         layar penuh sehingga seam ini punya ruangnya sendiri. */
      className="relative h-16 w-full overflow-hidden sm:h-52"
      style={{
        background:
          "linear-gradient(to bottom, #0a0a0c 0%, #0f1116 45%, #14161b 100%)",
      }}
    >
      {reduced ? null : (
        <>
          {/* center guide line */}
          <motion.div
            style={{ opacity: lineOpacity }}
            className="absolute left-1/2 top-1/2 h-16 w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-accent/60 to-transparent"
          />
          {/* transition label */}
          <motion.p
            style={{ opacity: labelOpacity, y: labelY }}
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[10px] uppercase tracking-[0.35em] text-zinc-500"
          >
            Leaving the office
          </motion.p>
        </>
      )}
    </div>
  );
}
