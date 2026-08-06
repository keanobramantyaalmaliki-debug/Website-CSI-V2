/**
 * T1 per baris — bentuk DOM hasil pengukuran.
 *
 * jsdom tidak melakukan layout, jadi `offsetTop` dipalsukan per kata untuk
 * meniru patahan baris yang sebenarnya ditentukan browser. Yang diuji di sini
 * bukan angka layout-nya, melainkan apa yang dilakukan komponen dengan angka
 * itu: berapa topeng yang terbentuk, dan apakah kalimatnya masih utuh.
 *
 * ResizeObserver sengaja TIDAK di-stub — ketiadaannya di jsdom persis kondisi
 * yang dihadapi setiap berkas test lain yang merender section berheading.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import LineMask from "./LineMask";

// Tidak pernah memicu callback-nya: elemen tetap "belum terlihat", jadi yang
// terbaca adalah keadaan awal — sebelum animasi masuk mengubah apa pun.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

const nativeOffsetTop = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "offsetTop",
);

/** Taruh tiap kata di posisi vertikalnya, seolah browser sudah melayout. */
function withLineTops(tops: Record<string, number>) {
  Object.defineProperty(HTMLElement.prototype, "offsetTop", {
    configurable: true,
    get(this: HTMLElement) {
      return tops[this.textContent ?? ""] ?? 0;
    },
  });
}

afterEach(() => {
  if (nativeOffsetTop) {
    Object.defineProperty(HTMLElement.prototype, "offsetTop", nativeOffsetTop);
  }
});

const masksIn = (container: HTMLElement) =>
  container.querySelectorAll(".overflow-hidden");

describe("LineMask", () => {
  it("memberi satu topeng untuk tiap baris hasil layout", () => {
    withLineTops({
      Where: 0,
      Software: 0,
      Becomes: 48,
      "Intelligence.": 48,
    });

    const { container } = render(
      <LineMask>Where Software Becomes Intelligence.</LineMask>,
    );

    expect(
      masksIn(container),
      "Heading dua baris masih dibungkus satu topeng — keduanya naik bersamaan " +
        "dan stagger 0.12 tidak pernah terpakai.\n",
    ).toHaveLength(2);
  });

  it("menjaga kalimatnya tetap utuh setelah dipecah", () => {
    withLineTops({
      Where: 0,
      Software: 0,
      Becomes: 48,
      "Intelligence.": 48,
    });

    const { container } = render(
      <LineMask>Where Software Becomes Intelligence.</LineMask>,
    );

    expect(
      container.textContent,
      "Teksnya berubah setelah dipecah per baris. Spasi di batas baris hilang " +
        "kalau tiap baris dirender tanpa pemisah, dan pembaca layar membacanya " +
        'sebagai satu kata ("SoftwareBecomes").\n',
    ).toBe("Where Software Becomes Intelligence.");
  });

  it("tetap satu topeng untuk heading yang muat satu baris", () => {
    withLineTops({});

    const { container } = render(<LineMask>How We Work</LineMask>);

    expect(masksIn(container)).toHaveLength(1);
    expect(container.textContent).toBe("How We Work");
  });

  it("tidak menyisakan penanda pengukuran di DOM akhir", () => {
    withLineTops({ Selected: 0, Work: 30 });

    const { container } = render(<LineMask>Selected Work</LineMask>);

    expect(
      container.querySelectorAll("[data-line-word]"),
      "Span per kata masih tertinggal setelah pengukuran selesai. Itu berarti " +
        "pengukurannya tidak pernah menghasilkan apa-apa, dan tiap kata jadi " +
        "elemen tersendiri buat pembaca layar.\n",
    ).toHaveLength(0);
  });

  it("tidak memecah anak yang bukan string", () => {
    const { container } = render(
      <LineMask>
        <em>Selected</em> Work
      </LineMask>,
    );

    expect(masksIn(container)).toHaveLength(1);
    expect(container.querySelector("em")).not.toBeNull();
    expect(container.textContent).toBe("Selected Work");
  });
});
