import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useMotionValue } from "motion/react";

// jsdom lacks ResizeObserver; @react-three/fiber's Canvas needs it to mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

let mockReduced = false;

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mockReduced };
});

const { default: CsiParticleField } = await import("./CsiParticleField");

function Wrapper() {
  const progress = useMotionValue(0);
  return <CsiParticleField progress={progress} />;
}

beforeEach(() => {
  mockReduced = false;
});

describe("CsiParticleField", () => {
  it("reduced-motion: renders gradient fallback, no Canvas", () => {
    mockReduced = true;
    const { container } = render(<Wrapper />);
    const field = container.firstChild as HTMLElement;
    expect(field.getAttribute("aria-hidden")).toBe("true");
    expect(field.style.background).toContain("radial-gradient");
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("full-motion: renders a Canvas wrapper", () => {
    const { container } = render(<Wrapper />);
    const field = container.firstChild as HTMLElement;
    expect(field.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("canvas")).not.toBeNull();
  });
});
