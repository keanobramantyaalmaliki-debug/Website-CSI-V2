import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TheCrewMobileCarousel, {
  resolveSwipeDirection,
} from "./TheCrewMobileCarousel";
import { TEAM_MEMBERS } from "@/data/people";

// jsdom lacks IntersectionObserver; motion's whileInView needs it.
class IntersectionObserverStub {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

let mockReduced = false;
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mockReduced };
});

describe("TheCrewMobileCarousel", () => {
  beforeEach(() => {
    mockReduced = false;
  });

  it("marks the first person's dot active on mount", () => {
    render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);
    const carousel = screen.getByTestId("crew-mobile-carousel");
    expect(carousel).toHaveTextContent(TEAM_MEMBERS[0].name);

    const firstDot = screen.getByRole("button", {
      name: `Show ${TEAM_MEMBERS[0].name}`,
    });
    const secondDot = screen.getByRole("button", {
      name: `Show ${TEAM_MEMBERS[1].name}`,
    });
    expect(firstDot.className).toMatch(/bg-accent/);
    expect(secondDot.className).not.toMatch(/bg-accent/);
  });

  it("renders one dot indicator per person", () => {
    render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);
    for (const member of TEAM_MEMBERS) {
      expect(
        screen.getByRole("button", { name: `Show ${member.name}` }),
      ).toBeInTheDocument();
    }
  });

  it("clicking a dot switches the active profile", async () => {
    const user = userEvent.setup();
    render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);
    const target = TEAM_MEMBERS[2];

    await user.click(screen.getByRole("button", { name: `Show ${target.name}` }));

    const targetDot = screen.getByRole("button", { name: `Show ${target.name}` });
    const firstDot = screen.getByRole("button", {
      name: `Show ${TEAM_MEMBERS[0].name}`,
    });
    expect(targetDot.className).toMatch(/bg-accent/);
    expect(firstDot.className).not.toMatch(/bg-accent/);
  });

  // motion's animate() caches its requestAnimationFrame binding against the
  // first vi.useFakeTimers() session it runs under in a file, and does not
  // rebind on a later useFakeTimers()/useRealTimers() toggle — so any test
  // in this block that needs the fly-out throw animation to actually
  // progress must share one continuous fake-timer session, not toggle
  // per-test. Grouped here for that reason.
  describe("autoplay", () => {
    beforeAll(() => {
      vi.useFakeTimers();
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it("auto-advances to the next person 30s after going idle, unless reduced motion is on", async () => {
      render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);
      // Timer fire (30s) + the fly-out throw animation (250ms) both need to
      // elapse before the index actually advances.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30300);
      });

      const secondDot = screen.getByRole("button", {
        name: `Show ${TEAM_MEMBERS[1].name}`,
      });
      expect(secondDot.className).toMatch(/bg-accent/);
    });

    it("does not auto-advance when reduced motion is enabled", async () => {
      mockReduced = true;
      render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60000);
      });

      const firstDot = screen.getByRole("button", {
        name: `Show ${TEAM_MEMBERS[0].name}`,
      });
      const secondDot = screen.getByRole("button", {
        name: `Show ${TEAM_MEMBERS[1].name}`,
      });
      expect(firstDot.className).toMatch(/bg-accent/);
      expect(secondDot.className).not.toMatch(/bg-accent/);
    });

    it("plays the same left fly-out throw as a manual swipe when idle autoplay fires", async () => {
      render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);
      const carousel = screen.getByTestId("crew-mobile-carousel");
      // FadeUpItem wraps the draggable motion.article in an outer <article>,
      // so plain "article" matches the wrong (unstyled) node — the draggable
      // one is uniquely identified by its cursor-grab class.
      const activeCard = carousel.querySelector(
        "article.cursor-grab",
      ) as HTMLElement;

      // Right after the 30s tick, the throw animation (250ms) is mid-flight —
      // the card should already be translated left, not yet swapped. Fake
      // timers only flush the RAF-driven animation loop reliably across
      // several smaller advances, not one large jump — so step up to the
      // interval fire, then nudge forward into the animation.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(activeCard.style.transform).toMatch(/translateX\(-\d/);
      expect(carousel).toHaveTextContent(TEAM_MEMBERS[0].name);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });
      const secondDot = screen.getByRole("button", {
        name: `Show ${TEAM_MEMBERS[1].name}`,
      });
      expect(secondDot.className).toMatch(/bg-accent/);
    });

    it("autoplay wraps from the last person back to the first (loop, no dead-end)", async () => {
      const lastMember = TEAM_MEMBERS[TEAM_MEMBERS.length - 1];
      render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);

      act(() => {
        fireEvent.click(
          screen.getByRole("button", { name: `Show ${lastMember.name}` }),
        );
      });
      // See the comment above the fly-out-throw test: fake timers need the
      // total advance split into several smaller steps to reliably flush the
      // RAF-driven animation, not one large jump.
      for (const step of [30000, 50, 50, 50, 50, 50, 50]) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(step);
        });
      }

      const firstDot = screen.getByRole("button", {
        name: `Show ${TEAM_MEMBERS[0].name}`,
      });
      expect(firstDot.className).toMatch(/bg-accent/);
    });
  });

  it("resets to the first person when the people list changes (e.g. filter switch)", () => {
    const managementOnly = TEAM_MEMBERS.filter((m) => m.category === "Management");
    const { rerender } = render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);

    const carousel = screen.getByTestId("crew-mobile-carousel");
    expect(carousel).toHaveTextContent(TEAM_MEMBERS[0].name);

    rerender(<TheCrewMobileCarousel people={managementOnly} />);

    expect(carousel).toHaveTextContent(managementOnly[0].name);
  });

  // jsdom has no real layout/pointer capture, so a physical drag gesture
  // can't be simulated end-to-end. resolveSwipeDirection is the pure
  // decision function ActiveCard's onDragEnd calls with framer-motion's
  // PanInfo — testing it directly covers the swipe-vs-cancel threshold
  // logic without needing real pointer events.
  describe("resolveSwipeDirection", () => {
    it("returns 'left' when dragged past the distance threshold to the left", () => {
      expect(resolveSwipeDirection(-150, 0)).toBe("left");
    });

    it("returns 'right' when dragged past the distance threshold to the right", () => {
      expect(resolveSwipeDirection(150, 0)).toBe("right");
    });

    it("returns 'left' when flicked fast to the left even under the distance threshold", () => {
      expect(resolveSwipeDirection(-20, -600)).toBe("left");
    });

    it("returns null when under both the distance and velocity thresholds", () => {
      expect(resolveSwipeDirection(30, 100)).toBeNull();
    });
  });

});
