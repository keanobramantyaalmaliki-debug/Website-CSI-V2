import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import Deployments from "./Deployments";

// jsdom lacks IntersectionObserver; motion's whileInView needs it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

vi.mock("@/lib/smoothScroll", () => ({ scrollToSection: vi.fn() }));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => true };
});

describe("Deployments — reduced motion", () => {
  it("no image push-in class when prefers-reduced-motion is set", () => {
    render(<Deployments />);
    const images = [...document.querySelectorAll("img")].filter((img) =>
      img.src.includes("images.unsplash.com"),
    );
    expect(images).toHaveLength(5);
    for (const img of images) {
      expect(img.className).not.toMatch(/group-hover:scale-/);
    }
  });
});
