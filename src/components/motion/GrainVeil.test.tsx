import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import GrainVeil from "./GrainVeil";

// Mock the reduced-motion hook directly (module-level matchMedia singleton
// makes per-test window.matchMedia toggling unreliable).
const reducedMotion = vi.hoisted(() => ({ value: false }));
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => reducedMotion.value };
});

describe("GrainVeil", () => {
  beforeEach(() => {
    reducedMotion.value = false;
  });

  it("renders a decorative, non-interactive layer (aria-hidden)", () => {
    const { container } = render(<GrainVeil />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root.className).toContain("pointer-events-none");
  });

  it("drifts when motion is allowed", () => {
    const { container } = render(<GrainVeil />);
    expect(container.querySelector(".grain-veil-drift")).toBeInTheDocument();
  });

  it("stops drifting when reduced-motion is preferred", () => {
    reducedMotion.value = true;
    const { container } = render(<GrainVeil />);
    expect(container.querySelector(".grain-veil-drift")).toBeNull();
  });
});
