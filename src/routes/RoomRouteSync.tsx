"use client";

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSceneStore, pathFor, roomFromPath } from "@/lib/store/sceneStore";

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
  const { pathname } = useLocation();
  const goTo       = useSceneStore((s) => s.goTo);
  const currentRoom = useSceneStore((s) => s.currentRoom);

  // Arah 1: pathname → room (back/forward, deep-link React Router)
  useEffect(() => {
    const key = roomFromPath(pathname);
    if (!key || !goTo) return;
    goTo(key);
    window.scrollTo(0, 0);
  }, [pathname, goTo]);

  // Arah 2: currentRoom → pathname (klik waypoint dalam Canvas)
  useEffect(() => {
    const target = pathFor(currentRoom);
    if (target !== pathname) {
      navigate(target, { replace: false });
    }
  }, [currentRoom, navigate, pathname]);

  return null;
}
