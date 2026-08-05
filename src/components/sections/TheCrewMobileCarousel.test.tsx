import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TheCrewMobileCarousel from "./TheCrewMobileCarousel";
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

  it("scrolling the list updates the visible profile based on scroll position", () => {
    render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);
    const carousel = screen.getByTestId("crew-mobile-carousel");
    const scrollEl = carousel.firstElementChild as HTMLElement;

    vi.spyOn(scrollEl, "clientWidth", "get").mockReturnValue(320);
    vi.spyOn(scrollEl.firstElementChild as HTMLElement, "clientWidth", "get").mockReturnValue(
      320,
    );

    fireEvent.scroll(scrollEl, { target: { scrollLeft: 320 * 2 } });

    expect(carousel).toHaveTextContent(TEAM_MEMBERS[2].name);
  });

  it("auto-advances to the next person after the interval, unless reduced motion is on", () => {
    vi.useFakeTimers();
    try {
      render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      const secondDot = screen.getByRole("button", {
        name: `Show ${TEAM_MEMBERS[1].name}`,
      });
      expect(secondDot.className).toMatch(/bg-accent/);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not auto-advance when reduced motion is enabled", () => {
    mockReduced = true;
    vi.useFakeTimers();
    try {
      render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      const firstDot = screen.getByRole("button", {
        name: `Show ${TEAM_MEMBERS[0].name}`,
      });
      const secondDot = screen.getByRole("button", {
        name: `Show ${TEAM_MEMBERS[1].name}`,
      });
      expect(firstDot.className).toMatch(/bg-accent/);
      expect(secondDot.className).not.toMatch(/bg-accent/);
    } finally {
      vi.useRealTimers();
    }
  });

  it("resets to the first person when the people list changes (e.g. filter switch)", () => {
    const managementOnly = TEAM_MEMBERS.filter((m) => m.category === "Management");
    const { rerender } = render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);

    const carousel = screen.getByTestId("crew-mobile-carousel");
    expect(carousel).toHaveTextContent(TEAM_MEMBERS[0].name);

    rerender(<TheCrewMobileCarousel people={managementOnly} />);

    expect(carousel).toHaveTextContent(managementOnly[0].name);
  });
});
