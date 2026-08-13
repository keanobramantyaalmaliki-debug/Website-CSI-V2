"use client";

import { lazy, Suspense, useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useSceneStore } from "@/lib/store/sceneStore";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import ChunkBoundary from "@/components/ChunkBoundary";
import {
  startOfficeModelDownload,
  resetOfficeModelDownload,
} from "@/lib/officeModel";

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
 * Ditampilkan kalau chunk `Scene` GAGAL diunduh — atau, sejak officeModel.ts,
 * kalau unduhan office.glb gagal total setelah semua sambung-ulangnya.
 *
 * Tiga tugas; yang kedua lebih penting dari yang terlihat:
 *
 *   1. Menampilkan hero statis, supaya hero tidak jadi kotak hitam kosong.
 *      Dipakai ulang dari jalur reduced-motion — keadaannya memang sama:
 *      "tidak ada WebGL, tunjukkan sesuatu yang tenang".
 *   2. **Melepas LoadingScreen.** `sceneReady` biasanya dipancarkan useFrame di
 *      Office.tsx; kalau chunk-nya tidak pernah ada, sinyal itu tidak akan
 *      pernah datang dan loader menutupi layar SELAMANYA. Jaring pengaman
 *      1500 ms di LoadingScreen tidak menolong — ia baru dipasang setelah
 *      `sceneReady` true.
 *   3. Menawarkan jalan kembali. Di origin lambat (terukur ~50 KB/s) kegagalan
 *      yang paling umum adalah unduhan GLB putus — sementara, bukan permanen.
 *      Dulu fallback ini titik buntu; kini ada tombol retry: klik pertama
 *      mencoba di tempat (reset officeModel + render ulang boundary), klik
 *      berikutnya memuat ulang halaman.
 */
/**
 * Hitungan klik retry, MODULE-LEVEL dengan sengaja: tiap kali retry gagal,
 * boundary me-render SceneFailed BARU, jadi state/ref komponen mulai dari nol
 * dan tidak bisa dipakai menghitung. Yang dihitung di sini "sudah berapa kali
 * pengunjung mencoba", dan itu milik halaman, bukan milik satu mount.
 */
let sceneRetryClicks = 0;

function SceneFailed({ onRetry }: { onRetry: () => void }) {
  const setSceneReady = useSceneStore((s) => s.setSceneReady);
  useEffect(() => {
    setSceneReady(true);
  }, [setSceneReady]);
  return (
    <div className="relative h-full w-full">
      <StaticHero />
      <button
        type="button"
        onClick={() => {
          sceneRetryClicks += 1;
          // Klik kedua = percobaan di tempat sudah gagal sekali. Kemungkinan
          // besar penyebabnya bukan unduhan GLB (yang bisa direset di bawah)
          // tapi promise lazy() chunk Scene yang rejected — dan itu di-cache
          // React selamanya. Muat ulang halaman adalah satu-satunya jalan yang
          // pasti; JS-nya ter-cache edge Cloudflare, jadi ongkosnya kecil.
          if (sceneRetryClicks > 1) {
            window.location.reload();
            return;
          }
          // Urutan penting (lihat kontrak fallbackWithRetry): bersihkan dulu
          // keadaan gagal unduhan office.glb, baru minta boundary me-render
          // ulang — kalau dibalik, render ulangnya melempar error lama lagi.
          resetOfficeModelDownload();
          onRetry();
        }}
        className="absolute bottom-[22%] left-1/2 z-10 -translate-x-1/2 border border-zinc-600 px-5 py-2 text-xs tracking-widest text-zinc-300 uppercase transition-colors hover:border-zinc-400 hover:text-white"
      >
        reload 3d tour
      </button>
    </div>
  );
}

