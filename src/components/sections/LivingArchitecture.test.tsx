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

const NODES = [
  { name: "Citizen", desc: "Every interaction starts with people — their needs drive the system." },
  { name: "Operations", desc: "Workflows that turn intent into action across every department." },
  { name: "Knowledge", desc: "Data and institutional memory that give every decision context." },
  { name: "Infrastructure", desc: "Cloud, APIs, and integrations that keep everything connected." },
  { name: "Intelligence", desc: "AI and analytics that surface patterns before you ask." },
  { name: "Decision", desc: "Where signals and intelligence converge into a clear course." },
  { name: "Action", desc: "Outcomes in the real world — sent, deployed, delivered." },
];

describe("LivingArchitecture", () => {
  it("renders without crashing and shows the heading", () => {
    render(<LivingArchitecture />);
    expect(
      screen.getByRole("heading", { name: /a living architecture for decisions/i }),
    ).toBeInTheDocument();
  });

  it("renders one h3 heading per node, in order", () => {
    render(<LivingArchitecture />);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings).toHaveLength(NODES.length);
    expect(headings.map((h) => h.textContent)).toEqual(NODES.map((n) => n.name));
  });

  it("renders every node's description", () => {
    render(<LivingArchitecture />);
    for (const node of NODES) {
      expect(screen.getByText(node.desc)).toBeInTheDocument();
    }
  });

  it("renders the Foundation and Flow group labels", () => {
    render(<LivingArchitecture />);
    // Group label also appears per sticky-panel (StickyScroll renders every
    // panel to the DOM — see Process.test.tsx), so assert presence, not count.
    expect(screen.getAllByText("Foundation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Flow").length).toBeGreaterThan(0);
  });
});
