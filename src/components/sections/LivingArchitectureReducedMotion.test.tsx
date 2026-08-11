import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LivingArchitecture from "./LivingArchitecture";

// jsdom lacks IntersectionObserver; motion's whileInView, useInView and
// useScrollStepper all need it.
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
  it("every node description renders and is visible when prefers-reduced-motion is set", () => {
    render(<LivingArchitecture />);
    for (const desc of DESCS) {
      const el = screen.getByText(desc);
      expect(el).toBeInTheDocument();
      // Payload must not be opacity-gated behind a hover the user can't perform.
      expect(el).not.toHaveStyle({ opacity: "0" });
    }
  });

  it("no lingering translateY offset on any node description under reduced motion", () => {
    // Scope to the node descriptions themselves — the section's intro
    // <motion.p> keeps a fixed initial y-offset that whileInView never
    // resolves in jsdom (pre-existing, shared with Process.tsx), which is
    // out of scope for the reveal mechanic under test here.
    render(<LivingArchitecture />);
    for (const desc of DESCS) {
      const style = screen.getByText(desc).getAttribute("style") ?? "";
      expect(/translateY\((?!0px\))/.test(style)).toBe(false);
    }
  });
});
