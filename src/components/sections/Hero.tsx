"use client";

import dynamic from "next/dynamic";

const Scene = dynamic(() => import("@/components/canvas/Scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-black">
      <p className="animate-pulse text-sm text-zinc-500">Turning on the lights…</p>
    </div>
  ),
});

const RoomNav = dynamic(() => import("@/components/ui/RoomNav"), { ssr: false });

/**
 * HERO — 3D office tour, satu viewport penuh.
 * 3D "selesai" di sini: scroll ke bawah = keluar dari 3D masuk konten web normal.
 */
export default function Hero() {
  return (
    <section id="office" className="relative h-dvh w-full">
      <div className="absolute inset-0">
        <Scene />
      </div>

      {/* Room title, nav dots, scroll-to-explore hint */}
      <RoomNav />

      {/* "see our work" — scroll ke konten di bawah hero */}
      <a
        href="#deployments"
        className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <span className="text-xs tracking-widest uppercase">see our work</span>
        <span className="animate-bounce text-zinc-300">↓</span>
      </a>
    </section>
  );
}
