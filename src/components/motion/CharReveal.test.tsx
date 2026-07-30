import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CharReveal from "./CharReveal";

// Mock the reduced-motion hook directly (module-level matchMedia singleton
// makes per-test window.matchMedia toggling unreliable).
const reducedMotion = vi.hoisted(() => ({ value: false }));
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => reducedMotion.value };
});

describe("CharReveal", () => {
  beforeEach(() => {
    reducedMotion.value = false;
  });

  it("exposes the full text as an accessible label (not loose letters)", () => {
    render(<CharReveal text="Hello World" />);
    expect(screen.getByLabelText("Hello World")).toBeInTheDocument();
  });

  it("renders every character including spaces", () => {
    const { container } = render(<CharReveal text="Hello World" />);
    expect(container.textContent).toBe("Hello World");
  });

  it("still shows the text when reduced-motion is preferred", () => {
    reducedMotion.value = true;
    const { container } = render(<CharReveal text="Calm Path" />);
    expect(container.textContent).toBe("Calm Path");
  });
});
