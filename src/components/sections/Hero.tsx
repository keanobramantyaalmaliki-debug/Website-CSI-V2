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
 * ⚠️ SAAT INI TIDAK TERPAKAI. Percabangan `reduced ? <StaticHero/> : <Scene/>`
 * hilang dari render saat resolusi konflik di PR #4 (73bdca6), jadi <Scene/>
 * kini selalu di-mount dan komponen ini jadi kode mati. Sengaja TIDAK dihapus:
 * ini fitur comfort yang disengaja, dan menghapusnya diam-diam sama saja
 * mengulang cara ia hilang. Keputusan mengembalikan atau membuangnya ada di
 * pemiliknya.
 *
 * Kalau dikembalikan, pemantik `setSceneReady` di bawah WAJIB ikut — tanpa itu
 * overlay loader menutupi situs selamanya di jalur ini. Lihat INVARIANTS.md §3.
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
  const setSceneReady = useSceneStore((s) => s.setSceneReady);
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

  // ── Jaring pengaman: reduced-motion tetap menyalakan sceneReady ──────────
  // Saat ini efek ini TIDAK PERNAH menyala, karena <Scene/> selalu di-mount
  // (percabangan reduced-motion hilang di PR #4 — lihat catatan di StaticHero).
  // Ia sengaja dipasang lebih dulu, sebagai pengaman untuk saat percabangan itu
  // dikembalikan.
  //
  // Kalau kembali TANPA ini, situsnya tidak bisa dipakai sama sekali di bawah
  // prefers-reduced-motion, dan gejalanya tidak menunjuk ke sini sedikit pun:
  // LoadingScreen (overlay putih z-[60]) hanya memulai outro saat `sceneReady`
  // true, dan satu-satunya yang menyalakannya adalah useFrame di Office.tsx —
  // yang hidup DI DALAM <Scene/>. Tanpa Scene, sceneReady selamanya false,
  // jaring pengaman 1500 ms di LoadingScreen bahkan tidak pernah terpasang
  // karena ia sendiri digerbangi sceneReady, dan layar putih menutupi situs
  // SELAMANYA.
  //
  // Pola yang sama dengan bug frameloop (INVARIANTS.md §1): <StaticHero/> lahir
  // di cabang comfort-redesign, LoadingScreen di cabang loading-screen, dan
  // keduanya benar sendiri-sendiri. Rusaknya cuma di persimpangan.
  // Lihat INVARIANTS.md §3.
  useEffect(() => {
    if (!reduced) return;
    setSceneReady(true);
  }, [reduced, setSceneReady]);

  return (
    <section ref={sectionRef} id="office" className="relative h-dvh w-full">
      <div className="absolute inset-0">
        {/* fallback null: overlay LoadingScreen (di App.tsx) yang menutupi
            layar selama chunk ini diunduh, jadi fallback di sini cuma akan
            berkedip di belakangnya tanpa pernah terlihat. */}
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </div>
    </section>
  );
}
