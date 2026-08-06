import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Process from "./Process";

// jsdom lacks IntersectionObserver; motion's whileInView needs it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

describe("Process", () => {
  it("renders without crashing and shows the heading", () => {
    render(<Process />);
    expect(screen.getByRole("heading", { name: /how we work/i })).toBeInTheDocument();
  });

  it("renders all 6 step titles (list + sticky panel, so 2 occurrences each)", () => {
    render(<Process />);
    for (const title of [
      "Discovery",
      "Strategy & Planning",
      "Design",
      "Development",
      "Testing & QA",
      "Deployment & Support",
    ]) {
      expect(screen.getAllByText(title)).toHaveLength(2);
    }
  });

  it("renders 6 step kickers", () => {
    render(<Process />);
    for (const kicker of ["UNDERSTAND", "PLAN", "SHAPE", "BUILD", "VERIFY", "LAUNCH"]) {
      expect(screen.getAllByText(kicker).length).toBeGreaterThan(0);
    }
  });

  it("renders a glyph SVG per step, in both the sticky panel and mobile fallback", () => {
    render(<Process />);
    // Each of the 6 steps renders its glyph twice: once inline (mobile
    // fallback) and once inside the sticky panel (desktop) — 12 total.
    expect(document.querySelectorAll("svg")).toHaveLength(12);
  });
});
