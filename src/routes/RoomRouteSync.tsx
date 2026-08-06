"use client";

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSceneStore, pathFor, roomFromPath } from "@/lib/store/sceneStore";
import { scrollToTop, scrollToSection } from "@/lib/smoothScroll";

/**
 * Sinkronisasi dua-arah path URL ↔ currentRoom.
 *
 * Komponen ini di DOM (bukan dalam Canvas), sehingga memiliki akses penuh ke
 * React Router context yang tidak tersedia di dalam <Canvas>.
 *
 * Arah 1 — path → room: ketika URL berubah (navigasi atau back/forward),
 *   terjemahkan pathname ke RoomKey lalu panggil goTo(). goTo() sendiri
 *   menjaga guard: skip jika room sama atau disabled.
 *
 * Arah 2 — room → path: ketika currentRoom berubah karena klik waypoint 3D
 *   (yang memanggil goTo → setCurrentRoom tanpa menyentuh URL), perbarui URL
 *   via navigate() supaya address bar ikut bergerak.
 *
 * Guard mencegah loop: goTo skip room sama; navigate skip jika path sudah sama.
 */
export default function RoomRouteSync() {
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const goTo       = useSceneStore((s) => s.goTo);
  const currentRoom = useSceneStore((s) => s.currentRoom);

  // Arah 1: pathname → room (back/forward, deep-link React Router)
  //
  // ⚠️ `key === currentRoom` WAJIB dijaga di sini, dan bukan cuma optimasi.
  //
  // Klik waypoint memicu URUTAN BERANTAI: goTo() menyetel currentRoom → Arah 2
  // memanggil navigate() → pathname berubah → efek INI menyala kembali, semua
  // itu terjadi SELAGI tween kamera 1400 ms masih berjalan.
  //
  // Panggilan goTo()-nya sendiri memang tertahan (`if (animating.current)
  // return` di CameraController), tapi `window.scrollTo` di bawah TIDAK ikut
  // tertahan — ia dulu tetap dieksekusi di tengah animasi, memaksa layout +
  // repaint sementara useFrame menggerakkan kamera 60×/detik. Gejalanya:
  // perpindahan ruangan terasa TERSENDAT, dan penyebabnya tidak menunjuk ke
  // sini sama sekali.
  //
  // Menjaga di `currentRoom` memisahkan dua hal yang tampak sama dari pathname
  // saja: "URL menyusul kamera yang sudah bergerak" (lewati — tak ada yang
  // perlu dikerjakan) vs "pengguna menekan Back / membuka tautan" (jalankan).
  //
  // JANGAN menggantinya dengan menaruh scrollTo di dalam guard `animating` di
  // CameraController: guard itu tidak bisa membedakan keduanya juga, dan ini
  // urusan DOM yang memang wilayahnya di sini.
  useEffect(() => {
    const key = roomFromPath(pathname);
    if (!key || !goTo) return;
    if (key === currentRoom) return;
    goTo(key);
    // `!hash` — kalau URL-nya membawa anchor (mis. "/#contact"), Arah 3 di
    // bawah yang mengurus scroll-nya. Melompat ke atas dulu di sini membuat
    // pengunjung melihat halaman tersentak sebelum meluncur ke tujuannya.
    if (!hash) scrollToTop();
  }, [pathname, goTo, currentRoom, hash]);

  // Arah 2: currentRoom → pathname (klik waypoint dalam Canvas)
  useEffect(() => {
    const target = pathFor(currentRoom);
    if (target !== pathname) {
      navigate(target, { replace: false });
    }
  }, [currentRoom, navigate, pathname]);

  // Arah 3: hash → scroll. Dipisah dari efek pathname supaya klik "Talk to us"
  // dari room lain (navigate ke "/#contact") ikut ter-scroll setelah konten
  // Lounge mount — dan supaya klik ulang saat sudah di Lounge (hash berubah,
  // pathname tidak) tetap memicu scroll.
  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    // rAF: beri satu frame untuk konten room yang baru saja mount (misal
    // pindah dari Office ke Lounge) selesai dirender sebelum discroll.
    const raf = requestAnimationFrame(() => {
      scrollToSection(id);
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash]);

  return null;
}
