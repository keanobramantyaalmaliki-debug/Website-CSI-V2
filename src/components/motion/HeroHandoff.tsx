"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

/**
 * Cinematic bridge between the 3D hero and the first content section.
 * Purpose: make "leaving the office" feel continuous — the content plate
 * physically slides up over the pinned 3D scene with an opaque rounded seam,
 * rather than a hard cut.
 *
 * Full-motion path: this element has a negative top margin (-mt-32) so it
 * visually overlaps the bottom of the sticky hero zone while the 3D is still
 * receding. z-20 puts the seam above the canvas (z-10 stacking context inside
 * <main>) but below Navbar (fixed z-50). Opaque gradient ensures the 3D is
 * fully covered as soon as the seam arrives.
 *
 * Reduced-motion: plain static gradient seam, normal flow, no overlap.
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
  const lineOpacity  = useTransform(scrollYProgress, [0.2, 0.5, 0.8], [0, 0.5, 0]);
  const labelOpacity = useTransform(scrollYProgress, [0.25, 0.5, 0.75], [0, 1, 0]);
  const labelY       = useTransform(scrollYProgress, [0.25, 0.5], [12, 0]);

  // Reduced-motion: plain static seam, no negative margin, no z layering needed.
  if (reduced) {
    return (
      <div
        aria-hidden="true"
        className="relative h-40 w-full overflow-hidden sm:h-52"
        style={{
          background: "linear-gradient(to bottom, #0a0a0c 0%, #0f1116 45%, #14161b 100%)",
        }}
      />
    );
  }

  return (
    // Negative top margin pulls the seam up into the sticky hero zone, so it
    // appears to slide over the pinned canvas. z-20 > canvas z-10.
    <div
      ref={ref}
      aria-hidden="true"
      className="relative z-20 -mt-32 h-40 w-full overflow-hidden rounded-t-3xl border-t border-white/10 sm:h-52"
      style={{
        background: "linear-gradient(to bottom, #0a0a0c 0%, #0f1116 45%, #14161b 100%)",
      }}
    >
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
    </div>
  );
}
