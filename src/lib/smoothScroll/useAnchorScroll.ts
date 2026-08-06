import { useEffect } from "react";
import type { ScrollTarget, SmoothScrollToOptions } from "./nativeScroll";

/**
 * Membuat <a href="#section"> menggulir halus (mis. "see our work" di Hero).
 *
 * ⚠️ Ditulis sendiri, BUKAN memakai opsi `anchors` milik Lenis. Opsi itu
 * memanggil scrollTo TANPA `preventDefault()`, jadi browser tetap menjalankan
 * lompatan bawaannya ke fragment: satu frame halaman sudah di tujuan, lalu
 * Lenis menariknya balik ke titik awal untuk memulai animasinya sendiri.
 * Terlihat sebagai kedipan.
 *
 * Dulu urusan ini ditangani `html { scroll-behavior: smooth }` di index.css.
 * Deklarasi itu dicabut karena tidak bisa dimatikan saat loader/drawer menahan
 * scroll, dan karena dua sistem yang menggulir dokumen yang sama akan berebut.
 *
 * Catatan perilaku: berbeda dari anchor bawaan, URL TIDAK ikut mendapat
 * fragment-nya. Menyinkronkannya butuh menyentuh history stack, dan itu risiko
 * yang tidak sepadan untuk sebuah tautan lompat-ke-section.
 *
 * @param enabled matikan saat Lenis tidak ada — tanpa Lenis, anchor bawaan
 *   browser sudah benar (dan di bawah reduced-motion memang itu yang diinginkan).
 */
export function useAnchorScroll(
  enabled: boolean,
  scrollTo: (target: ScrollTarget, options?: SmoothScrollToOptions) => void,
): void {
  useEffect(() => {
    if (!enabled) return;

    const onClick = (event: MouseEvent) => {
      // React Router memanggil preventDefault di handler <Link>-nya, yang jalan
      // lebih dulu (terpasang di dalam #root). Klik yang sudah diurus router
      // bukan urusan kita.
      if (event.defaultPrevented || event.button !== 0) return;
      // Modifier = "buka di tab/jendela baru". Biarkan browser.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      // Hanya anchor DALAM halaman yang sedang dibuka. Selain itu (termasuk
      // "/#contact" dari ruangan lain) adalah navigasi — biarkan router.
      if (url.host !== window.location.host) return;
      if (url.pathname !== window.location.pathname) return;
      if (!url.hash || url.hash === "#") return;

      // getElementById, bukan querySelector(url.hash): id yang sah tapi bukan
      // selector CSS yang sah (mis. "#2026-report") membuat querySelector
      // MELEMPAR SyntaxError di tengah handler klik.
      const section = document.getElementById(
        decodeURIComponent(url.hash.slice(1)),
      );
      if (!section) return;

      event.preventDefault();
      scrollTo(section);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [enabled, scrollTo]);
}
