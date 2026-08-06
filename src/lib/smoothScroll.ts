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
