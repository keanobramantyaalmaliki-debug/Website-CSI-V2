"use client";

import { lazy, Suspense, useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useSceneStore } from "@/lib/store/sceneStore";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";

const Scene = lazy(() => import("@/components/canvas/Scene"));
const BilliardHUD = lazy(() => import("@/components/ui/BilliardHUD"));
const WaypointLabel = lazy(() => import("@/components/ui/WaypointLabel"));

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
  const sectionRef = useRef<HTMLElement>(null);
  const setHeroInView = useSceneStore((s) => s.setHeroInView);
  const setSceneReady = useSceneStore((s) => s.setSceneReady);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();

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
    /**
     * Tinggi hero: 70% layar di HP, penuh mulai `md`.
     *
     * Dua masalah diselesaikan sekaligus oleh angka yang sama.
     *
     * 1. KONTEN TERLIHAT. Mengikuti basement.studio: canvas mereka ±71,5% dari
     *    tinggi layar di potret, sisanya headline. Hero setinggi layar penuh
     *    tidak memberi petunjuk bahwa ada halaman di bawahnya.
     *
     * 2. FRAMING 3D MELEBAR — ini yang tidak kelihatan sebagai soal layout.
     *    `fov: 60` di Scene.tsx itu fov VERTIKAL; yang terlihat kiri-kanan
     *    diturunkan dari aspect. Makin jangkung viewport-nya, makin sempit
     *    pandangannya. Terukur di iPhone 15 (393×852):
     *
     *      100dvh → hFOV 29,8°   ← sebelumnya; sepertiga desktop, terasa tele
     *       70dvh → hFOV 41,7°   ← +40% lebih lebar
     *      (desktop 16:9 → 91,5° sebagai pembanding)
     *
     *    Itulah kenapa kantor terasa "kepotong kanan-kirinya" di HP. Menurunkan
     *    tinggi hero MELEBARKAN framing-nya, bukan mengecilkan pemandangan.
     *
     * ⚠️ Patokannya breakpoint LEBAR (`md:`), sengaja BEDA dari gerbang
     * interaksi di INVARIANTS.md §6 yang memakai `pointer: coarse`. Bukan
     * kelalaian: yang ini soal BENTUK VIEWPORT (aspect rasio jangkung), yang
     * itu soal ADA-TIDAKNYA HOVER. Dua pertanyaan berbeda, dua patokan berbeda.
     * Bonusnya, layout tetap benar sebelum JS jalan — tidak ada lompatan tinggi
     * saat hidrasi.
     *
     * ⚠️ Angka 70 ini BERPASANGAN dengan jarak di HeroHandoff & Manifesto.
     * Sisa 30% (256px di iPhone 15) harus cukup untuk eyebrow + baris pertama
     * Manifesto. Dulu `HeroHandoff h-40` + `Manifesto pt-40` = 320px sendirian
     * sudah melebihi jatah itu, jadi keduanya ikut dirapatkan di mobile.
     * Menaikkan salah satunya tanpa menengok yang lain = Manifesto tidak
     * mengintip sama sekali dan seluruh perubahan ini sia-sia.
     */
    <section
      ref={sectionRef}
      id="office"
      className="relative h-[70dvh] w-full md:h-dvh"
    >
      <div className="absolute inset-0">
        {/* fallback null: overlay LoadingScreen (di App.tsx) yang menutupi
            layar selama chunk ini diunduh, jadi fallback di sini cuma akan
            berkedip di belakangnya tanpa pernah terlihat. */}
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </div>

      {/* Navigasi antar ruangan lewat waypoint 3D di dalam Canvas
          (Waypoints.tsx), bukan tombol DOM — dan waypoint itu MATI di
          perangkat sentuh (INVARIANTS.md §6), tempat navbar seharusnya
          mengambil alih. Baris ini dulu menyebut dropdown "Office" di Navbar
          sebagai lompat cepat; dropdown itu tidak ada lagi sejak a1a857a. */}

      {/* Dua overlay di bawah ini melayani interaksi yang TIDAK ADA di
          perangkat sentuh (INVARIANTS.md §6), jadi chunk-nya pun tak perlu
          diunduh di sana: keduanya lazy, dan `coarse` mencegah import-nya
          berjalan sama sekali. Ini bonus nyata di jaringan seluler.

          Gerbangnya di sini bersifat KOSMETIK — yang benar-benar mematikan
          interaksinya ada di Waypoints.tsx & Office.tsx (onClick meja). Urutan
          itu disengaja: HUD yang disembunyikan tanpa mematikan pintu masuknya
          akan mengunci pemain di pandangan atas meja tanpa tombol keluar. */}
      {!coarse && (
        <>
          {/* Bar tenaga + kontrol minigame billiard (muncul saat meja diklik) */}
          <Suspense fallback={null}>
            <BilliardHUD />
          </Suspense>

          {/* Label waypoint yang mengekor kursor. Di LUAR Canvas karena
              posisinya ditentukan kursor (screen-space), bukan titik di dunia
              3D — lihat ui/WaypointLabel.tsx. Sengaja bersebelahan dengan
              BilliardHUD: sama-sama overlay z-30, tingkat yang sama di
              INVARIANTS.md §2. */}
          <Suspense fallback={null}>
            <WaypointLabel />
          </Suspense>
        </>
      )}

      {/* "see our work" — petunjuk scroll, HANYA di layar lebar.
          Di HP hero cuma 70dvh sehingga Manifesto sudah mengintip sendiri di
          bawah canvas; petunjuk "ada halaman di bawah" jadi mubazir, dan ia
          memakan ruang yang justru dibutuhkan konten. Di desktop hero tetap
          setinggi layar penuh, jadi di sana petunjuk ini masih bekerja.

          `hidden md:flex`, mengikuti breakpoint yang sama dengan tinggi hero di
          atas — keduanya menjawab pertanyaan yang sama (viewport ini jangkung
          atau tidak), jadi keduanya harus ikut patokan yang sama. */}
      <a
        href="#manifesto"
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-zinc-400 transition-colors hover:text-zinc-200 md:flex"
      >
        <span className="text-xs tracking-widest uppercase">see our work</span>
        <span className={reduced ? "text-zinc-300" : "animate-bounce text-zinc-300"}>↓</span>
      </a>
    </section>
  );
}