export default function Hero() {
  const heroTrackRef = useRef<HTMLElement>(null);
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

  // heroInView menyalakan/mematikan transparansi Navbar, mount Waypoints, dan
  // gerbang frameloop (INVARIANTS.md §7) — semuanya bertanya "3D-nya kelihatan
  // atau tidak".
  //
  // Dulu ini diikat ke viewport 3D di dalam, bukan ke track-nya, karena di
  // layar lebar keduanya beda jauh: track 180dvh dengan viewport 100dvh yang
  // dipaku di dalamnya. Pin itu sudah tidak ada (lihat blok besar di bawah),
  // jadi sekarang track = viewport di SEMUA lebar layar dan satu ref cukup.
  // Kalau pin dihidupkan lagi, kembalikan juga pemisahan ref-nya — mengamati
  // track yang dipaku berarti heroInView tetap true selama landasan pin
  // melintas, jauh setelah 3D-nya tertutup konten.
  useEffect(() => {
    const el = heroTrackRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroInView(entry.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [setHeroInView]);

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

  /**
   * Mulai unduh office.glb SEKARANG, paralel dengan unduhan chunk Scene.
   *
   * Dulu unduhan GLB baru mulai setelah chunk Scene tiba dan dievaluasi
   * (useGLTF.preload di Office.tsx) — antre di belakang JS. Di origin yang
   * terukur ~50 KB/s (csi2.wibudev.com, 13 Agu) antrean itu nyata dalam
   * hitungan detik. officeModel.ts bebas import three, jadi memanggilnya dari
   * bundle utama tidak menyeret apa pun yang berat.
   *
   * Digerbangi reduced: jalur reduced-motion tidak pernah me-mount Scene,
   * jangan bebani mereka 13MB untuk model yang tak akan tampil.
   */
  useEffect(() => {
    if (reduced) return;
    startOfficeModelDownload();
  }, [reduced]);

  /**
   * ⚠️ RIWAYAT — "canvas surut", dihapus 10 Agu. Jangan dihidupkan lagi tanpa
   * membaca ini; ia tampak seperti sentuhan halus yang tak berbahaya.
   *
   * Dulu pembungkus canvas menerima `opacity 1→0, scale 1→0.96, y 0→-20` yang
   * digerakkan `useScroll` di sepanjang landasan pin desktop. Tiga hal yang
   * dilaporkan, semuanya berasal dari situ:
   *
   *   1. "3D mengecil" — `scale: 0.96` mengecilkan canvas DI TEMPAT, jadi
   *      muncul lajur gelap di tepi kiri, kanan, dan atas. Persis gejala yang
   *      lebih dulu ditemukan di HP; di desktop ia memang disengaja, tapi
   *      terbaca sebagai cacat, bukan sebagai efek.
   *   2. "tersendat" — men-scale pembungkus WebGL seukuran layar tiap frame
   *      scroll bukan sekadar compositing mahal, ia juga membuat
   *      `react-use-measure` mengukur ulang dan `<Canvas>` re-render (lihat
   *      INVARIANTS.md §7, yang lahir dari sebab ini).
   *   3. "ada jeda sebelum konten" — fade-nya selesai di titik lepas pin,
   *      sementara konten baru menyentuh layar SETELAH itu. Di antaranya ada
   *      layar hitam: canvas sudah opacity 0, konten belum datang.
   *
   * Semuanya lenyap bersama pin-nya. Tanpa landasan pin tidak ada yang perlu
   * disurutkan — 3D langsung bertemu konten, dan pembungkusnya sekarang tidak
   * menerima style apa pun di lebar layar mana pun.
   *
   * Dijaga di `HeroMobileLayout.test.tsx`.
   */

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
     * SATU KOREOGRAFI untuk semua lebar layar: hero MENGALIR bersama halaman.
     * Yang beda tinggal TINGGINYA — 70dvh di HP, setinggi layar di ≥768px.
     *
     * Tidak ada pin, tidak ada canvas surut, tidak ada seam yang menimpa: 3D
     * dan konten satu aliran, begitu canvas habis konten langsung menyambung
     * di bawahnya tanpa celah maupun sudut membulat. Ini yang diminta ("3D
     * scene dan konten gabung"), dan bentuknya sama dengan basement.studio.
     *
     * ⚠️ Desktop dulu memakai track 180dvh + viewport sticky 100dvh. Kelebihan
     * 80dvh itu "landasan pin" tempat 3D terpaku sementara canvas surut dan
     * seam melengkung meluncur menutupinya. Dibongkar 10 Agu karena yang
     * terlihat bukan efeknya, melainkan gejalanya (dilaporkan: "3D mengecil,
     * tersendat, ada radius"). Rinciannya di blok RIWAYAT di atas. Kalau pin
     * mau dihidupkan lagi, ia datang bersama TIGA hal sekaligus — tinggi track,
     * `sticky`, dan ref observer yang terpisah — bukan sendirian.
     *
     * 70dvh di HP itu 70% YANG BENAR-BENAR TERLIHAT, bukan sekadar angka di
     * kelas. Saat masih 62dvh, seam HeroHandoff menimpa 40px terakhir canvas
     * (`-mt-10 h-10`), jadi kantor yang betul-betul tampak cuma 57%. Ukur dari
     * piksel 3D terakhir yang terlihat, jangan dari tinggi track.
     *
     * Susunan lama (track 126dvh + pin 70dvh) menyisakan 30dvh KOSONG di layar
     * pertama: canvas berhenti di 70dvh sementara konten baru mulai setelah
     * 126dvh, dan celah di antaranya adalah badan track yang memang tidak berisi
     * apa-apa. Di layar lebar celah itu tak pernah terlihat karena canvas-nya
     * setinggi layar penuh — itulah sebab bug ini muncul lebih dulu di HP.
     *
     * Kenapa di HP 70dvh dan bukan setinggi layar:
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
     * ⚠️ `md:` di sini sekarang hanya mengatur TINGGI. Pasangannya yang dulu
     * (`useNarrowViewport` untuk menggerbangi surut, `md:-mt-32` di
     * HeroHandoff) sudah tidak ada — keduanya ikut dibongkar bersama pin.
     */
    <section
      ref={heroTrackRef}
      id="office"
      className="relative h-[70dvh] w-full md:h-dvh"
    >
      {/* Viewport 3D — mengalir bersama halaman di semua lebar layar. */}
      <div className="relative h-full w-full">
        {/* Pembungkus canvas. Sengaja TANPA style: lihat blok RIWAYAT di atas. */}
        <div className="absolute inset-0">
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
          <ChunkBoundary
            name="Scene"
            fallbackWithRetry={(retry) => <SceneFailed onRetry={retry} />}
          >
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </ChunkBoundary>
        </div>

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
