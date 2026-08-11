import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ArchitectureNode } from "@/data/architectureNodes";

// jsdom lacks IntersectionObserver; useScrollStepper and useInView need it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

let mockReduced = false;
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: () => mockReduced,
    // useInView drives the entry-reveal gate; in jsdom the observer never
    // fires, so pin it true to represent "grid has entered the viewport".
    useInView: () => true,
  };
});

const { default: ArchitectureGrid } = await import("./ArchitectureGrid");

const NODES: ArchitectureNode[] = [
  { num: "01", name: "Citizen", group: "Foundation", desc: "People drive the system." },
  { num: "02", name: "Operations", group: "Foundation", desc: "Intent into action." },
  { num: "05", name: "Intelligence", group: "Flow", desc: "Patterns before you ask." },
];

// Desktop: (hover: hover) and (pointer: fine) matches.
function setHoverCapable(matches: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes("hover") ? matches : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

beforeEach(() => {
  mockReduced = false;
  setHoverCapable(true);
});

describe("ArchitectureGrid", () => {
  it("always shows every node name and glyph (name-always-visible model)", () => {
    const { container } = render(<ArchitectureGrid nodes={NODES} />);
    for (const n of NODES) {
      expect(screen.getByRole("heading", { level: 3, name: n.name })).toBeInTheDocument();
    }
    expect(container.querySelectorAll("svg")).toHaveLength(NODES.length);
  });

  it("renders one h3 per node in narrative order", () => {
    render(<ArchitectureGrid nodes={NODES} />);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual(NODES.map((n) => n.name));
  });

  it("splits nodes into Foundation and Flow bands", () => {
    render(<ArchitectureGrid nodes={NODES} />);
    expect(screen.getByText("Foundation")).toBeInTheDocument();
    expect(screen.getByText("Flow")).toBeInTheDocument();
  });

  it("keeps each description in the DOM so it is reachable by assistive tech", () => {
    render(<ArchitectureGrid nodes={NODES} />);
    for (const n of NODES) {
      expect(screen.getByText(n.desc)).toBeInTheDocument();
    }
  });

  it("desktop: description is hidden at rest and revealed on hover", async () => {
    const user = userEvent.setup();
    render(<ArchitectureGrid nodes={NODES} />);
    const desc = screen.getByText(NODES[0].desc);

    expect(desc).toHaveStyle({ opacity: "0" });

    await user.hover(screen.getByRole("heading", { level: 3, name: "Citizen" }));
    await waitFor(() => expect(desc).toHaveStyle({ opacity: "1" }));

    await user.unhover(screen.getByRole("heading", { level: 3, name: "Citizen" }));
    await waitFor(() => expect(desc).toHaveStyle({ opacity: "0" }));
  });

  it("reduced-motion: every description is visible with no hover needed", () => {
    mockReduced = true;
    render(<ArchitectureGrid nodes={NODES} />);
    for (const n of NODES) {
      expect(screen.getByText(n.desc)).toHaveStyle({ opacity: "1" });
    }
  });

  it("reduced-motion: cells carry no tabindex / hover listeners", () => {
    mockReduced = true;
    render(<ArchitectureGrid nodes={NODES} />);
    const cell = screen.getByRole("heading", { level: 3, name: "Citizen" }).closest("div.group");
    expect(cell).not.toHaveAttribute("tabindex");
  });
});
