import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import Industries from "./Industries";
import { industries, type IndustryContent } from "@/data/industries";

/**
 * Sektornya pindah ke CMS 2 Sep, jadi test ini tidak lagi bisa mengimpor
 * satu literal. Mock-nya membungkus modul asli alih-alih menggantinya:
 * selama `daftarUji` null, `industries()` menjawab apa adanya (di jsdom
 * `content.json` tidak pernah dimuat, jadi itu daftar cadangan bundle) —
 * yang membuat semua test di bawah tetap menguji data yang SUNGGUHAN
 * tayang. Overrideannya cuma dipakai satu test, yang menguji daftar kosong.
 */
let daftarUji: IndustryContent[] | null = null;

vi.mock("@/data/industries", async (importOriginal) => {
  const asli = await importOriginal<typeof import("@/data/industries")>();
  return {
    ...asli,
    industries: () => daftarUji ?? asli.industries(),
  };
});

const INDUSTRIES = industries();

// jsdom lacks IntersectionObserver; motion's useInView needs it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

/**
 * Dua query hidup di bawah komponen ini — pointer: coarse (hint tap/hover
 * di IndustriesStack) dan prefers-reduced-motion — jadi mock-nya memilah
 * per isi query, bukan satu boolean untuk semua. Gerbang min-width sudah
 * tidak ada: stack tampil di semua perangkat sejak 23 Agu malam.
 */
function mockMatchMedia({
  coarseMatches = false,
  reducedMotionMatches = false,
}: {
  coarseMatches?: boolean;
  reducedMotionMatches?: boolean;
} = {}) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMotionMatches
        : query.includes("pointer: coarse")
          ? coarseMatches
          : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  daftarUji = null;
});

/**
 * Satu-satunya cabang render kini tumpukan kartu 3D (IndustriesStack,
 * porting pmndrs raycast-cycling) — carousel IndustriesMobile pensiun 23 Agu
 * malam. Kartu-kartunya hidup di canvas WebGL yang tidak bisa diuji di jsdom
 * (dan canvas-nya baru mount saat inView, yang tak pernah menyala di stub
 * IntersectionObserver) — konten yang terbaca mesin adalah <ul> sr-only,
 * itu yang diuji di sini. Pola yang sama dengan ServicesTicker di
 * Office.test.tsx.
 */
