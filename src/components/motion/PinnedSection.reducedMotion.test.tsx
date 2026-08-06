/**
 * PENJAGA A11Y — prefers-reduced-motion tidak mendapat pin sama sekali.
 *
 * Berkas terpisah dari PinnedSection.test.tsx dengan sengaja: `useReducedMotion`
 * milik motion membaca matchMedia SEKALI lalu menyimpannya di level modul, jadi
 * dua kasus di satu berkas akan sama-sama memakai nilai yang dibaca duluan.
 *
 * Yang dijaga ada dua, dan keduanya harus jalan bersama:
 *
 * 1. Section-nya mengalir biasa — tidak ada track dua kali tinggi layar yang
 *    harus digulir menembus isi yang diam. Menahan gulir ADALAH gerak yang
 *    diminta dikurangi itu, bahkan kalau tidak ada satu pun elemen yang beranimasi.
 * 2. Isinya tetap menerima progress, tapi sudah di 1. Konsumennya memetakan
 *    opacity/warna dari progress itu; kalau dibiarkan di 0, teks yang mestinya
 *    menyala saat digulir akan diam di keadaan awalnya — tak terbaca selamanya.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import PinnedSection from "./PinnedSection";

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

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", ObserverStub);
vi.stubGlobal("ResizeObserver", ObserverStub);

describe("PinnedSection di bawah prefers-reduced-motion", () => {
  it("membiarkan section-nya mengalir, tanpa track panjang dan tanpa sticky", () => {
    const { container } = render(
      <PinnedSection sticky="70dvh">{() => <p>isi</p>}</PinnedSection>,
    );
    const track = container.querySelector("section");
    if (!track) throw new Error("PinnedSection tidak merender <section>");
    const sticky = track.firstElementChild;
    if (!sticky) throw new Error("Track tidak punya anak sticky");

    expect(
      track.className,
      "Track-nya masih setinggi dua layar walau gerak diminta dikurangi. " +
        "Tidak ada yang ditahan di sana, jadi yang tersisa hanya ruang kosong " +
        "sepanjang satu layar yang harus digulir menembus isi yang diam.\n",
    ).not.toContain("--pin-track");
    expect(track.getAttribute("style")).toBeNull();
    expect(sticky.className).not.toMatch(/(^|\s)(md:)?sticky(\s|$)/);
  });

  it("tetap memberi isinya progress, tapi sudah di keadaan selesai", () => {
    let received: { get(): number } | undefined;
    render(
      <PinnedSection>
        {(progress) => {
          received = progress as unknown as { get(): number };
          return null;
        }}
      </PinnedSection>,
    );

    expect(
      received?.get(),
      "Progress-nya diam di 0, bukan 1. Konsumennya memetakan opacity dan " +
        "warna dari nilai ini — di 0 teksnya berhenti di keadaan awal dan " +
        "tidak pernah terbaca, karena tidak ada gulir yang akan menaikkannya.\n",
    ).toBe(1);
  });
});
