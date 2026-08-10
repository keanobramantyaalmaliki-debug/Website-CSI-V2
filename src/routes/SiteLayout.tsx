import { Outlet } from "react-router-dom";
import LoadingScreen from "@/components/loader/LoadingScreen";
import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import useSmoothScroll from "@/lib/hooks/useSmoothScroll";
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

  return (
    <>
      <LoadingScreen />
      <div className="ambient-grid" aria-hidden="true" />
      <Navbar />
      <Hero />
      <main className="relative z-10">
        <Outlet />
      </main>
      <RoomRouteSync />
    </>
  );
}
