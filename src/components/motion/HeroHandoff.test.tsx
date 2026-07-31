import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

let mockReduced = false;

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mockReduced };
});

const { default: HeroHandoff } = await import("./HeroHandoff");

beforeEach(() => { mockReduced = false; });

describe("HeroHandoff", () => {
  it("reduced-motion: no z-20 or -mt-32 (normal flow, no overlay)", () => {
    mockReduced = true;
    const { container } = render(<HeroHandoff />);
    const seam = container.firstChild as HTMLElement;
    expect(seam.className).not.toContain("z-20");
    expect(seam.className).not.toContain("-mt-32");
  });

  it("full-motion: has z-20, -mt-32, rounded-t (content-lifts-over seam)", () => {
    const { container } = render(<HeroHandoff />);
    const seam = container.firstChild as HTMLElement;
    expect(seam.className).toContain("z-20");
    expect(seam.className).toContain("-mt-32");
    expect(seam.className).toContain("rounded-t-3xl");
  });

  it("renders a single div with aria-hidden", () => {
    const { container } = render(<HeroHandoff />);
    const seam = container.firstChild as HTMLElement;
    expect(seam.tagName).toBe("DIV");
    expect(seam.getAttribute("aria-hidden")).toBe("true");
  });
});
