"use client";

import { lazy, Suspense, useEffect, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useSceneStore } from "@/lib/store/sceneStore";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import { useNarrowViewport } from "@/lib/hooks/useNarrowViewport";
import ChunkBoundary from "@/components/ChunkBoundary";

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

/**
 * Ditampilkan kalau chunk `Scene` GAGAL diunduh (bukan gagal render).
 *
 * Dua tugas, dan yang kedua lebih penting dari yang terlihat:
 *
 *   1. Menampilkan hero statis, supaya hero tidak jadi kotak hitam kosong.
 *      Dipakai ulang dari jalur reduced-motion — keadaannya memang sama:
 *      "tidak ada WebGL, tunjukkan sesuatu yang tenang".
 *   2. **Melepas LoadingScreen.** `sceneReady` biasanya dipancarkan useFrame di
 *      Office.tsx; kalau chunk-nya tidak pernah ada, sinyal itu tidak akan
 *      pernah datang dan loader menutupi layar SELAMANYA. Jaring pengaman
 *      1500 ms di LoadingScreen tidak menolong — ia baru dipasang setelah
 *      `sceneReady` true.
 */
function SceneFailed() {
  const setSceneReady = useSceneStore((s) => s.setSceneReady);
  useEffect(() => {
    setSceneReady(true);
  }, [setSceneReady]);
  return <StaticHero />;
}

