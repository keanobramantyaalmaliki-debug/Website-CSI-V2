/**
 * PENJAGA A11Y — prefers-reduced-motion tidak mendapat pemecahan baris sama sekali.
 *
 * Berkas terpisah dari LineMask.test.tsx dengan sengaja: `useReducedMotion`
 * milik motion membaca matchMedia SEKALI lalu menyimpannya di level modul, jadi
 * dua kasus di satu berkas akan sama-sama memakai nilai yang dibaca duluan.
 *
 * Yang dijaga: teksnya tidak dibongkar per kata lalu dirangkai ulang. Tanpa
 * gerak, pemecahan itu tak ada gunanya — yang tersisa hanya DOM tambahan,
 * observer yang menempel, dan risiko pembaca layar menyisipkan jeda di tempat
 * yang bukan batas kalimat.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import LineMask from "./LineMask";

// Di scope modul: harus berlaku sebelum render pertama, yaitu saat motion
// pertama kali membaca preferensinya.
window.matchMedia = ((query: string) => ({
  matches: /prefers-reduced-motion/.test(query),
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

describe("LineMask di bawah prefers-reduced-motion", () => {
  it("membiarkan teksnya utuh dalam satu topeng", () => {
    const { container } = render(
      <LineMask>Where Software Becomes Intelligence.</LineMask>,
    );

    expect(
      container.querySelectorAll(".overflow-hidden"),
      "Teksnya tetap dipecah per baris walau gerak diminta dikurangi. Tidak " +
        "ada stagger yang dijalankan, jadi yang tersisa cuma DOM tambahan.\n",
    ).toHaveLength(1);
    expect(container.querySelectorAll("[data-line-word]")).toHaveLength(0);
    expect(container.textContent).toBe(
      "Where Software Becomes Intelligence.",
    );
  });
});
