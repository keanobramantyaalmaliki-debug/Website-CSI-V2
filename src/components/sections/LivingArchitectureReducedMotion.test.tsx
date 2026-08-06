import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LivingArchitecture from "./LivingArchitecture";

// jsdom lacks IntersectionObserver; motion's whileInView and useScrollStepper need it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => true };
});

const DESCS = [
  "Every interaction starts with people — their needs drive the system.",
  "Workflows that turn intent into action across every department.",
  "Data and institutional memory that give every decision context.",
  "Cloud, APIs, and integrations that keep everything connected.",
  "AI and analytics that surface patterns before you ask.",
  "Where signals and intelligence converge into a clear course.",
  "Outcomes in the real world — sent, deployed, delivered.",
];

describe("LivingArchitecture — reduced motion", () => {
  it("every node description still renders when prefers-reduced-motion is set", () => {
    render(<LivingArchitecture />);
    for (const desc of DESCS) {
      expect(screen.getByText(desc)).toBeInTheDocument();
    }
  });

  it("no translateY offset on any node item when prefers-reduced-motion is set", () => {
    render(<LivingArchitecture />);
    // Scope to the node list (FadeUpItem is reduced-motion aware); the
    // eyebrow/intro motion.p elements above it use fixed initial offsets
    // that never resolve in this test env since whileInView never fires —
    // that's pre-existing behavior shared with Process.tsx, out of scope here.
    const list = document.querySelector(".border-t.border-white\\/\\[0\\.08\\]") as HTMLElement;
    const offsetElements = [...list.querySelectorAll('[style*="translateY"]')].filter(
      (el) => !/translateY\(0px\)/.test(el.getAttribute("style") ?? ""),
    );
    expect(offsetElements).toHaveLength(0);
  });
});
