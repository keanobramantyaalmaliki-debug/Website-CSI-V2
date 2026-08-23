import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, within, act, fireEvent } from "@testing-library/react";
import Industries from "./Industries";
import { INDUSTRIES } from "@/data/industries";

// jsdom lacks IntersectionObserver; motion's whileInView/useInView need it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

// jsdom doesn't implement Element.scrollTo at all (only a "not implemented"
// stub on Window) — the auto-advance carousel calls it directly.
Element.prototype.scrollTo = vi.fn();

/**
 * Tiga query berbeda hidup di komponen ini — min-width (layout),
 * pointer: coarse (gerbang stack 3D), prefers-reduced-motion — jadi mock-nya
 * memilah per isi query, bukan satu boolean untuk semua.
 */
function mockMatchMedia({
  minWidthMatches = false,
  coarseMatches = false,
  reducedMotionMatches = false,
}: {
  minWidthMatches?: boolean;
  coarseMatches?: boolean;
  reducedMotionMatches?: boolean;
}) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMotionMatches
        : query.includes("pointer: coarse")
          ? coarseMatches
          : minWidthMatches,
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
});

describe("Industries", () => {
  it("renders without crashing and shows the heading", () => {
    mockMatchMedia({ minWidthMatches: false });
    render(<Industries />);
    expect(
      screen.getByRole("heading", { name: /built across sectors/i }),
    ).toBeInTheDocument();
  });

  it("renders every sector name, in order", () => {
    mockMatchMedia({ minWidthMatches: false });
    render(<Industries />);
    for (const industry of INDUSTRIES) {
      expect(screen.getByText(industry.name)).toBeInTheDocument();
    }
  });

  // Eyebrow "Industries" + counter "13 SECTORS · 3 core" dicabut 23 Agu
  // (bersama blok header di luar strip) — pola test yang sama dengan
  // eyebrow "Portfolio" di CaseGrid: pastikan tidak kembali.
  it("no longer renders the eyebrow label or the sector counter", () => {
    mockMatchMedia({ minWidthMatches: true });
    render(<Industries />);
    expect(screen.queryByText("Industries")).not.toBeInTheDocument();
    expect(screen.queryByText(/13 SECTORS/)).not.toBeInTheDocument();
  });

  // Sejak 23 Agu cabang desktop adalah tumpukan kartu 3D (IndustriesStack,
  // porting pmndrs raycast-cycling). Kartu-kartunya hidup di canvas WebGL
  // yang tidak bisa diuji di jsdom (dan canvas-nya baru mount saat inView,
  // yang tak pernah menyala di stub IntersectionObserver) — konten yang
  // terbaca mesin adalah <ul> sr-only, itu yang diuji di sini. Pola yang
  // sama dengan ServicesTicker di Office.test.tsx.
  describe("desktop stack", () => {
    it("renders the stack strip instead of the mobile carousel", () => {
      mockMatchMedia({ minWidthMatches: true });
      render(<Industries />);
      expect(screen.getByTestId("industries-stack")).toBeInTheDocument();
      expect(screen.queryByTestId("industries-mobile")).not.toBeInTheDocument();
    });

    it("lists every sector name and description in the sr-only list", () => {
      mockMatchMedia({ minWidthMatches: true });
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
      mockMatchMedia({ minWidthMatches: true });
      render(<Industries />);
      const list = screen.getByRole("list");
      const tagged = Array.from(list.children).filter((li) =>
        li.textContent?.includes("(Core Focus)"),
      );
      const coreCount = INDUSTRIES.filter((s) => s.tier === "core").length;
      expect(tagged).toHaveLength(coreCount);
    });

    it("falls back to the mobile carousel on coarse pointers, even at desktop width", () => {
      // Tablet landscape 1024px+: lebar lolos, tapi wheel-cycling butuh
      // hover + wheel yang tidak ada di layar sentuh (INVARIANTS §6 punya
      // alasan yang sama untuk scene hero).
      mockMatchMedia({ minWidthMatches: true, coarseMatches: true });
      render(<Industries />);
      expect(screen.queryByTestId("industries-stack")).not.toBeInTheDocument();
      expect(screen.getByTestId("industries-mobile")).toBeInTheDocument();
    });

    it("respects prefers-reduced-motion: still renders, nothing crashes", () => {
      mockMatchMedia({ minWidthMatches: true, reducedMotionMatches: true });
      render(<Industries />);
      expect(screen.getByTestId("industries-stack")).toBeInTheDocument();
    });
  });

  describe("mobile carousel", () => {
    it("renders a swipeable card list instead of the gallery below 1024px", () => {
      mockMatchMedia({ minWidthMatches: false });
      render(<Industries />);
      expect(screen.queryByTestId("industries-gallery")).not.toBeInTheDocument();
      const carousel = screen.getByTestId("industries-mobile");
      expect(carousel.querySelectorAll("img")).toHaveLength(INDUSTRIES.length);
    });

    it("uses scroll-snap so cards are swiped, not tapped, into view", () => {
      mockMatchMedia({ minWidthMatches: false });
      render(<Industries />);
      const carousel = screen.getByTestId("industries-mobile");
      const scrollContainer = carousel.querySelector(".snap-x");
      expect(scrollContainer).toBeInTheDocument();
      expect(scrollContainer).toHaveClass("snap-mandatory");
    });

    it("shows every sector's description directly, with no tap needed to reveal it", () => {
      mockMatchMedia({ minWidthMatches: false });
      render(<Industries />);
      const carousel = screen.getByTestId("industries-mobile");
      for (const industry of INDUSTRIES) {
        expect(within(carousel).getByText(industry.name)).toBeInTheDocument();
        expect(within(carousel).getByText(industry.desc)).toBeInTheDocument();
      }
    });

    it("tags every core sector's card with a Core Focus label", () => {
      mockMatchMedia({ minWidthMatches: false });
      render(<Industries />);
      const carousel = screen.getByTestId("industries-mobile");
      const coreCount = INDUSTRIES.filter((industry) => industry.tier === "core").length;
      expect(within(carousel).getAllByText("Core Focus")).toHaveLength(coreCount);
    });

    it("contains overscroll so the boundary bounce doesn't read as jumping back to the start", () => {
      mockMatchMedia({ minWidthMatches: false });
      render(<Industries />);
      const carousel = screen.getByTestId("industries-mobile");
      const scrollContainer = carousel.querySelector(".snap-x");
      expect(scrollContainer).toHaveClass("overscroll-x-contain");
    });

    it("auto-advances to the next card while idle", () => {
      mockMatchMedia({ minWidthMatches: false });
      const scrollToSpy = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
      scrollToSpy.mockClear();
      vi.useFakeTimers();
      render(<Industries />);

      act(() => {
        vi.advanceTimersByTime(4500);
      });

      expect(scrollToSpy).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it("stops auto-advancing for good once the user touches the carousel", () => {
      mockMatchMedia({ minWidthMatches: false });
      const scrollToSpy = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
      scrollToSpy.mockClear();
      vi.useFakeTimers();
      render(<Industries />);
      const carousel = screen.getByTestId("industries-mobile");
      const scrollContainer = carousel.querySelector(".snap-x") as HTMLElement;

      fireEvent.pointerDown(scrollContainer);

      act(() => {
        vi.advanceTimersByTime(4500 * 3);
      });

      expect(scrollToSpy).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    // prefers-reduced-motion coverage lives in IndustriesMobile.test.tsx:
    // framer-motion's useReducedMotion() caches its result in a module-level
    // singleton on first call, so once an earlier test in *this* file has
    // rendered anything with reducedMotionMatches: false, no later mock in
    // the same file can flip it back — it needs a fresh module registry.
  });
});
