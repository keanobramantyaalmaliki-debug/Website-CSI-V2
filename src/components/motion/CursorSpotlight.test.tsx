import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CursorSpotlight from "./CursorSpotlight";

// useReducedMotion reads a module-level matchMedia singleton, so toggling
// window.matchMedia per-test is unreliable. Mock the hook directly instead.
const reducedMotion = vi.hoisted(() => ({ value: false }));
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => reducedMotion.value };
});

describe("CursorSpotlight", () => {
  beforeEach(() => {
    reducedMotion.value = false;
  });

  it("renders its children", () => {
    render(
      <CursorSpotlight>
        <p>Inner content</p>
      </CursorSpotlight>,
    );
    expect(screen.getByText("Inner content")).toBeInTheDocument();
  });

  it("marks the glow layer aria-hidden so screen readers ignore it", () => {
    const { container } = render(
      <CursorSpotlight>
        <p>Inner content</p>
      </CursorSpotlight>,
    );
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it("handles mouse move without crashing", () => {
    const { container } = render(
      <CursorSpotlight>
        <p>Inner content</p>
      </CursorSpotlight>,
    );
    const root = container.firstChild as HTMLElement;
    expect(() => fireEvent.mouseMove(root, { clientX: 40, clientY: 20 })).not.toThrow();
    expect(screen.getByText("Inner content")).toBeInTheDocument();
  });

  it("omits the glow layer when reduced-motion is preferred", () => {
    reducedMotion.value = true;
    const { container } = render(
      <CursorSpotlight>
        <p>Inner content</p>
      </CursorSpotlight>,
    );
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    expect(screen.getByText("Inner content")).toBeInTheDocument();
  });
});
