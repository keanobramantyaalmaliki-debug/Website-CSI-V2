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

// jsdom lacks ResizeObserver; the rope-path measurement effect needs it.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

describe("Process", () => {
  it("renders without crashing and shows the heading", () => {
    render(<Process />);
    expect(screen.getByRole("heading", { name: /how we work/i })).toBeInTheDocument();
  });

  it("renders each step exactly once (title + description in its card)", () => {
    render(<Process />);
    for (const title of [
      "Discovery",
      "Strategy & Planning",
      "Design",
      "Development",
      "Testing & QA",
      "Deployment & Support",
    ]) {
      expect(screen.getAllByText(title)).toHaveLength(1);
    }
    expect(
      screen.getByText(/We map your current workflows/i),
    ).toBeInTheDocument();
  });

  it("renders 6 step kickers", () => {
    render(<Process />);
    for (const kicker of ["UNDERSTAND", "PLAN", "SHAPE", "BUILD", "VERIFY", "LAUNCH"]) {
      expect(screen.getAllByText(kicker)).toHaveLength(1);
    }
  });

  it("renders one glyph SVG per step; the rope SVG is layout-measured so it stays absent in jsdom (zero-size wrapper)", () => {
    render(<Process />);
    expect(document.querySelectorAll("svg")).toHaveLength(6);
  });
});
