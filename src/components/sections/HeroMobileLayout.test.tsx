import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

/**
 * Hero punya DUA koreografi yang dipisah di breakpoint `md`, dan yang di HP
 * lahir dari tiga laporan sekaligus (10 Agu):
 *
 *   1. "40% layar kosong"    — hero dipaku 70dvh di dalam track 126dvh, jadi
 *                              ada 30dvh badan track yang tak berisi apa pun
 *                              sebelum konten mulai.
 *   2. "3D kepotong kiri-kanan" — `scale: 0.96` mengecilkan canvas di tempat.
 *   3. "scroll tersendat"    — opacity+scale sebuah layer WebGL seukuran layar
 *                              dianimasikan tiap frame scroll.
 *
 * Ketiganya hilang dengan satu keputusan: di HP hero MENGALIR (tanpa sticky)
 * dan pembungkus canvas TIDAK menerima style transform apa pun.
 *
 * ⚠️ Kenapa perlu dijaga test. Style surut itu benar dan perlu di desktop, jadi
 * ia tidak akan pernah "kelihatan salah" saat dibaca — yang salah cuma
 * PEMASANGANNYA di layar sempit. Mengembalikannya ke `style={{...}}` polos
 * adalah penyederhanaan yang tampak tidak berbahaya, lolos typecheck & lint,
 * dan gejalanya baru muncul di HP. Persis pola INVARIANTS.md.
 *
 * Pasangan yang dijaga di berkas lain: `md:-mt-32` di HeroHandoff.test.tsx.
 */

let width = 400;

vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

beforeEach(() => {
  window.matchMedia = ((query: string) =>
    ({
      // useNarrowViewport bertanya (max-width: 767.98px); useReducedMotion &
      // useCoarsePointer ikut lewat sini juga dan harus tetap `false`.
      matches: query.includes("max-width") && width < 768,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

afterEach(() => {
  vi.resetModules();
});

async function renderHero() {
  vi.resetModules();
  const { default: Hero } = await import("./Hero");
  return render(<Hero />);
}

/** Pembungkus canvas = anak pertama dari viewport 3D (div ber-`absolute inset-0`). */
function canvasWrapper(container: HTMLElement) {
  const el = container.querySelector("section#office > div > div");
  if (!el) throw new Error("pembungkus canvas tidak ditemukan");
  return el as HTMLElement;
}

describe("Hero — koreografi HP vs layar lebar", () => {
  it("HP: track 70dvh dan viewport 3D TIDAK dipaku", async () => {
    width = 400;
    const { container } = await renderHero();
    const track = container.querySelector("section#office") as HTMLElement;
    const viewport = track.firstElementChild as HTMLElement;

    // 70dvh = 70% yang BENAR-BENAR terlihat, dan itu hanya benar selama seam
    // HeroHandoff `hidden` di HP (dijaga di motion/HeroHandoff.test.tsx).
    // Menghidupkan seam lagi diam-diam mengembalikannya ke 65%.
    expect(track.className).toContain("h-[70dvh]");
    // `sticky` polos = pin bocor ke HP; yang boleh cuma varian md:
    expect(viewport.className).not.toMatch(/(^|\s)sticky(\s|$)/);
    expect(viewport.className).toContain("md:sticky");
  });

  it("HP: pembungkus canvas tanpa transform — sumber 'kepotong' & 'tersendat'", async () => {
    width = 400;
    const { container } = await renderHero();
    const style = canvasWrapper(container).getAttribute("style") ?? "";

    expect(style).not.toContain("transform");
    expect(style).not.toContain("scale");
    expect(style).not.toContain("opacity");
  });

  it("layar lebar: surut TETAP terpasang (opacity + transform)", async () => {
    width = 1440;
    const { container } = await renderHero();
    const style = canvasWrapper(container).getAttribute("style") ?? "";

    expect(style).toContain("opacity");
    expect(style).toContain("transform");
  });
});
