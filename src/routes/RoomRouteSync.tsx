"use client";

import { useEffect, useRef } from "react";
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
  const { pathname, hash, search } = useLocation();
  const goTo       = useSceneStore((s) => s.goTo);
  const currentRoom = useSceneStore((s) => s.currentRoom);

  /** Pathname terakhir yang sudah selesai diurus Arah 1 — lihat Arah 2. */
  const resolvedPath = useRef<string | null>(null);

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

    // Satu-satunya keadaan yang menyisakan pekerjaan untuk efek ini adalah
    // "ada ruangan tujuan yang belum dijalankan, tapi `goTo` belum terdaftar".
    // Itu dipulangkan LEBIH DULU, tanpa menandai `resolvedPath` — dan itulah
    // yang menahan Arah 2 menimpa deep-link (catatannya di bawah).
    if (key && key !== currentRoom && !goTo) return;

    // Selebihnya pathname ini selesai diurus, apa pun cabang yang diambil.
    resolvedPath.current = pathname;

    if (!key || !goTo) return;
    if (key === currentRoom) return;
    goTo(key);
    // `!hash` — kalau URL-nya membawa anchor (mis. "/#contact"), Arah 3 di
    // bawah yang mengurus scroll-nya. Melompat ke atas dulu di sini membuat
    // pengunjung melihat halaman tersentak sebelum meluncur ke tujuannya.
    if (!hash) scrollToTop();
  }, [pathname, goTo, currentRoom, hash]);

  // Arah 2: currentRoom → pathname (klik waypoint dalam Canvas)
  //
  // ⚠️ `search` & `hash` DIBAWA SERTA, jangan kembali ke `pathFor()` telanjang.
  // pathFor() cuma tahu soal ruangan, jadi menavigasi ke hasilnya apa adanya
  // MENULIS ULANG seluruh URL — dan membuang query string pengunjung pada
  // perpindahan ruangan pertama.
  //
  // Ketahuan lewat overlay dev ber-query (`?perf=1`) yang menyala di Lounge
  // lalu lenyap tepat saat ganti ruangan. Gejalanya menyesatkan — tampak
  // seperti overlay-nya yang rusak, padahal URL-nya yang ditulis ulang di sini.
  //
  // Dampaknya jauh lebih luas dari alat dev: `?utm_source=` dari tautan
  // kampanye ikut hilang diam-diam, jadi kunjungan yang berpindah ruangan
  // kehilangan atribusinya.
  //
  // Perbandingannya tetap `target !== pathname` — MURNI path, tanpa search.
  // Kalau search ikut dibandingkan, efek ini menyala lagi tiap query berubah
  // dan menavigasi ke URL yang isinya persis sama (riwayat browser terisi
  // entri kembar, dan Arah 1 ikut menyala di tengah tween kamera).
  //
  // ⚠️ `pending` menahan efek ini pada MUAT PERTAMA sebuah deep-link.
  //
  // Dua arah di sini balapan saat mount. Arah 1 tertahan `if (!goTo) return` —
  // `goTo` baru terdaftar setelah CameraController mount, dan itu ada di dalam
  // chunk <Scene> yang di-lazy-load, ratusan milidetik kemudian. Arah 2 tidak
  // punya penahan apa pun: saat mount `currentRoom` masih START_ROOM, jadi ia
  // melihat "/" ≠ "/office" lalu menavigasi ke "/" — MENIMPA tujuan pengunjung
  // sebelum Arah 1 sempat bekerja.
  //
  // Sesudah itu tidak ada yang terasa salah dari dalam: pathname "/" memang
  // cocok dengan currentRoom "Lounge", jadi Arah 1 melewatinya dengan benar.
  //
  // Gejalanya: setiap tautan ruangan yang dibagikan, dan setiap refresh di
  // dalam ruangan, mendarat di Lounge. Klik navbar TETAP JALAN (saat itu Scene
  // sudah mount), jadi ini tidak terlihat kecuali URL-nya dibuka langsung.
  //
  // Yang dijaga BUKAN "apakah goTo sudah ada", melainkan "apakah Arah 1 sudah
  // selesai berurusan dengan pathname ini" — itu yang dicatat `resolvedPath`.
  //
  // Bedanya penting. Menolak menavigasi selama `roomFromPath(pathname) !==
  // currentRoom` terdengar setara, tapi jauh lebih lebar: "/" selalu memetakan
  // ke Lounge, jadi syarat itu ikut memblokir perpindahan SAH keluar dari
  // Lounge (klik waypoint Office dari "/") — persis yang dijaga
  // roomRouteSearch.test.tsx. Yang ditahan di sini hanya satu keadaan sempit:
  // pathname yang Arah 1 belum sempat proses karena `goTo` belum terdaftar.
  useEffect(() => {
    const target = pathFor(currentRoom);
    if (target === pathname) return;
    if (resolvedPath.current !== pathname) return;

    navigate(target + search + hash, { replace: false });
  }, [currentRoom, navigate, pathname, search, hash]);

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
