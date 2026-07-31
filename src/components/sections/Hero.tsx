"use client";

import { lazy, Suspense, useEffect, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useSceneStore } from "@/lib/store/sceneStore";

const Scene = lazy(() => import("@/components/canvas/Scene"));
const BilliardHUD = lazy(() => import("@/components/ui/BilliardHUD"));

/**
 * HERO — 3D office tour, satu viewport penuh.
 * 3D "selesai" di sini: scroll ke bawah = keluar dari 3D masuk konten web normal.
 *
 * Comfort/perf: under prefers-reduced-motion we skip the heavy WebGL scene
 * entirely and show a calm static hero. Saves the GPU/bundle cost for users who
 * asked for less motion, and keeps the page smooth on low-end devices.
 *
 * Full-motion path: the section becomes a 180dvh scroll track. Inside it, a
 * sticky h-dvh viewport pins the Scene canvas on screen. As the user scrolls
 * through the extra ~80dvh the canvas wrapper gently recedes (opacity+scale),
 * while the content plate (HeroHandoff) slides up over it. Camera is never
 * moved — only the canvas wrapper div is transformed (frameloop="demand" safe).
 */
function StaticHero() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#0d0f13]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(249,115,22,0.10), transparent 70%), linear-gradient(to bottom, #14161b, #0b0c10)",
        }}
      />
      <img
        src="/brand/Logo-Final.png"
        alt="Cogniti"
        width={220}
        height={88}
        className="relative z-10 opacity-90"
      />
    </div>
  );
}

export default function Hero() {
  const heroTrackRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const setHeroInView = useSceneStore((s) => s.setHeroInView);
  const reduced = useReducedMotion();

  // Anchor heroInView to the sticky viewport (h-dvh inner div), not the
  // 180dvh track, so Navbar transparency and Waypoints unmount keep their
  // current timing — they depend on when the 3D is actually visible on screen.
  useEffect(() => {
    const el = reduced ? heroTrackRef.current : stickyRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroInView(entry.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [setHeroInView, reduced]);

  // Canvas recede: opacity 1→0, scale 1→0.96, y drift upward over last 40% of
  // the scroll track. CSS transforms on the canvas wrapper don't wake R3F's
  // frameloop="demand" — purely GPU-composited, camera untouched.
  const { scrollYProgress } = useScroll({
    target: heroTrackRef,
    offset: ["start start", "end start"],
  });
  const canvasOpacity = useTransform(scrollYProgress, [0.6, 1.0], [1, 0]);
  const canvasScale   = useTransform(scrollYProgress, [0.6, 1.0], [1, 0.96]);
  const canvasY       = useTransform(scrollYProgress, [0.6, 1.0], [0, -20]);

  // Reduced-motion: revert to original h-dvh normal-flow hero, no pin/recede.
  if (reduced) {
    return (
      <section ref={heroTrackRef} id="office" className="relative h-dvh w-full">
        <div className="absolute inset-0">
          <StaticHero />
        </div>
        <Suspense fallback={null}>
          <BilliardHUD />
        </Suspense>
        <a
          href="#manifesto"
          className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <span className="text-xs tracking-widest uppercase">see our work</span>
          <span className="text-zinc-300">↓</span>
        </a>
      </section>
    );
  }

  return (
    // 180dvh scroll track — the extra ~80dvh is the "pin runway" where 3D
    // stays on screen and content slides up over it.
    <section ref={heroTrackRef} id="office" className="relative h-[180dvh] w-full">
      {/* Sticky viewport — stays fixed at top while track scrolls past */}
      <div ref={stickyRef} className="sticky top-0 h-dvh w-full">
        {/* Canvas wrapper — CSS transforms only, camera is never touched */}
        <motion.div
          className="absolute inset-0"
          style={{ opacity: canvasOpacity, scale: canvasScale, y: canvasY }}
        >
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center bg-[#0d0f13]">
                <p className="animate-pulse text-sm text-zinc-400">Turning on the lights…</p>
              </div>
            }
          >
            <Scene />
          </Suspense>
        </motion.div>

        {/* Navigasi antar ruangan sekarang lewat waypoint 3D di dalam Canvas
            (Waypoints.tsx), bukan tombol DOM. Lompat cepat tetap tersedia di
            dropdown "Office" pada Navbar. */}

        {/* Bar tenaga + kontrol minigame billiard (muncul saat meja diklik) */}
        <Suspense fallback={null}>
          <BilliardHUD />
        </Suspense>

        {/* "see our work" — scroll ke konten di bawah hero */}
        <a
          href="#manifesto"
          className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <span className="text-xs tracking-widest uppercase">see our work</span>
          <span className="animate-bounce text-zinc-300">↓</span>
        </a>
      </div>
    </section>
  );
}
