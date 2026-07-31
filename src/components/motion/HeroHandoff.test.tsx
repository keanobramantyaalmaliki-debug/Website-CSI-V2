import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Control reduced-motion per-test via this flag (mutated before render).
// vi.mock is hoisted; the factory closes over the reference so mutations land.
let mockReduced = false;

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: () => mockReduced,
    // useScroll/useTransform use DOM scroll APIs absent in jsdom — stub them.
    useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
    useTransform: (_source: unknown, _input: unknown, output: number[]) => ({
      get: () => output[0],
    }),
  };
});

// Dynamic import so the mock is active before module resolves.
const { default: HeroHandoff } = await import("./HeroHandoff");

beforeEach(() => { mockReduced = false; });

describe("HeroHandoff", () => {
  it("reduced-motion: renders static fallback — no animated label", () => {
    mockReduced = true;
    render(<HeroHandoff />);
    expect(screen.queryByText(/leaving the office/i)).not.toBeInTheDocument();
  });

  it("full-motion: renders 'Leaving the office' label", () => {
    render(<HeroHandoff />);
    expect(screen.getByText(/leaving the office/i)).toBeInTheDocument();
  });

  it("reduced-motion: seam has no z-20 or -mt-32 (normal flow, no overlay)", () => {
    mockReduced = true;
    const { container } = render(<HeroHandoff />);
    const seam = container.firstChild as HTMLElement;
    expect(seam.className).not.toContain("z-20");
    expect(seam.className).not.toContain("-mt-32");
  });

  it("full-motion: seam has z-20, -mt-32, rounded-t (content-lifts-over seam)", () => {
    const { container } = render(<HeroHandoff />);
    const seam = container.firstChild as HTMLElement;
    expect(seam.className).toContain("z-20");
    expect(seam.className).toContain("-mt-32");
    expect(seam.className).toContain("rounded-t-3xl");
  });
});
