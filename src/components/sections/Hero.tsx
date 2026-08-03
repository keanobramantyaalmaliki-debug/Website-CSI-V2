"use client";

import { lazy, Suspense, useEffect, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useSceneStore } from "@/lib/store/sceneStore";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";

const Scene = lazy(() => import("@/components/canvas/Scene"));
const BilliardHUD = lazy(() => import("@/components/ui/BilliardHUD"));
const WaypointLabel = lazy(() => import("@/components/ui/WaypointLabel"));

/**
 * HERO — tur kantor 3D.
 *
 * Comfort/perf: di bawah `prefers-reduced-motion` seluruh scene WebGL
 * dilewati dan diganti hero statis yang tenang. Menghemat ongkos GPU/bundle
 * bagi yang memang meminta lebih sedikit gerak, sekaligus menjaga halaman
 * tetap mulus di perangkat lemah.
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
  const coarse = useCoarsePointer();

  /**
   * ⚠️ SEMUA HOOK WAJIB DI ATAS `if (reduced) return` DI BAWAH.
   *
   * Ini bukan gaya penulisan, melainkan aturan React: hook harus dipanggil
   * dalam urutan yang sama di setiap render. Hook yang berada SETELAH early
   * return tidak akan pernah jalan di cabang itu — dan justru cabang itulah
   * yang paling butuh salah satunya (lihat pemantik `sceneReady` di bawah).
   *
   * Pernah kejadian sungguhan: pemantik `setSceneReady` sempat berada di bawah
   * early return, sehingga jalur reduced-motion tidak pernah menyalakannya dan
   * overlay loader menutupi situs SELAMANYA. `eslint react-hooks/rules-of-hooks`
   * menangkapnya; `bun run test` tidak. Jalankan lint sebelum commit.
   */

  // heroInView diikat ke viewport sticky (div h-dvh di dalam), BUKAN ke track
  // 180dvh-nya. Transparansi Navbar & unmount Waypoints bergantung pada kapan
  // 3D benar-benar terlihat di layar, bukan kapan track-nya tersentuh.
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

  /**
   * Jaring pengaman: jalur reduced-motion menyalakan `sceneReady` sendiri.
   *
   * Tanpa ini situsnya TIDAK BISA DIPAKAI SAMA SEKALI di bawah
   * prefers-reduced-motion, dan gejalanya tidak menunjuk ke sini sedikit pun:
   * LoadingScreen (overlay z-[60]) baru memulai outro saat `sceneReady` true,
   * dan satu-satunya yang menyalakannya adalah useFrame di Office.tsx — yang
   * hidup DI DALAM <Scene/>. Tanpa Scene, `sceneReady` selamanya false, jaring
   * pengaman 1500 ms di LoadingScreen bahkan tidak pernah terpasang karena ia
   * sendiri digerbangi `sceneReady`, dan layar menutupi situs SELAMANYA.
   *
   * Lihat INVARIANTS.md §3.
   */
  useEffect(() => {
    if (!reduced) return;
    setSceneReady(true);
  }, [reduced, setSceneReady]);

  // Canvas surut: opacity 1→0, scale 1→0.96, sedikit naik. Murni transform CSS
  // di pembungkusnya — kamera tidak disentuh, dan transform tidak membangunkan
  // frameloop R3F.
  //
  // ⚠️ Rentangnya HARUS selesai sebelum anak sticky-nya lepas dari pin, bukan
  // sebelum track-nya habis. `scrollYProgress` membentang sepanjang seluruh
  // track ("start start" → "end start"), tapi canvas sticky lepas pin di
  // trackHeight − stickyHeight — bukan di progress 1,0. Memudarkan di
  // [0.6, 1.0] membuat canvas masih pekat selama ±28dvh SETELAH ia lepas pin
  // dan ikut menggulir bersama halaman, jadi ia terlihat muncul lagi di bawah
  // seam HeroHandoff (dilaporkan sebagai "kepotong saat discroll").
  //
  // ⚠️ Titik lepas pin = (track − sticky) / track, dan angka itu HARUS SAMA di
  // desktop maupun HP — kalau tidak, satu rentang [0.28, 0.44] tidak mungkin
  // benar untuk keduanya. Itulah sebab tinggi track mobile 126dvh, bukan
  // angka bulat:
  //
  //   desktop  (180dvh track, 100dvh sticky) → (180−100)/180 = 0,444
  //   mobile   (126dvh track,  70dvh sticky) → (126− 70)/126 = 0,444  ✓ sama
  //
  // Dengan 150dvh (percobaan pertama) rasionya jadi 0,533, sehingga canvas di
  // HP habis memudar ~13dvh SEBELUM lepas pin — pengunjung melihat area kosong
  // yang masih terpaku di layar. Kalau salah satu tinggi diubah, hitung ulang
  // pasangannya: track = sticky / (1 − 0,444).

  const { scrollYProgress } = useScroll({
    target: heroTrackRef,
    offset: ["start start", "end start"],
  });
  const canvasOpacity = useTransform(scrollYProgress, [0.28, 0.44], [1, 0]);
  const canvasScale   = useTransform(scrollYProgress, [0.28, 0.44], [1, 0.96]);
  const canvasY       = useTransform(scrollYProgress, [0.28, 0.44], [0, -20]);

  // Reduced-motion: hero normal-flow setinggi layar, tanpa pin/surut.
  if (reduced) {
    return (
      <section ref={heroTrackRef} id="office" className="relative h-dvh w-full">
        <div className="absolute inset-0">
          <StaticHero />
        </div>
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
    /**
     * Track scroll: 180dvh di desktop, 150dvh di HP. Kelebihan di atas 100dvh
     * adalah "landasan pin" — bagian tempat 3D tetap di layar sementara konten
     * meluncur menutupinya.
     *
     * ⚠️ Tinggi VIEWPORT sticky-nya berbeda per perangkat: `h-[70dvh]` di HP,
     * `h-dvh` mulai `md`. Dua alasan yang kebetulan dijawab angka yang sama:
     *
     * 1. KONTEN TERLIHAT. Mengikuti basement.studio: canvas mereka ±71,5% dari
     *    tinggi layar di potret, sisanya konten. Hero setinggi layar penuh
     *    tidak memberi petunjuk bahwa ada halaman di bawahnya.
     *
     * 2. FRAMING 3D MELEBAR — ini yang tidak terlihat sebagai soal layout.
     *    `fov: 60` di Scene.tsx itu fov VERTIKAL; yang tampak kiri-kanan
     *    diturunkan dari aspect. Makin jangkung viewport-nya, makin sempit
     *    pandangannya. Terukur di iPhone 15 (393×852):
     *
     *      100dvh → hFOV 29,8°   ← sepertiga desktop, terasa seperti lensa tele
     *       70dvh → hFOV 41,7°   ← +40% lebih lebar
     *      (desktop 16:9 → 91,5° sebagai pembanding)
     *
     *    Itulah sebab kantor terasa "kepotong kanan-kirinya" di HP. Memendekkan
     *    hero MELEBARKAN framing-nya, bukan mengecilkan pemandangan.
     *
     * ⚠️ Patokannya breakpoint LEBAR (`md:`), sengaja BEDA dari gerbang
     * interaksi di INVARIANTS.md §6 yang memakai `pointer: coarse`. Bukan
     * kelalaian: yang ini soal BENTUK VIEWPORT, yang itu soal ADA-TIDAKNYA
     * HOVER. Dua pertanyaan berbeda, dua patokan berbeda. Bonusnya, layout
     * tetap benar sebelum JS jalan — tidak ada lompatan tinggi saat hidrasi.
     *
     * ⚠️ Angka ini BERPASANGAN dengan `-mt-32` di HeroHandoff dan `pt-16` di
     * Manifesto. Sisa layar di HP harus cukup untuk eyebrow + baris pertama
     * Manifesto; mengubah satu tanpa menengok dua lainnya membuat konten tidak
     * mengintip sama sekali dan seluruh susunan ini kehilangan maksudnya.
     */
    <section
      ref={heroTrackRef}
      id="office"
      className="relative h-[126dvh] w-full md:h-[180dvh]"
    >
      {/* Viewport sticky — diam di atas selagi track melintas */}
      <div
        ref={stickyRef}
        className="sticky top-0 h-[70dvh] w-full md:h-dvh"
      >
        {/* Pembungkus canvas — hanya transform CSS, kamera tak pernah disentuh */}
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

        {/* Dua overlay di bawah ini melayani interaksi yang TIDAK ADA di
            perangkat sentuh (INVARIANTS.md §6), jadi chunk-nya pun tak perlu
            diunduh di sana: keduanya lazy, dan `coarse` mencegah import-nya
            berjalan sama sekali. Bonus nyata di jaringan seluler.

            Gerbang di sini KOSMETIK — yang benar-benar mematikan interaksinya
            ada di Waypoints.tsx & Office.tsx (onClick meja). Urutan itu
            disengaja: HUD yang disembunyikan tanpa mematikan pintu masuknya
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
            Di HP hero cuma 70dvh sehingga konten sudah mengintip sendiri di
            bawah canvas; petunjuk "ada halaman di bawah" jadi mubazir, dan ia
            memakan ruang yang justru dibutuhkan konten itu. Di desktop hero
            setinggi layar penuh, jadi di sana petunjuk ini masih bekerja.

            `hidden md:flex` mengikuti breakpoint yang sama dengan tinggi hero
            di atas — keduanya menjawab pertanyaan yang sama (viewport ini
            jangkung atau tidak), jadi keduanya harus ikut patokan yang sama. */}
        <a
          href="#manifesto"
          className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-zinc-400 transition-colors hover:text-zinc-200 md:flex"
        >
          <span className="text-xs tracking-widest uppercase">see our work</span>
          <span className="animate-bounce text-zinc-300">↓</span>
        </a>
      </div>
    </section>
  );
}
