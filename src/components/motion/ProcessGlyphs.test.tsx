import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  DiscoveryGlyph,
  StrategyGlyph,
  DesignGlyph,
  DevelopmentGlyph,
  TestingGlyph,
  DeploymentGlyph,
  PROCESS_GLYPHS,
} from "./ProcessGlyphs";

// jsdom + motion: no IntersectionObserver needed here since these glyphs are
// controlled via `play`, not whileInView. matchMedia default (matches:
// false) comes from src/test/setup.ts.

describe("ProcessGlyphs", () => {
  it("exports 6 glyph components", () => {
    expect(PROCESS_GLYPHS).toHaveLength(6);
  });

  it("DiscoveryGlyph renders an svg with its circles when playing", () => {
    const { container } = render(<DiscoveryGlyph play reduced={false} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelectorAll("circle").length).toBeGreaterThanOrEqual(2);
  });

  it("StrategyGlyph renders an svg with its vertex nodes when playing", () => {
    const { container } = render(<StrategyGlyph play reduced={false} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelectorAll("circle").length).toBeGreaterThanOrEqual(5);
  });

  it("DesignGlyph renders an svg with its rects when playing", () => {
    const { container } = render(<DesignGlyph play reduced={false} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelectorAll("rect").length).toBe(2);
  });

  it("DevelopmentGlyph renders an svg with its 4 code lines when playing", () => {
    const { container } = render(<DevelopmentGlyph play reduced={false} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelectorAll("line").length).toBe(4);
  });

  it("TestingGlyph renders an svg with a 3x3 grid of rects when playing", () => {
    const { container } = render(<TestingGlyph play reduced={false} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelectorAll("rect").length).toBe(9);
  });

  it("DeploymentGlyph renders an svg with its node circles when playing", () => {
    const { container } = render(<DeploymentGlyph play reduced={false} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelectorAll("circle").length).toBeGreaterThanOrEqual(5);
  });

  it("renders without crashing when not playing (hidden state)", () => {
    for (const Glyph of PROCESS_GLYPHS) {
      const { container, unmount } = render(<Glyph play={false} reduced={false} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
      unmount();
    }
  });

  it("renders without crashing under reduced motion, playing or not", () => {
    for (const Glyph of PROCESS_GLYPHS) {
      const playing = render(<Glyph play reduced />);
      expect(playing.container.querySelector("svg")).toBeInTheDocument();
      playing.unmount();

      const idle = render(<Glyph play={false} reduced />);
      expect(idle.container.querySelector("svg")).toBeInTheDocument();
      idle.unmount();
    }
  });
});
