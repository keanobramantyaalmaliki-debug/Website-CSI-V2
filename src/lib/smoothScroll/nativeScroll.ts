/**
 * Jalur scroll TANPA Lenis.
 *
 * Dua keadaan menghasilkannya, dan keduanya sah — bukan kegagalan:
 *   1. `prefers-reduced-motion` — Lenis sengaja tidak pernah dibuat.
 *   2. komponen dirender di luar <SmoothScrollProvider> (mis. unit test).
 *
 * Karena itu berkas ini TIDAK BOLEH mengimpor `lenis` sama sekali: ia justru
 * jalur yang harus tetap benar ketika lenis-nya tidak ada.
 */

/** Target scroll: posisi absolut (px), selector CSS, atau elemen. */
export type ScrollTarget = number | string | HTMLElement;

export interface SmoothScrollToOptions {
  /** Lompat seketika tanpa animasi. Dipakai saat ganti route. */
  immediate?: boolean;
  /** Geser titik henti, px. Negatif = berhenti lebih tinggi dari target. */
  offset?: number;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Gulir memakai API browser.
 *
 * ⚠️ `behavior: "smooth"` diminta EKSPLISIT di sini, sehingga ia MENANG atas
 * `scroll-behavior` apa pun di CSS — termasuk `auto` yang biasa dipasang di
 * blok `prefers-reduced-motion`. Jadi reduced-motion wajib dicek sendiri di
 * sini; mengandalkan CSS saja akan tetap menghasilkan gerak bagi yang memintanya
 * dikurangi.
 */
export function nativeScrollTo(
  target: ScrollTarget,
  { immediate = false, offset = 0 }: SmoothScrollToOptions = {},
): void {
  const behavior: ScrollBehavior =
    immediate || prefersReducedMotion() ? "auto" : "smooth";

  const top = typeof target === "number" ? target : resolveTop(target);
  if (top === null) return;

  window.scrollTo({ top: top + offset, behavior });
}

/** Posisi absolut sebuah elemen di dokumen, atau null kalau tidak ditemukan. */
function resolveTop(target: string | HTMLElement): number | null {
  const el =
    typeof target === "string"
      ? document.querySelector<HTMLElement>(target)
      : target;
  if (!el) return null;
  return el.getBoundingClientRect().top + window.scrollY;
}
