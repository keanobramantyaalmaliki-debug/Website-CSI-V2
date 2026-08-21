"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import type { Vector3 } from "three";

/**
 * Lift scroll — kamera "melorot" saat halaman digulir melewati hero, seperti
 * turun lift sambil tetap menatap ruangan yang ditinggal.
 *
 * SATU gerakan dari satu progres scroll (0 = hero penuh di layar, 1 = hero
 * habis tergulir): Y kamera meluncur turun, sementara TITIK PANDANG TIDAK
 * IKUT — ia terkunci di target ruangan (pilihan Keano, 21 Agu; versi pertama
 * menurunkan titik pandang bersama kamera lalu mendongakkannya lewat kurva
 * kedua, dan itu dicabut). Karena mata terpaku ke titik yang sama sementara
 * kepala turun, dongakan ke atas muncul SENDIRI dari lookAt — tidak ada kurva
 * dongak untuk dikelola, dan tidak ada dua gerakan yang bisa saling
 * membatalkan di layar.
 *
 * ── Kenapa void mustahil terlihat ──────────────────────────────────────────
 * Turunnya dangkal (LIFT_DROP_MAX) dan Y kamera dijepit LIFT_MIN_CAM_Y yang
 * berada DI ATAS lantai (y = 0). Selama mata di atas lantai, lantai selalu
 * menutupi apa pun di bawahnya — sudut pandang mana pun. Jadi angka di bawah
 * bebas di-tweak tanpa bisa membocorkan void.
 */

/**
 * Kedalaman turun maksimum, meter. Dangkal dengan sengaja ("pelan-pelan aja,
 * jangan sampai mentok lantai"): pose ruangan 1,13–1,60 berakhir 0,53–1,00 —
 * setinggi mata orang duduk, masih jauh di atas lantai. Jarak yang SAMA untuk
 * semua ruangan supaya laju turunnya terasa seragam.
 */
export const LIFT_DROP_MAX = 0.6;

/**
 * Y kamera terendah, meter — jaring pengaman, BUKAN tujuan. Dengan
 * LIFT_DROP_MAX sekarang tidak pernah tersentuh (pose terendah 1,13 − 0,6 =
 * 0,53), tapi ia yang membuat jaminan anti-void tahan terhadap tweak
 * LIFT_DROP_MAX maupun pose ruangan baru yang lebih rendah. Angkanya di atas
 * near plane + goyangan parallax (0,05 + 0,055) dengan sisa lega.
 */
export const LIFT_MIN_CAM_Y = 0.35;

/**
 * Konstanta waktu pengejaran progres (detik) — lihat dampTowards di
 * mouseParallax.ts. Lebih tegas dari parallax (0,22): gerakan yang dikemudikan
 * scroll harus terasa menempel di jari; Lenis sudah menghaluskan scroll-nya
 * sendiri, jadi peredam di sini cuma penata frame, bukan sumber kehalusan.
 */
export const LIFT_TAU = 0.12;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Porsi turun (0…1) pada progres scroll p. Hermite klasik di SEPANJANG
 * progres — landai di kedua ujung, dan karena tidak dipadatkan ke sebagian
 * rentang scroll, turunnya terasa pelan mengikuti gulir, bukan menghunjam.
 */
export function liftDrop01(p: number): number {
  const c = clamp01(p);
  return c * c * (3 - 2 * c);
}

/**
 * Terapkan lift pada posisi kamera, DI TEMPAT. Titik pandang TIDAK disentuh —
 * itu inti desainnya (lihat kepala berkas).
 *
 * Kontrak pemanggilan (CameraController): SETELAH applyParallax (yang menulis
 * camera.position dari pose resmi), SEBELUM camera.lookAt. Dengan begitu lift
 * selalu additive di atas tween ruangan + parallax, dan tidak menumpuk antar
 * frame — applyParallax menulis ulang posisinya dari basePos tiap frame.
 */
export function applyLift(camPos: Vector3, p: number): void {
  if (p <= 0) return;
  // Turunnya dibatasi ruang yang TERSISA di atas MIN, bukan hasilnya yang
  // dijepit — beda halus tapi penting: pose yang (hipotetis) sudah di bawah
  // MIN dibiarkan apa adanya, tidak diangkat naik oleh jaring pengaman.
  const room = Math.max(0, camPos.y - LIFT_MIN_CAM_Y);
  camPos.y -= Math.min(liftDrop01(p) * LIFT_DROP_MAX, room);
}

/**
 * Pasangan id dengan `<section id="office">` di Hero.tsx — elemen yang sama
 * yang dipakai IntersectionObserver heroInView. Progresnya dibaca dari rect
 * elemen itu, bukan dari scrollY / tinggi viewport, supaya tetap benar kalau
 * kelak ada apa pun di atas hero atau tingginya berubah (70dvh vs 100dvh).
 */
const HERO_SECTION_ID = "office";

/**
 * Lacak progres keluar-nya hero dari viewport tanpa memicu render React.
 *
 * Ditulis ke ref, BUKAN state — alasan yang sama dengan usePointerParallax:
 * event scroll datang tiap frame, dan setState di sini berarti me-render
 * ulang `<Canvas>` (INVARIANTS.md §7). Lenis menggulirkan window secara
 * native, jadi event "scroll" biasa tetap terpancar.
 *
 * Tidak perlu gerbang reduced-motion di sini: jalur reduced tidak pernah
 * me-mount Scene (Hero.tsx), jadi hook ini tidak hidup di sana.
 */
export function useHeroScrollProgress(): MutableRefObject<number> {
  const progress = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // getElementById tiap event, bukan sekali di mount: murah, dan tahan
    // terhadap section yang di-remount tanpa hook ini ikut di-remount.
    const measure = () => {
      const el = document.getElementById(HERO_SECTION_ID);
      if (!el) {
        progress.current = 0;
        return;
      }
      const r = el.getBoundingClientRect();
      progress.current = r.height > 0 ? clamp01(-r.top / r.height) : 0;
    };

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return progress;
}
