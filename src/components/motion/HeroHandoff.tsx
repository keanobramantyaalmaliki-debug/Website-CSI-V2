"use client";

import { useReducedMotion } from "motion/react";

/**
 * Opaque seam between the pinned 3D hero and the first content section.
 * Full-motion: -mt-32 pulls it up into the sticky hero zone (slides over the
 * receding canvas). z-20 > canvas, < Navbar z-50. Reduced-motion: normal-flow,
 * no overlap.
 */
export default function HeroHandoff() {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div
        aria-hidden="true"
        className="h-20 w-full"
        style={{ background: "linear-gradient(to bottom, #0a0a0c 0%, #14161b 100%)" }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      /* h-20 (80px) — jauh lebih ramping dari h-40/h-52 versi lama, dan itu
         menopang dua hal sekaligus: seam ini menyelip ke zona sticky lewat
         `-mt-32` (desain `join`), DAN di HP hero cuma 70dvh sehingga sisa
         layarnya harus disisakan untuk Manifesto yang mengintip. Karena ia
         murni dekoratif (`aria-hidden`), ia yang mengalah kalau ruang sempit. */
      className="relative z-20 -mt-32 h-20 w-full rounded-t-3xl border-t border-white/10"
      style={{ background: "linear-gradient(to bottom, #0a0a0c 0%, #14161b 100%)" }}
    />
  );
}
