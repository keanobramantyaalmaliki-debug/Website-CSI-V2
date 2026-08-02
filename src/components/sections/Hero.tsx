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

  // Canvas recede: opacity 1→0, scale 1→0.96, y drift upward — must finish
  // BEFORE the sticky child unpins, not just before the track ends.
  //
  // scrollYProgress here spans the full 180dvh track ("start start" → "end
  // start"), but the sticky canvas (h-dvh inside a 180dvh track) actually
  // unpins at trackHeight - stickyHeight = 180dvh - 100dvh = 80dvh, i.e.
  // progress ≈ 0.444 — not at progress 1.0. Fading over [0.6, 1.0] left the
  // canvas fully opaque for a ~28dvh window after it had already unpinned
  // and started scrolling with the page, so it visibly reappeared below
  // HeroHandoff's fixed-height seam (see INVARIANTS.md §2 area, reported as
  // "kepotong saat discroll"). Fading over [0.28, 0.44] instead completes
  // the recede just as the element unpins, so nothing scrolls away visibly.
  const { scrollYProgress } = useScroll({
    target: heroTrackRef,
    offset: ["start start", "end start"],
  });
  const canvasOpacity = useTransform(scrollYProgress, [0.28, 0.44], [1, 0]);
  const canvasScale   = useTransform(scrollYProgress, [0.28, 0.44], [1, 0.96]);
  const canvasY       = useTransform(scrollYProgress, [0.28, 0.44], [0, -20]);

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
          {/* fallback null: overlay LoadingScreen (di SiteLayout) yang menutupi
              layar selama chunk ini diunduh, jadi fallback di sini cuma akan
              berkedip di belakangnya tanpa pernah terlihat. */}
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </motion.div>

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
