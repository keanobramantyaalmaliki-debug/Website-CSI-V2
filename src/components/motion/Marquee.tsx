"use client";

import { useRef } from "react";
import { useInView, useReducedMotion } from "motion/react";

/**
 * T5 — infinite horizontal marquee strip.
 * Items are duplicated to create a seamless loop (x: 0 → -50% → loop).
 *
 * Animasinya CSS keyframes (`marquee-scroll` di index.css), BUKAN tween
 * motion/react lagi. Versi motion `repeat: Infinity` terus berdetak di rAF
 * selama mounted — termasuk saat strip jauh di luar viewport — dan ikut
 * terdaftar sebagai beban permanen di audit panas-laptop 3 Agu 2026.
 *
 * `useInView` hanya menyetel `animation-play-state`: CSS `paused` benar-benar
 * menghentikan kalkulasi browser dan resume melanjutkan dari posisi terakhir.
 * Kalau diganti dengan me-mount/unmount animasinya, posisi loop akan melompat
 * ke awal tiap kali strip masuk viewport lagi.
 */
export default function Marquee({
  items,
  speed = 25,
}: {
  items: string[];
  speed?: number;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const duration = items.length * speed;

  if (reduced) {
    return (
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200"
          >
            {item}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="overflow-hidden">
      <div
        className="flex w-max gap-6"
        style={{
          animation: `marquee-scroll ${duration}s linear infinite`,
          animationPlayState: inView ? "running" : "paused",
        }}
      >
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className="whitespace-nowrap rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
