import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import LoadingScreen from "@/components/loader/LoadingScreen";
import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import useSmoothScroll from "@/lib/hooks/useSmoothScroll";
import { useSceneStore } from "@/lib/store/sceneStore";
import GridReveal from "@/components/GridReveal";
import InquiryOverlay from "@/components/InquiryOverlay";
import RoomRouteSync from "./RoomRouteSync";
import { isJobPath } from "@/data/jobs";

/**
 * Shell layout yang persisten lintas child route.
 *
 * Hero (yang menampung <Canvas>) tidak pernah unmount saat room berganti —
 * hanya <Outlet> (konten di bawah hero) yang di-swap. Ini mencegah Canvas
 * remount, yang berarti GLB tidak diunduh & dikompilasi ulang tiap pindah
 * ruangan.
 *
 * Konten menyambung LANGSUNG di bawah hero, tanpa seam di antaranya. Dulu ada
 * <HeroHandoff/>: strip 80px bersudut membulat yang ditarik -128px ke zona pin
 * desktop supaya terbaca sebagai panel yang terangkat menutupi canvas surut.
 * Pin & surutnya dibongkar (lihat sections/Hero.tsx), dan tanpa keduanya yang
 * tersisa dari seam cuma efek sampingnya: sudut membulat + garis pemisah di
 * antara 3D dan konten — persis yang dilaporkan sebagai "masih ada radius".
 */
export default function SiteLayout() {
  useSmoothScroll();
  const inquiryOpen = useSceneStore((s) => s.inquiryOpen);
  const setHeroInView = useSceneStore((s) => s.setHeroInView);

  const { pathname } = useLocation();
  const onJob = isJobPath(pathname);

  /*
   * Hero DISEMBUNYIKAN di halaman lowongan, tidak pernah dilepas.
   *
   * Sekali mount, `heroMounted` tidak pernah kembali false — itu inti
   * keputusannya: pelamar yang menekan Back dari halaman job harus mendarat di
   * 3D yang masih hidup, bukan menunggu office.glb terunduh & terkompilasi
   * ulang. Yang bisa berubah cuma dari false ke true.
   *
   * Nilai awalnya `!onJob` supaya DEEP-LINK DINGIN ke halaman job (tautan yang
   * dibagikan ke pelamar) tidak menyeret 3D sama sekali: halaman teks tidak
   * perlu membayar GLB-nya. Begitu pengunjung menyentuh route ruangan mana pun,
   * Hero mount dan menetap.
   */
  const [heroMounted, setHeroMounted] = useState(!onJob);
  useEffect(() => {
    if (!onJob) setHeroMounted(true);
  }, [onJob]);

  /*
   * `heroInView` default-nya true, dan yang menurunkannya IntersectionObserver
   * milik Hero. Di deep-link dingin observer itu tidak ada — jadi tanpa baris
   * ini navbar halaman job tampil dalam mode "di atas hero" (bening, tanpa
   * bilah), melayang di atas teks putih dan praktis tak terbaca.
   *
   * Saat Hero MEMANG mount lalu disembunyikan, observer-nya juga melaporkan
   * non-intersecting (pembungkus h-0 ikut dihitung sebagai clip induk), jadi
   * baris ini cuma mendahuluinya satu frame — bukan melawannya.
   */
  useEffect(() => {
    if (onJob) setHeroInView(false);
  }, [onJob, setHeroInView]);

  return (
    <>
      {/* Digerbangi flag yang SAMA dengan Hero, dan itu wajib: loader hanya
          punya pintu keluar lewat `sceneReady`, yang dinyalakan useFrame di
          dalam <Scene> (INVARIANTS §3). Kalau Hero tidak mount, <Scene> tidak
          pernah ada, dan loader tak digerbangi = layar putih permanen di atas
          halaman lowongan. Dijaga siteLayoutHeroGate.invariant.test.ts. */}
      {heroMounted && <LoadingScreen />}
      <div className="ambient-grid" aria-hidden="true" />
      <Navbar />
      {heroMounted && (
        /* ⚠️ Pembungkusnya SELALU dirender selagi `heroMounted` — yang ditukar
           cuma className-nya. Membungkus <Hero/> secara kondisional (`onJob ?
           <div><Hero/></div> : <Hero/>`) mengubah posisi tipe di pohon React,
           dan itu UNMOUNT — persis yang dihindari seluruh berkas ini.

           `h-0 overflow-hidden`, BUKAN `hidden`/display:none. <section> di
           dalamnya tetap `h-dvh` — dvh relatif viewport, bukan induk — jadi
           canvas TIDAK berubah ukuran, cuma terpotong habis. display:none
           membuatnya 0×0, dan R3F menyusul layout ~58 ms di belakang DOM, jadi
           kembali ke ruangan akan berkedip (memory r3f-canvas-resize-lag).
           Bonusnya IntersectionObserver ikut memperhitungkan clip induk →
           heroInView false → gerbang frameloop balik ke "never" → nol draw
           call selagi pengunjung membaca halaman teks. */
        <div
          className={onJob ? "h-0 overflow-hidden" : undefined}
          aria-hidden={onJob || undefined}
        >
          <Hero />
        </div>
      )}
      {/* ⚠️ `z-10` DILEPAS selagi form inquiry terbuka — sengaja, bukan kelalaian.
          `relative z-10` membuat STACKING CONTEXT: apa pun di dalam <main>
          terkurung di bawahnya dan dikomposit sebagai satu lapisan di z-10, jadi
          tirai modal z-54 pun tetap kalah dari Navbar z-50 dan navbar terbaca
          mengambang di atas form (terpotret 13 Agu). `position: relative` tanpa
          z-index TIDAK membuat stacking context, jadi melepas angkanya sudah
          cukup: lapisan 54/55/56 naik bersaing di akar dan menang atas navbar,
          tetap di bawah LoadingScreen z-60. Lihat INVARIANTS §2.

          Aman untuk urutan yang lain: `.ambient-grid` (z-0) tetap di bawah karena
          <main> mendahuluinya dalam urutan cat, dan section-section di dalamnya
          yang sudah `relative z-10` cuma pindah dari z-10 lokal ke z-10 akar —
          urutan relatifnya tidak berubah. */}
      <main className={inquiryOpen ? "relative" : "relative z-10"}>
        <Outlet />
      </main>
      <RoomRouteSync />
      {/* Modal inquiry milik CTA navbar "Talk to us" — laptop naik dari bawah
          layar (desktop) / lembar datar (sentuh & sempit). WAJIB di luar
          `<main>`: lapisan 54–56-nya harus bersaing di akar melawan Navbar
          z-50, bukan terkurung stacking context konten (INVARIANTS §2).

          Serah-terima kunci gulir dengan menu burger aman tanpa syarat
          urutan: CTA di menu menutup menu + membuka modal ini dalam satu
          commit, React menjalankan seluruh cleanup (unlock milik Navbar)
          lalu seluruh setup (lock milik modal) dalam satu flush sinkron
          tanpa paint di antaranya, dan setScrollLocked sendiri berhitung. */}
      <InquiryOverlay />
      {/* Tirai pindah-ruangan. Bersebelahan dengan RoomRouteSync karena
          keduanya sama-sama jembatan router ↔ store yang tak menggambar apa pun
          di alur layout — dan GridReveal butuh `useNavigate`, jadi ia WAJIB di
          dalam Router. Ditaruh paling akhir supaya urutan cat-nya di atas
          <main>; z-58-nya sudah menjamin itu, ini cuma tidak melawannya. */}
      <GridReveal />
    </>
  );
}
