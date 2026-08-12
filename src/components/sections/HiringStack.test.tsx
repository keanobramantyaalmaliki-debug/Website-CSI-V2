import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HiringStack from "./HiringStack";

// jsdom lacks IntersectionObserver; motion reads it during setup.
class IntersectionObserverStub {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

const STAGES = [
  "Application",
  "Conversation",
  "Practical Challenge",
  "Final Interview",
  "Welcome Aboard",
];

describe("HiringStack", () => {
  it("renders every hiring stage as a heading, in order", () => {
    render(<HiringStack />);
    const nodes = STAGES.map((s) =>
      screen.getByRole("heading", { level: 3, name: s }),
    );
    for (let i = 1; i < nodes.length; i++) {
      expect(
        nodes[i - 1].compareDocumentPosition(nodes[i]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("renders an ordered list of five stage cards", () => {
    render(<HiringStack />);
    expect(screen.getByRole("list").tagName).toBe("OL");
    expect(screen.getAllByRole("listitem")).toHaveLength(STAGES.length);
  });

  it("each card has an image with descriptive alt text", () => {
    render(<HiringStack />);
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(STAGES.length);
    for (const img of imgs) {
      expect(img.getAttribute("alt")).toBeTruthy();
      expect(img.getAttribute("src")).toMatch(/^https:\/\/images\.unsplash\.com\//);
    }
  });

  it("pins cards with position:sticky when motion is not reduced", () => {
    const { container } = render(<HiringStack />);
    expect(container.querySelectorAll("li.sticky")).toHaveLength(STAGES.length);
  });
});
