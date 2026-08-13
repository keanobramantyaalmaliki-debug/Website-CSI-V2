import type Lenis from "lenis";

/**
 * Registry + scroll helpers dipisah dari useSmoothScroll.ts karena masa
 * hidupnya beda: berkas ini tidak bergantung React, jadi bisa dipanggil dari
 * mana pun (Navbar, RoomRouteSync) dan dites tanpa render.
 *
 * Tanpa instance terdaftar (reduced-motion, atau belum mount), kedua helper
 * jatuh ke perilaku native — identik dengan hari ini.
 */
let instance: Lenis | null = null;

export function registerLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function scrollToTop() {
  if (instance) {
    instance.scrollTo(0, { immediate: true });
    return;
  }
  window.scrollTo(0, 0);
}

export function scrollToSection(id: string) {
  if (instance) {
    instance.scrollTo(`#${id}`);
    return;
  }
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/**
 * Kunci gulir halaman selama ada lapisan overlay di atasnya.
 *
 * Perlu DUA rem, bukan satu. `lenis.stop()` menghentikan gulir halus yang
 * dikemudikan Lenis, tapi Lenis tidak menangkap semua jalan masuk — panah
 * keyboard, PageDown, dan gulir asli di peramban yang Lenis-nya tidak aktif
 * (reduced-motion) tetap lolos. `overflow: hidden` di <html> yang menutup sisa
 * jalan itu. Tanpa Lenis, cabang keduanya saja sudah benar.
 *
 * Nilai `overflow` sebelumnya disimpan dan dikembalikan apa adanya — bukan
 * dipaksa jadi "" — supaya tidak menghapus setelan orang lain kalau kelak ada
 * yang juga menyentuhnya.
 */
let previousOverflow: string | null = null;

export function setScrollLocked(locked: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (locked) {
    if (previousOverflow === null) previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    instance?.stop();
    return;
  }

  if (previousOverflow !== null) {
    root.style.overflow = previousOverflow;
    previousOverflow = null;
  }
  instance?.start();
}
