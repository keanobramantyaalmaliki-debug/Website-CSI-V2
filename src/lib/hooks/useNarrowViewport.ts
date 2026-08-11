import { useSyncExternalStore } from "react";

/**
 * true di viewport yang lebih sempit dari breakpoint `md` Tailwind (768px).
 *
 * Dipakai Hero untuk memilih koreografi: di layar lebar 3D dipaku (sticky) lalu
 * surut saat digulir; di HP 3D ikut mengalir bersama konten tanpa pin dan tanpa
 * transform apa pun. Lihat sections/Hero.tsx.
 *
 * ⚠️ Sengaja LEBAR LAYAR, bukan `pointer: coarse` seperti useCoarsePointer.
 * Bukan kelalaian — dua pertanyaan yang berbeda:
 *
 *   - useCoarsePointer  → "ada hover atau tidak"    → soal INTERAKSI (§6)
 *   - useNarrowViewport → "viewport ini jangkung?"  → soal BENTUK LAYOUT
 *
 * Tablet landscape butuh jawaban BERBEDA untuk keduanya: tidak punya hover
 * (jadi waypoint tetap mati) tapi viewport-nya lebar (jadi hero tetap dipaku).
 * Menyamakan patokannya akan salah di satu dari dua sisi itu.
 *
 * ⚠️ Angkanya HARUS sama dengan `md:` di kelas Tailwind yang dipasangkan
 * dengannya. Kalau berbeda, ada jendela lebar di mana CSS bilang "desktop"
 * sementara JS bilang "HP" — hero dipaku tapi transform surutnya tidak
 * terpasang, dan 3D diam menutupi konten.
 */
const QUERY = "(max-width: 767.98px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/**
 * Server snapshot: `false` = anggap layar lebar. Situs ini SPA Vite tanpa SSR
 * jadi jalur ini praktis tak terpakai, tapi useSyncExternalStore mewajibkannya.
 */
function getServerSnapshot() {
  return false;
}

export function useNarrowViewport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
