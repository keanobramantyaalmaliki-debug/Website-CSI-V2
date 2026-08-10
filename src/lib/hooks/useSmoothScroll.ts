"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { cancelFrame, frame, useReducedMotion } from "motion/react";
import { registerLenis } from "@/lib/smoothScroll";

/**
 * Siklus hidup Lenis — momentum scroll wheel/trackpad di desktop.
 *
 * autoRaf: false + frame.update() dari motion/react adalah inti, bukan
 * detail: kalau Lenis diberi rAF sendiri, ia menulis scrollY di loop yang
 * berbeda dari loop tempat motion membaca scrollYProgress. Akibatnya fade
 * canvas Hero tertinggal satu frame di belakang scroll dan terlihat sebagai
 * getar halus. Mengikat keduanya ke frameloop motion membuat keduanya
 * membaca/menulis di frame yang sama — pola resmi Lenis untuk Framer Motion.
 *
 * Reduced-motion: tidak instantiate sama sekali (bukan cuma memaksa lerp: 1)
 * — lebih murah dan sejalan dengan idiom repo (Hero.tsx melewati seluruh
 * WebGL untuk kasus yang sama).
 */
export default function useSmoothScroll() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const lenis = new Lenis({
      lerp: 0.09,
      smoothWheel: true,
      syncTouch: false,
      anchors: true,
      autoRaf: false,
    });

    registerLenis(lenis);

    const update = ({ timestamp }: { timestamp: number }) => lenis.raf(timestamp);
    frame.update(update, true);

    return () => {
      cancelFrame(update);
      registerLenis(null);
      lenis.destroy();
    };
  }, [reduced]);
}
