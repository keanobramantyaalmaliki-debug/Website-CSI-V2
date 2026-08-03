import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";

let mockReduced = false;

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mockReduced };
});

const { default: MagneticButton } = await import("./MagneticButton");

beforeEach(() => {
  mockReduced = false;
});

describe("MagneticButton", () => {
  it("reduced-motion: renders children without a wrapper element", () => {
    mockReduced = true;
    const { container, getByText } = render(
      <MagneticButton>
        <button type="button">Talk to us</button>
      </MagneticButton>,
    );
    expect(getByText("Talk to us")).toBeInTheDocument();
    expect(container.firstChild).toBe(getByText("Talk to us"));
  });

  it("full-motion: renders children inside a wrapper", () => {
    const { getByText } = render(
      <MagneticButton>
        <button type="button">Talk to us</button>
      </MagneticButton>,
    );
    const btn = getByText("Talk to us");
    expect(btn.parentElement).not.toBe(null);
    expect(btn.parentElement?.tagName).toBe("DIV");
  });

  it("full-motion: does not crash on mousemove/mouseleave", () => {
    const { getByText } = render(
      <MagneticButton>
        <button type="button">Talk to us</button>
      </MagneticButton>,
    );
    const wrapper = getByText("Talk to us").parentElement as HTMLElement;
    expect(() => {
      fireEvent.mouseMove(wrapper, { clientX: 120, clientY: 80 });
      fireEvent.mouseLeave(wrapper);
    }).not.toThrow();
  });
});
