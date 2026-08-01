import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// jsdom lacks IntersectionObserver; LineMask/FadeUp/useInView in this section need it to mount.
class IntersectionObserverStub {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

let mockReduced = false;

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mockReduced };
});

const { default: FeaturedProjects } = await import("./FeaturedProjects");

beforeEach(() => {
  mockReduced = false;
});

describe("FeaturedProjects", () => {
  it("renders without crashing: heading and all project titles/tags", () => {
    render(<FeaturedProjects />);
    expect(screen.getByText("Concrete Work, Concrete Results")).toBeInTheDocument();
    expect(screen.getByText("Citizen Service Portal")).toBeInTheDocument();
    expect(screen.getByText("Field Operations Suite")).toBeInTheDocument();
    expect(screen.getByText("Public Sector")).toBeInTheDocument();
    expect(screen.getByText("Infrastructure")).toBeInTheDocument();
  });

  it("heading column is sticky-scoped to the section, only from sm: up (mobile stays static to avoid overlapping project cards)", () => {
    const { container } = render(<FeaturedProjects />);
    const sticky = container.querySelector('[class*="sm:sticky"]');
    expect(sticky).toBeInTheDocument();
    expect(sticky?.className).not.toMatch(/(^|\s)sticky(\s|$)/);
    expect(sticky?.textContent).toContain("Featured Projects");
  });

  it("reduced-motion: project titles still render without crashing", () => {
    mockReduced = true;
    render(<FeaturedProjects />);
    expect(screen.getByText("Citizen Service Portal")).toBeInTheDocument();
    expect(screen.getByText("Field Operations Suite")).toBeInTheDocument();
  });
});
