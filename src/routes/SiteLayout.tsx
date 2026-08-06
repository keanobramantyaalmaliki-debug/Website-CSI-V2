import { Outlet } from "react-router-dom";
import LoadingScreen from "@/components/loader/LoadingScreen";
import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import HeroHandoff from "@/components/motion/HeroHandoff";
import SmoothScrollProvider from "@/lib/smoothScroll/SmoothScrollProvider";
import RoomRouteSync from "./RoomRouteSync";

/**
 * Shell layout yang persisten lintas child route.
 *
 * Hero (yang menampung <Canvas>) tidak pernah unmount saat room berganti —
 * hanya <Outlet> (konten di bawah HeroHandoff) yang di-swap. Ini menjaga
 * koreografi sticky/recede/HeroHandoff tetap utuh dan mencegah Canvas remount.
 *
 * SmoothScrollProvider membungkus semuanya, bukan cuma <main>: LoadingScreen
 * dan Navbar perlu menahan scroll (lock/unlock), dan RoomRouteSync perlu
 * menggulir saat route berganti.
 */
export default function SiteLayout() {
  return (
    <SmoothScrollProvider>
      <LoadingScreen />
      <div className="ambient-grid" aria-hidden="true" />
      <Navbar />
      <Hero />
      <HeroHandoff />
      <main className="relative z-10">
        <Outlet />
      </main>
      <RoomRouteSync />
    </SmoothScrollProvider>
  );
}
