import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Careers from "./Careers";

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

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => true };
});

describe("Careers — reduced motion", () => {
  it("no spotlight and no idle-glow class when prefers-reduced-motion is set", () => {
    render(<Careers />);
    const heading = screen.getByText("Innovation & Growth Manager");
    const card = heading.closest("article") as HTMLElement;

    expect(card.querySelector('[data-testid="spotlight"]')).not.toBeInTheDocument();
    expect(card.className).not.toMatch(/careers-idle-glow/);
  });

  it("visual box falls back to a single static icon (no sweep overlay) when prefers-reduced-motion is set", () => {
    render(<Careers />);
    const heading = screen.getByText("Innovation & Growth Manager");
    const card = heading.closest("article") as HTMLElement;
    const field = card.querySelector('[data-testid="career-field"]') as HTMLElement;

    expect(field).toBeInTheDocument();
    expect(field.querySelectorAll("svg").length).toBe(1);
    expect(
      field.querySelector('[data-testid="career-field-sweep"]'),
    ).not.toBeInTheDocument();
  });
});
