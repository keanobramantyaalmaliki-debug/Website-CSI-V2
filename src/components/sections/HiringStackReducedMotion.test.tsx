import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HiringStack from "./HiringStack";

// jsdom lacks IntersectionObserver; motion reads it during setup.
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

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => true };
});

const STAGES = [
  "Application",
  "Conversation",
  "Practical Challenge",
  "Final Interview",
  "Welcome Aboard",
];

describe("HiringStack — reduced motion", () => {
  it("still renders every stage and image (static fallback)", () => {
    render(<HiringStack />);
    for (const s of STAGES) {
      expect(screen.getByRole("heading", { level: 3, name: s })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("img")).toHaveLength(STAGES.length);
  });

  it("drops position:sticky pinning when prefers-reduced-motion is set", () => {
    const { container } = render(<HiringStack />);
    expect(container.querySelectorAll("li.sticky")).toHaveLength(0);
    expect(screen.getAllByRole("listitem")).toHaveLength(STAGES.length);
  });
});
