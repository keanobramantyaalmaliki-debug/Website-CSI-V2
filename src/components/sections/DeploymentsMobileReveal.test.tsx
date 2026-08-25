import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import Deployments from "./Deployments";

// jsdom lacks IntersectionObserver; motion's whileInView needs it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// Dipasang ulang per test, BUKAN sekali saat modul dimuat: `afterEach` di bawah
// memanggil `vi.unstubAllGlobals()`, jadi stub sekali-pasang ikut tersapu dan
// test kedua kehilangan IntersectionObserver. Dulu tak ketahuan karena pohon
// Deployments kebetulan belum menyentuh useInView di jalur itu; begitu heading
// physics diganti <LineMask> (24 Agu) ia langsung meledak.
beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
});

vi.mock("@/lib/smoothScroll", () => ({ scrollToSection: vi.fn() }));

/**
 * Ganti matchMedia agar `(pointer: coarse)` menjawab sesuai skenario. Semua
 * query lain (mis. prefers-reduced-motion) tetap `matches: false`.
 */
function setCoarsePointer(coarse: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes("pointer: coarse") ? coarse : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

const unsplashImages = () =>
  [...document.querySelectorAll("img")].filter((img) =>
    img.src.includes("images.unsplash.com"),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Deployments — reveal per jenis penunjuk", () => {
  it("penunjuk presisi: kecerahan foto tetap digerbangi hover", () => {
    setCoarsePointer(false);
    render(<Deployments />);
    const imgs = unsplashImages();
    expect(imgs).toHaveLength(5);
    for (const img of imgs) {
      expect(img.className).toMatch(/group-hover:opacity-/);
      expect(img.className).toMatch(/group-hover:grayscale-0/);
    }
  });

  it("layar sentuh: reveal lepas dari hover dan foto mulai dari keadaan redup", () => {
    setCoarsePointer(true);
    render(<Deployments />);
    const imgs = unsplashImages();
    expect(imgs).toHaveLength(5);
    for (const img of imgs) {
      // Sentuhan tidak punya hover — reveal tidak boleh bergantung padanya.
      expect(img.className).not.toMatch(/group-hover:/);
      // Foto beristirahat dalam keadaan redup, lalu terang mengikuti scroll.
      const opacity = Number(img.style.opacity);
      expect(opacity).toBeGreaterThan(0);
      expect(opacity).toBeLessThan(1);
    }
  });
});
