import { Outlet } from "react-router-dom";
import LoadingScreen from "@/components/loader/LoadingScreen";
import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import useSmoothScroll from "@/lib/hooks/useSmoothScroll";
import { useSceneStore } from "@/lib/store/sceneStore";
import RoomRouteSync from "./RoomRouteSync";

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

  return (
    <>
      <LoadingScreen />
      <div className="ambient-grid" aria-hidden="true" />
      <Navbar />
      <Hero />
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
    </>
  );
}
