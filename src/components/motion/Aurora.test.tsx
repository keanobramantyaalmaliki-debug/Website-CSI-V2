import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import Aurora from "./Aurora";

// Mock the reduced-motion hook directly (module-level matchMedia singleton
// makes per-test window.matchMedia toggling unreliable).
const reducedMotion = vi.hoisted(() => ({ value: false }));
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => reducedMotion.value };
});

describe("Aurora", () => {
  beforeEach(() => {
    reducedMotion.value = false;
  });

  it("renders a decorative, non-interactive layer (aria-hidden)", () => {
    const { container } = render(<Aurora />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root.className).toContain("pointer-events-none");
  });

  it("drifts its light pools when motion is allowed", () => {
    const { container } = render(<Aurora />);
    expect(container.querySelectorAll(".aurora-blob").length).toBe(2);
  });

  it("holds the pools still when reduced-motion is preferred", () => {
    reducedMotion.value = true;
    const { container } = render(<Aurora />);
    expect(container.querySelector(".aurora-blob")).toBeNull();
  });
});
