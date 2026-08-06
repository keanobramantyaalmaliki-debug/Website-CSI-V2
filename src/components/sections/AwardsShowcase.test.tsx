import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// jsdom lacks IntersectionObserver; motion's whileInView/useInView need it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

let mockReduced = false;
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mockReduced };
});

const { default: AwardsShowcase } = await import("./AwardsShowcase");

beforeEach(() => {
  mockReduced = false;
});

describe("AwardsShowcase", () => {
  it("renders the Recognition eyebrow", () => {
    render(<AwardsShowcase />);
    expect(screen.getByText(/recognition/i)).toBeInTheDocument();
  });

  it("renders 4 award titles", () => {
    render(<AwardsShowcase />);
    // jsdom doesn't apply the sm: breakpoint CSS that hides one layout or
    // the other, so both the desktop row and the mobile carousel card mount
    // for each award — same "both sets render" situation as Office.test.tsx.
    expect(screen.getAllByText(/best digital government solution/i)).toHaveLength(2);
    expect(screen.getAllByText(/top ai implementation/i)).toHaveLength(2);
    expect(screen.getAllByText(/outstanding enterprise software partner/i)).toHaveLength(2);
    expect(screen.getAllByText(/rising star in cloud services/i)).toHaveLength(2);
  });

  it("does not render a leftover 'coming soon' disclaimer", () => {
    render(<AwardsShowcase />);
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it("hovering a row reveals the certificate preview card", async () => {
    render(<AwardsShowcase />);
    // Desktop row + mobile carousel card = 2 matches before hover.
    expect(screen.getAllByText(/top ai implementation/i)).toHaveLength(2);

    const row = screen.getAllByText(/top ai implementation/i)[0].closest("[tabindex]");
    expect(row).not.toBeNull();
    fireEvent.mouseEnter(row as Element);

    expect(screen.getAllByText(/top ai implementation/i)).toHaveLength(3);

    fireEvent.mouseLeave(row as Element);
    // AnimatePresence keeps the exiting card mounted during its exit
    // transition, so the count only drops back to 2 asynchronously.
    await waitFor(() =>
      expect(screen.getAllByText(/top ai implementation/i)).toHaveLength(2),
    );
  });

  it("skips the cursor-follow preview entirely under reduced motion", () => {
    mockReduced = true;
    render(<AwardsShowcase />);
    const row = screen.getAllByText(/top ai implementation/i)[0].closest("[tabindex]");
    fireEvent.mouseEnter(row as Element);
    expect(screen.getAllByText(/top ai implementation/i)).toHaveLength(2);
  });

  it("renders the mobile carousel with an image per award", () => {
    const { container } = render(<AwardsShowcase />);
    const images = [...container.querySelectorAll("img")].filter((img) =>
      img.src.includes("picsum.photos"),
    );
    // Mobile carousel renders one <img> per award (desktop rows use an
    // icon, not an <img>, and the preview card is unmounted until hover).
    expect(images).toHaveLength(4);
  });

  describe("mobile carousel auto-scroll", () => {
    // jsdom performs no layout, so card width / scrollWidth / clientWidth
    // are all 0 by default — stub them so the auto-scroll effect's
    // "cardWidth === 0 → bail" guard doesn't just make every tick a no-op.
    function getTrack(container: HTMLElement) {
      const track = container.querySelector(".snap-x") as HTMLDivElement;
      Object.defineProperty(track, "clientWidth", { value: 400, configurable: true });
      Object.defineProperty(track, "scrollWidth", { value: 1000, configurable: true });
      let scrollLeft = 0;
      Object.defineProperty(track, "scrollLeft", {
        get: () => scrollLeft,
        set: (v) => {
          scrollLeft = v;
        },
        configurable: true,
      });
      track.scrollTo = vi.fn((opts: ScrollToOptions | number) => {
        if (typeof opts === "object" && typeof opts.left === "number") {
          scrollLeft = opts.left;
        }
      }) as unknown as typeof track.scrollTo;
      const firstCard = track.firstElementChild as HTMLElement;
      firstCard.getBoundingClientRect = () =>
        ({ width: 192 }) as DOMRect;
      return track;
    }

    afterEach(() => {
      vi.useRealTimers();
    });

    it("auto-scrolls the track forward after the interval fires", () => {
      vi.useFakeTimers();
      const { container } = render(<AwardsShowcase />);
      const track = getTrack(container);

      act(() => {
        vi.advanceTimersByTime(4500);
      });

      expect(track.scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ left: 208 }),
      );
    });

    it("does not auto-scroll under reduced motion", () => {
      mockReduced = true;
      vi.useFakeTimers();
      const { container } = render(<AwardsShowcase />);
      const track = getTrack(container);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(track.scrollTo).not.toHaveBeenCalled();
    });

    it("pauses auto-scroll on manual pointer interaction and resumes after idle", () => {
      vi.useFakeTimers();
      const { container } = render(<AwardsShowcase />);
      const track = getTrack(container);

      fireEvent.pointerDown(track);

      // Still within the interval window, but paused — no scroll happens.
      act(() => {
        vi.advanceTimersByTime(4500);
      });
      expect(track.scrollTo).not.toHaveBeenCalled();

      // After the resume delay, the next interval tick scrolls again.
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      act(() => {
        vi.advanceTimersByTime(4500);
      });
      expect(track.scrollTo).toHaveBeenCalled();
    });

    it("does not treat the auto-scroll's own scroll event as a manual pause trigger", () => {
      vi.useFakeTimers();
      const { container } = render(<AwardsShowcase />);
      const track = getTrack(container);

      // Tick fires, calling scrollTo — simulate the browser dispatching the
      // resulting scroll event from that programmatic call.
      act(() => {
        vi.advanceTimersByTime(4500);
      });
      expect(track.scrollTo).toHaveBeenCalledTimes(1);
      fireEvent.scroll(track);

      // Since that scroll was consumed as programmatic (not manual), the
      // carousel never paused, so the original schedule continues uninterrupted.
      act(() => {
        vi.advanceTimersByTime(4500);
      });
      expect(track.scrollTo).toHaveBeenCalledTimes(2);
    });

    it("pauses on a genuine manual scroll not preceded by an auto-scroll tick", () => {
      vi.useFakeTimers();
      const { container } = render(<AwardsShowcase />);
      const track = getTrack(container);

      // No tick has fired yet, so this scroll is unambiguously user-initiated.
      fireEvent.scroll(track);

      act(() => {
        vi.advanceTimersByTime(4500);
      });
      expect(track.scrollTo).not.toHaveBeenCalled();

      // After the resume delay, auto-scroll picks back up.
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      act(() => {
        vi.advanceTimersByTime(4500);
      });
      expect(track.scrollTo).toHaveBeenCalled();
    });
  });
});
