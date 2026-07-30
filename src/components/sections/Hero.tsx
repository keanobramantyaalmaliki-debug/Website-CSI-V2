"use client";

import { lazy, Suspense, useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useSceneStore } from "@/lib/store/sceneStore";

const Scene = lazy(() => import("@/components/canvas/Scene"));
const RoomNav = lazy(() => import("@/components/ui/RoomNav"));
const BilliardHUD = lazy(() => import("@/components/ui/BilliardHUD"));

/**
 * HERO — 3D office tour, satu viewport penuh.
 * 3D "selesai" di sini: scroll ke bawah = keluar dari 3D masuk konten web normal.
 *
 * Comfort/perf: under prefers-reduced-motion we skip the heavy WebGL scene
 * entirely and show a calm static hero. Saves the GPU/bundle cost for users who
 * asked for less motion, and keeps the page smooth on low-end devices.
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
  const sectionRef = useRef<HTMLElement>(null);
  const setHeroInView = useSceneStore((s) => s.setHeroInView);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroInView(entry.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [setHeroInView]);

  return (
    <section ref={sectionRef} id="office" className="relative h-dvh w-full">
      <div className="absolute inset-0">
        {reduced ? (
          <StaticHero />
        ) : (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center bg-[#0d0f13]">
                <p className="animate-pulse text-sm text-zinc-400">Turning on the lights…</p>
              </div>
            }
          >
            <Scene />
          </Suspense>
        )}
      </div>

      {/* 3D tour controls — only when the scene is actually mounted */}
      {!reduced && (
        <>
          <Suspense fallback={null}>
            <RoomNav />
          </Suspense>
          <Suspense fallback={null}>
            <BilliardHUD />
          </Suspense>
        </>
      )}

      {/* "see our work" — scroll ke konten di bawah hero */}
      <a
        href="#manifesto"
        className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-zinc-400 transition-colors hover:text-zinc-200"
      >
        <span className="text-xs tracking-widest uppercase">see our work</span>
        <span className={reduced ? "text-zinc-300" : "animate-bounce text-zinc-300"}>↓</span>
      </a>
    </section>
  );
}
