"use client";

import { lazy, Suspense, useEffect, useRef } from "react";
import { useSceneStore } from "@/lib/store/sceneStore";

const Scene = lazy(() => import("@/components/canvas/Scene"));
const RoomNav = lazy(() => import("@/components/ui/RoomNav"));
const BilliardHUD = lazy(() => import("@/components/ui/BilliardHUD"));

/**
 * HERO — 3D office tour, satu viewport penuh.
 * 3D "selesai" di sini: scroll ke bawah = keluar dari 3D masuk konten web normal.
 */
export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const setHeroInView = useSceneStore((s) => s.setHeroInView);

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
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center bg-black">
              <p className="animate-pulse text-sm text-zinc-500">Turning on the lights…</p>
            </div>
          }
        >
          <Scene />
        </Suspense>
      </div>

      {/* Room title, nav dots, scroll-to-explore hint */}
      <Suspense fallback={null}>
        <RoomNav />
      </Suspense>

      {/* Bar tenaga + kontrol minigame billiard (muncul saat meja diklik) */}
      <Suspense fallback={null}>
        <BilliardHUD />
      </Suspense>

      {/* "see our work" — scroll ke konten di bawah hero */}
      <a
        href="#manifesto"
        className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <span className="text-xs tracking-widest uppercase">see our work</span>
        <span className="animate-bounce text-zinc-300">↓</span>
      </a>
    </section>
  );
}
