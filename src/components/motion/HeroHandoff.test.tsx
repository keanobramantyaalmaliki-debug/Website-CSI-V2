import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

let mockReduced = false;

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mockReduced };
});

const { default: HeroHandoff } = await import("./HeroHandoff");

beforeEach(() => { mockReduced = false; });

describe("HeroHandoff", () => {
  it("reduced-motion: no z-20 or -mt-32 (normal flow, no overlay)", () => {
    mockReduced = true;
    const { container } = render(<HeroHandoff />);
    const seam = container.firstChild as HTMLElement;
    expect(seam.className).not.toContain("z-20");
    expect(seam.className).not.toContain("-mt-32");
  });

  it("full-motion: has z-20, -mt-32, rounded-t (content-lifts-over seam)", () => {
    const { container } = render(<HeroHandoff />);
    const seam = container.firstChild as HTMLElement;
    expect(seam.className).toContain("z-20");
    expect(seam.className).toContain("-mt-32");
    expect(seam.className).toContain("md:rounded-t-3xl");
  });

  /**
   * Tarikan seam BEDA per lebar layar, dan salahnya senyap: `-mt-32` yang bocor
   * ke HP memotong 128px terakhir kantor (di sana hero TIDAK dipaku, jadi tak
   * ada landasan pin untuk diselipi) sambil menyedot konten naik 48px menembus
   * canvas. Tidak ada yang error; halaman cuma terlihat salah potong.
   *
   * Dijaga sebagai PASANGAN, bukan dua nilai lepas: tarikan mobile harus sama
   * besar dengan tingginya supaya sumbangan bersihnya ke aliran halaman NOL —
   * itulah yang membuat konten mulai persis di tempat hero berakhir.
   */
  /**
   * Seam ini TIDAK dirender di HP, dan itu bukan penghematan gaya: di HP hero
   * tidak dipaku maupun surut, jadi tak ada canvas surut untuk ditutupi. Yang
   * tersisa hanya efek sampingnya — strip 40px yang menimpa bagian bawah
   * kantor, yang membuat "3D dapat 70%" meleset jadi 65% meski tinggi track
   * sudah 70dvh (dilaporkan 10 Agu: "gap gede banget, potong pepetin").
   *
   * Dijaga per-kelas dengan regex batas-kata karena `toContain` LOLOS untuk
   * varian md: (`md:h-20` mengandung "h-20", `md:rounded-t-3xl` mengandung
   * "rounded-t-3xl"). Tanpa penjaga ini, versi desktop yang bocor ke HP tidak
   * akan tertangkap siapa pun — tidak error, tidak gagal typecheck, cuma
   * memakan bagian bawah kantor di HP.
   */
  it("seam hanya ada di layar lebar — di HP hero langsung bertemu konten", () => {
    const { container } = render(<HeroHandoff />);
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toContain("hidden");
    expect(cls).toContain("md:block");
    // semua yang bikin seam MENIMPA canvas wajib berawalan md:
    expect(cls).toContain("md:-mt-32");
    expect(cls).toContain("md:h-20");
    expect(cls).toContain("md:rounded-t-3xl");
    expect(cls).not.toMatch(/(^|\s)-mt-32(\s|$)/);
    expect(cls).not.toMatch(/(^|\s)h-20(\s|$)/);
    expect(cls).not.toMatch(/(^|\s)rounded-t-3xl(\s|$)/);
    // percobaan lama `-mt-10 h-10`: sumbangan nol ke aliran, tapi tetap
    // menimpa 40px kantor. Jangan dihidupkan lagi.
    expect(cls).not.toMatch(/(^|\s)-?mt-10(\s|$)/);
    expect(cls).not.toMatch(/(^|\s)h-10(\s|$)/);
  });

  it("renders a single div with aria-hidden", () => {
    const { container } = render(<HeroHandoff />);
    const seam = container.firstChild as HTMLElement;
    expect(seam.tagName).toBe("DIV");
    expect(seam.getAttribute("aria-hidden")).toBe("true");
  });
});