export default function Hero() {
  const heroTrackRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const setHeroInView = useSceneStore((s) => s.setHeroInView);
  const setSceneReady = useSceneStore((s) => s.setSceneReady);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const narrow = useNarrowViewport();

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

  // heroInView diikat ke VIEWPORT 3D (div di dalam), BUKAN ke track-nya.
  // Transparansi Navbar, unmount Waypoints, dan gerbang frameloop
  // (INVARIANTS.md §7) bergantung pada kapan 3D benar-benar terlihat di layar,
  // bukan kapan track-nya tersentuh — dan di layar lebar keduanya beda jauh:
  // track 180dvh, viewport-nya cuma 100dvh yang dipaku di dalamnya. Di HP
  // viewport = track (tanpa pin), jadi di sana perbedaannya memang nihil.
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
  // ⚠️ HANYA DI LAYAR LEBAR. Surut itu melayani pin: 3D diam di layar sementara
  // konten meluncur menutupinya, jadi ia harus memudar supaya tidak menabrak
  // konten. Di HP tidak ada pin sama sekali (lihat blok besar di bawah), jadi
  // tidak ada yang perlu disurutkan — dan memasangnya di sana justru MERUSAK,
  // dua-duanya terlaporkan:
  //
  //   1. `scale: 0.96` mengecilkan canvas di tempat → muncul lajur gelap di
  //      tepi kiri & kanan. Inilah "3D kepotong samping kiri kanan".
  //   2. Menganimasikan opacity+scale sebuah layer WebGL seukuran layar pada
  //      setiap frame scroll adalah pekerjaan compositing termahal yang ada di
  //      halaman ini. Di HP itu terasa sebagai scroll "tersendat".
  //
  // ⚠️ Rentangnya HARUS selesai sebelum anak sticky-nya lepas dari pin, bukan
  // sebelum track-nya habis. `scrollYProgress` membentang sepanjang seluruh
  // track ("start start" → "end start"), tapi canvas sticky lepas pin di
  // trackHeight − stickyHeight — bukan di progress 1,0. Memudarkan di
  // [0.6, 1.0] membuat canvas masih pekat selama ±28dvh SETELAH ia lepas pin
  // dan ikut menggulir bersama halaman, jadi ia terlihat muncul lagi di bawah
  // seam HeroHandoff (dilaporkan sebagai "kepotong saat discroll").
  //
  //   titik lepas pin = (track − sticky) / track
  //   desktop (180dvh track, 100dvh sticky) → (180−100)/180 = 0,444
  //
  // Rentang [0.28, 0.44] berakhir tepat di angka itu. Kalau salah satu tinggi
  // diubah, hitung ulang: rentangnya harus selesai di (track − sticky) / track.
  //
  // Dulu tinggi track HP 126dvh dipilih khusus supaya rasionya ikut 0,444 —
  // satu rentang untuk dua perangkat. Perhitungan itu GUGUR bersama pin-nya;
  // di HP `scrollYProgress` sekarang tidak menggerakkan apa pun.

  const { scrollYProgress } = useScroll({
    target: heroTrackRef,
    offset: ["start start", "end start"],
  });
  const canvasOpacity = useTransform(scrollYProgress, [0.28, 0.44], [1, 0]);
  const canvasScale   = useTransform(scrollYProgress, [0.28, 0.44], [1, 0.96]);
  const canvasY       = useTransform(scrollYProgress, [0.28, 0.44], [0, -20]);
  const recede = narrow
    ? undefined
    : { opacity: canvasOpacity, scale: canvasScale, y: canvasY };

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
     * DUA KOREOGRAFI, dipisah di breakpoint `md` (768px).
     *
     * ── Layar lebar: track 180dvh, viewport sticky 100dvh ────────────────────
     * Kelebihan 80dvh di atas layar adalah "landasan pin" — bagian tempat 3D
     * tetap terpaku sementara konten meluncur menutupinya, dan canvas surut
     * (lihat blok transform di atas).
     *
     * ── HP: track 70dvh, TANPA pin, TANPA surut ──────────────────────────────
     * 3D dan konten satu aliran: begitu canvas habis, konten langsung menyambung
     * di bawahnya. Layar pertama = 70% kantor + 30% konten, tanpa perlu digulir
     * dulu. Ini yang diminta ("3D scene dan konten gabung"), dan bentuknya sama
     * dengan basement.studio di potret.
     *
     * 70dvh itu 70% YANG BENAR-BENAR TERLIHAT, bukan sekadar angka di kelas.
     * Saat masih 62dvh, seam HeroHandoff menimpa 40px terakhir canvas (`-mt-10
     * h-10`), jadi kantor yang betul-betul tampak cuma 57%. Karena itu seam-nya
     * sekarang `hidden` di HP — di sana tak ada canvas surut untuk ditutupi,
     * satu-satunya efeknya memakan 3D. Ukur dari piksel 3D terakhir yang
     * terlihat, jangan dari tinggi track.
     *
     * Susunan lama (track 126dvh + pin 70dvh) menyisakan 30dvh KOSONG di layar
     * pertama: canvas berhenti di 70dvh sementara konten baru mulai setelah
     * 126dvh, dan celah di antaranya adalah badan track yang memang tidak berisi
     * apa-apa. Di layar lebar celah itu tak pernah terlihat karena canvas-nya
     * setinggi layar penuh — itulah sebab bug ini hanya muncul di HP.
     *
     * Kenapa 70dvh dan bukan setinggi layar:
     *
     * 1. KONTEN TERLIHAT. Hero setinggi layar penuh tidak memberi petunjuk
     *    bahwa ada halaman di bawahnya.
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
     *    Memendekkan hero MELEBARKAN framing-nya, bukan mengecilkan
     *    pemandangan. Karena itu menaikkan 62dvh → 70dvh ada ONGKOSNYA:
     *    pandangan kiri-kanan menyempit dari 46,5° ke 41,7°. Porsi 70% dibayar
     *    dengan framing yang sedikit lebih tele — bukan makan siang gratis.
     *
     * ⚠️ Patokannya breakpoint LEBAR (`md:`), sengaja BEDA dari gerbang
     * interaksi di INVARIANTS.md §6 yang memakai `pointer: coarse`. Bukan
     * kelalaian: yang ini soal BENTUK VIEWPORT, yang itu soal ADA-TIDAKNYA
     * HOVER. Dua pertanyaan berbeda, dua patokan berbeda. Bonusnya, layout
     * tetap benar sebelum JS jalan — tidak ada lompatan tinggi saat hidrasi.
     *
     * ⚠️ `md:` di sini BERPASANGAN dengan useNarrowViewport di atas (768px) dan
     * dengan `md:-mt-32` di HeroHandoff. Ketiganya menjalankan SATU keputusan;
     * mengubah salah satu sendirian menghasilkan keadaan yang tidak pernah
     * dirancang — mis. dipaku tapi tak pernah surut.
     */
    <section
      ref={heroTrackRef}
      id="office"
      className="relative h-[70dvh] w-full md:h-[180dvh]"
    >
      {/* Viewport 3D. Di layar lebar sticky — diam di atas selagi track
          melintas; di HP mengalir biasa bersama halaman. */}
      <div
        ref={stickyRef}
        className="relative h-full w-full md:sticky md:top-0 md:h-dvh"
      >
        {/* Pembungkus canvas — hanya transform CSS, kamera tak pernah disentuh */}
        <motion.div className="absolute inset-0" style={recede}>
          {/* fallback null: overlay LoadingScreen (di SiteLayout) yang menutupi
              layar selama chunk ini diunduh, jadi fallback di sini cuma akan
              berkedip di belakangnya tanpa pernah terlihat.

              ⚠️ ChunkBoundary di sini PUNYA fallback, beda dari yang lain —
              dan ini kegagalan paling buruk dari semua lazy() di repo.
              `sceneReady` dipancarkan useFrame di Office.tsx, yang tidak akan
              pernah jalan kalau chunk-nya gagal dimuat. LoadingScreen menunggu
              sinyal itu untuk memulai outro-nya, jadi tanpa penangkap ini
              pengunjung menatap layar loader SELAMANYA — jaring pengaman
              1500 ms di sana pun tidak menolong, karena ia baru dipasang
              SETELAH sceneReady true. */}
          <ChunkBoundary name="Scene" fallback={<SceneFailed />}>
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </ChunkBoundary>
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
            <ChunkBoundary name="BilliardHUD">
              <Suspense fallback={null}>
                <BilliardHUD />
              </Suspense>
            </ChunkBoundary>

            {/* Label waypoint yang mengekor kursor. Di LUAR Canvas karena
                posisinya ditentukan kursor (screen-space), bukan titik di dunia
                3D — lihat ui/WaypointLabel.tsx. Sengaja bersebelahan dengan
                BilliardHUD: sama-sama overlay z-30, tingkat yang sama di
                INVARIANTS.md §2. */}
            <ChunkBoundary name="WaypointLabel">
              <Suspense fallback={null}>
                <WaypointLabel />
              </Suspense>
            </ChunkBoundary>
          </>
        )}

        {/* "see our work" — petunjuk scroll, HANYA di layar lebar.
            Di HP hero cuma 62dvh sehingga konten sudah mengintip sendiri di
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
