import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";

// jsdom lacks IntersectionObserver; motion's whileInView needs it.
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

const { default: LivingArchitecture } = await import("./LivingArchitecture");

beforeEach(() => {
  mockReduced = false;
});

afterEach(() => {
  vi.useRealTimers();
});

const NODE_NAMES = [
  "Citizen",
  "Operations",
  "Knowledge",
  "Infrastructure",
  "Intelligence",
  "Decision",
  "Action",
];

describe("LivingArchitecture", () => {
  it("renders without crashing and shows the heading", () => {
    render(<LivingArchitecture />);
    expect(
      screen.getByRole("heading", { name: /a living architecture for decisions/i }),
    ).toBeInTheDocument();
  });

  it("renders all 7 node names (desktop slider + mobile reveal both in DOM, so 2 occurrences each)", () => {
    render(<LivingArchitecture />);
    for (const name of NODE_NAMES) {
      expect(screen.getAllByText(name)).toHaveLength(2);
    }
  });

  it("renders 7 glyph SVGs per variant (14 total: desktop slider + mobile reveal)", () => {
    render(<LivingArchitecture />);
    expect(document.querySelectorAll("svg")).toHaveLength(14);
  });

  it("clicking a card in the desktop slider brings it to the front", () => {
    render(<LivingArchitecture />);
    const actionCard = screen.getByRole("button", { name: /action — bring to front/i });
    expect(actionCard).toHaveAttribute("data-active", "false");

    fireEvent.click(actionCard);
    expect(actionCard).toHaveAttribute("data-active", "true");
  });

  it("auto-advances the front card every 5s", () => {
    vi.useFakeTimers();
    render(<LivingArchitecture />);
    const citizenCard = screen.getByRole("button", { name: /citizen — bring to front/i });
    expect(citizenCard).toHaveAttribute("data-active", "true");

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(citizenCard).toHaveAttribute("data-active", "false");
  });

  it("reduced-motion renders a static grid without crashing", () => {
    mockReduced = true;
    render(<LivingArchitecture />);
    expect(document.querySelector('[data-testid="glyph-slider-static"]')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="glyph-slider"]')).not.toBeInTheDocument();
  });
});