describe("Industries", () => {
  it("renders without crashing and shows the heading", () => {
    mockMatchMedia();
    render(<Industries />);
    expect(
      screen.getByRole("heading", { name: /built across sectors/i }),
    ).toBeInTheDocument();
  });

  // Eyebrow "Industries" + counter "13 SECTORS · 3 core" dicabut 23 Agu
  // (bersama blok header di luar strip) — pola test yang sama dengan
  // eyebrow "Portfolio" di CaseGrid: pastikan tidak kembali.
  it("no longer renders the eyebrow label or the sector counter", () => {
    mockMatchMedia();
    render(<Industries />);
    expect(screen.queryByText("Industries")).not.toBeInTheDocument();
    expect(screen.queryByText(/13 SECTORS/)).not.toBeInTheDocument();
  });

  it("renders the stack strip on every device — the retired mobile carousel never comes back", () => {
    mockMatchMedia({ coarseMatches: true });
    render(<Industries />);
    expect(screen.getByTestId("industries-stack")).toBeInTheDocument();
    expect(screen.queryByTestId("industries-mobile")).not.toBeInTheDocument();
  });

  it("lists every sector name and description in the sr-only list", () => {
    mockMatchMedia();
    render(<Industries />);
    const list = screen.getByRole("list");
    const items = Array.from(list.children);
    expect(items).toHaveLength(INDUSTRIES.length);
    INDUSTRIES.forEach((industry, i) => {
      expect(items[i]).toHaveTextContent(industry.name);
      expect(items[i]).toHaveTextContent(industry.desc);
    });
  });

  it("tags exactly the core sectors with Core Focus in the sr-only list", () => {
    mockMatchMedia();
    render(<Industries />);
    const list = screen.getByRole("list");
    const tagged = Array.from(list.children).filter((li) =>
      li.textContent?.includes("(Core Focus)"),
    );
    const coreCount = INDUSTRIES.filter((s) => s.tier === "core").length;
    expect(tagged).toHaveLength(coreCount);
  });

  /* Editor berhak mendraftkan semua sektor. Yang tidak boleh terjadi adalah
     strip putih setinggi layar berisi tumpukan nol plank — lengkap dengan
     heading yang menjanjikan sesuatu. */
  it("renders nothing at all when every sector is a draft", () => {
    mockMatchMedia();
    daftarUji = [];
    const { container } = render(<Industries />);
    expect(container).toBeEmptyDOMElement();
  });

  it("respects prefers-reduced-motion: still renders, nothing crashes", () => {
    mockMatchMedia({ reducedMotionMatches: true });
    render(<Industries />);
    expect(screen.getByTestId("industries-stack")).toBeInTheDocument();
  });

  /**
   * Navigasi sektor pointer kasar — `‹ 04 Nama ›` di bawah strip (ide
   * Keano, sesi mobile): arrow menggilir dengan wrap-around, nama = tombol
   * pembuka fokus. Overlay-nya DOM biasa (bukan canvas), jadi bisa diuji
   * di jsdom — tapi seisi strip aria-hidden sehingga role-query default
   * tidak menemukannya; tombol diambil lewat querySelector.
   */
  describe("coarse-pointer sector nav", () => {
    const navButtons = () =>
      screen
        .getByTestId("industries-stack")
        .querySelectorAll<HTMLButtonElement>("button");

    it("shows sector 01 by default, with arrows on both sides", () => {
      mockMatchMedia({ coarseMatches: true });
      render(<Industries />);
      const stack = within(screen.getByTestId("industries-stack"));
      expect(stack.getByText(INDUSTRIES[0].name)).toBeInTheDocument();
      expect(navButtons()).toHaveLength(3);
    });

    // Arah arrow SPASIAL, bukan urutan nomor (revisi Keano): sektor 01 di
    // kanan-atas tumpukan dan nomor naik ke kiri — arrow KIRI menaikkan
    // nomor, arrow KANAN menurunkan (dengan wrap-around dua arah).
    it("left arrow raises the sector number, right arrow lowers it and wraps", () => {
      mockMatchMedia({ coarseMatches: true });
      render(<Industries />);
      const stack = within(screen.getByTestId("industries-stack"));
      const [left, , right] = navButtons();

      fireEvent.click(left);
      expect(stack.getByText(INDUSTRIES[1].name)).toBeInTheDocument();

      fireEvent.click(right);
      fireEvent.click(right);
      expect(
        stack.getByText(INDUSTRIES[INDUSTRIES.length - 1].name),
      ).toBeInTheDocument();
    });

    it("opens focus mode from the sector name: description panel in, nav out", () => {
      // Perjalanan pulangnya (back → navigasi kembali di sektor yang sama)
      // TIDAK diuji di jsdom: panel exit AnimatePresence masih di DOM sampai
      // animasinya selesai, jadi assert DOM-nya ambigu — itu dicek lewat
      // probe browser (scripts/shoot-industries-mobile.mjs).
      mockMatchMedia({ coarseMatches: true });
      render(<Industries />);
      const stack = within(screen.getByTestId("industries-stack"));
      const [, name] = navButtons();

      fireEvent.click(name);
      expect(stack.getByText(INDUSTRIES[0].desc)).toBeInTheDocument();
      expect(navButtons()).toHaveLength(1);
    });

    it("never renders the nav on precise pointers — hover + click owns the strip there", () => {
      mockMatchMedia({ coarseMatches: false });
      render(<Industries />);
      expect(navButtons()).toHaveLength(0);
    });
  });
});
