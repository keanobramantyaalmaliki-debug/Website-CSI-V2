import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

const { default: CaseGrid } = await import("./CaseGrid");

beforeEach(() => {
  mockReduced = false;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CaseGrid", () => {
  // Eyebrow "Portfolio" dicabut 21 Agu — heading "Selected Work" berdiri
  // sendiri; pastikan eyebrow-nya tidak kembali diam-diam.
  it("does not render the removed Portfolio eyebrow", () => {
    render(<CaseGrid />);
    expect(screen.queryByText("Portfolio")).toBeNull();
  });

  it("renders the heading text", () => {
    render(<CaseGrid />);
    expect(screen.getByText("Selected Work")).toBeInTheDocument();
  });

  it("shows a static project count and not the old filtered-count pattern", () => {
    render(<CaseGrid />);
    expect(screen.getByText("8 Projects")).toBeInTheDocument();
    expect(screen.queryByText(/\d+ of \d+ projects/i)).not.toBeInTheDocument();
  });

  it("no longer renders category filter buttons", () => {
    render(<CaseGrid />);
    for (const cat of ["All", "Public Sector", "Infrastructure", "AI & Data", "Enterprise", "Integration"]) {
      expect(screen.queryByRole("button", { name: cat })).not.toBeInTheDocument();
    }
  });

  it("renders 8 project images in the desktop fan slider and 8 in the mobile stack", () => {
    render(<CaseGrid />);
    const fanSlider = screen.getByTestId("fan-slider");
    const mobileStack = screen.getByTestId("mobile-stack");
    expect(fanSlider.querySelectorAll("img")).toHaveLength(8);
    expect(mobileStack.querySelectorAll("img")).toHaveLength(8);
  });

  it("clicking another card swaps the front overlay to that project", async () => {
    const user = userEvent.setup();
    render(<CaseGrid />);
    const fanSlider = screen.getByTestId("fan-slider");

    await user.click(within(fanSlider).getByRole("button", { name: "SIPD Implementation" }));

    await waitFor(() =>
      expect(within(fanSlider).getByText("200+ staff trained")).toBeInTheDocument(),
    );
  });

  it("auto-advances the active card every 5 seconds", async () => {
    vi.useFakeTimers();
    render(<CaseGrid />);
    const fanSlider = screen.getByTestId("fan-slider");

    expect(within(fanSlider).getByText("67% faster turnaround")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    // setInterval fired (fake clock); AnimatePresence's exit animation still
    // needs a real animation frame to resolve, so switch back to real timers.
    vi.useRealTimers();

    await waitFor(() =>
      expect(within(fanSlider).getByText("200+ staff trained")).toBeInTheDocument(),
    );
  });

  it("reduced motion disables auto-advance", () => {
    mockReduced = true;
    vi.useFakeTimers();
    render(<CaseGrid />);
    const fanSlider = screen.getByTestId("fan-slider");

    expect(within(fanSlider).getByText("67% faster turnaround")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(within(fanSlider).getByText("67% faster turnaround")).toBeInTheDocument();
  });

  it("mobile stack container uses scroll-snap for swipeable cards", () => {
    render(<CaseGrid />);
    const mobileStack = screen.getByTestId("mobile-stack");
    const scrollContainer = mobileStack.querySelector(".snap-x");
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer).toHaveClass("snap-mandatory");
  });

  it("hides tags and outcome in the mobile stack by default, behind a Details disclosure", () => {
    render(<CaseGrid />);
    const mobileStack = screen.getByTestId("mobile-stack");

    expect(within(mobileStack).queryByText("Web Platform")).not.toBeInTheDocument();
    expect(
      within(mobileStack).queryByText("67% faster turnaround"),
    ).not.toBeInTheDocument();
    expect(
      within(mobileStack).getAllByRole("button", { name: /details/i }).length,
    ).toBe(8);
  });

  it("reveals tags and outcome in the mobile stack after clicking Details", async () => {
    const user = userEvent.setup();
    render(<CaseGrid />);
    const mobileStack = screen.getByTestId("mobile-stack");

    const triggers = within(mobileStack).getAllByRole("button", { name: /details/i });
    await user.click(triggers[0]);

    expect(within(mobileStack).getByText("Web Platform")).toBeInTheDocument();
    expect(within(mobileStack).getByText("67% faster turnaround")).toBeInTheDocument();
  });
});
