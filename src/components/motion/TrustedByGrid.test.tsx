import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockReduced = false;

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mockReduced };
});

const { default: TrustedByGrid } = await import("./TrustedByGrid");

const BRANDS = [{ name: "Acme" }, { name: "Globex" }, { name: "Initech" }];

beforeEach(() => {
  mockReduced = false;
});

describe("TrustedByGrid", () => {
  it("renders without crashing: default heading and all brand cells", () => {
    render(<TrustedByGrid brands={BRANDS} />);
    expect(screen.getByText("Trusted by Visionaries")).toBeInTheDocument();
    for (const b of BRANDS) {
      expect(screen.getByText(b.name)).toBeInTheDocument();
    }
  });

  it("full-motion: hovering a cell swaps the heading to that brand", async () => {
    const user = userEvent.setup();
    render(<TrustedByGrid brands={BRANDS} />);
    const cell = screen.getByText("Acme");
    const heading = screen.getByRole("heading");

    await user.hover(cell);
    await waitFor(() => expect(heading.textContent).toContain("Trusted by Acme"));

    await user.unhover(cell);
    await waitFor(() => expect(heading.textContent).toBe("Trusted by Visionaries"));
  });

  it("full-motion: tapping a cell (touch) swaps the heading to that brand", async () => {
    render(<TrustedByGrid brands={BRANDS} />);
    const cell = screen.getByText("Acme");
    const heading = screen.getByRole("heading");

    fireEvent.touchStart(cell);
    await waitFor(() => expect(heading.textContent).toContain("Trusted by Acme"));

    fireEvent.touchEnd(cell);
    await waitFor(() => expect(heading.textContent).toBe("Trusted by Visionaries"));
  });

  it("reduced-motion: heading stays default and does not swap on hover", async () => {
    mockReduced = true;
    const user = userEvent.setup();
    render(<TrustedByGrid brands={BRANDS} />);
    const heading = screen.getByRole("heading");

    expect(heading.textContent).toBe("Trusted by Visionaries");

    const cell = screen.getByText("Acme");
    await user.hover(cell);

    expect(heading.textContent).toBe("Trusted by Visionaries");
  });
});
