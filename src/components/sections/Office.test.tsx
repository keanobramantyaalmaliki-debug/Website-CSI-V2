import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Office from "./Office";

// jsdom lacks IntersectionObserver; motion's whileInView/useInView need it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

describe("Office", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    expect(screen.getByText("Office")).toBeInTheDocument();
  });

  it("renders the deep-dive heading", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: /where software becomes intelligence/i }),
    ).toBeInTheDocument();
  });

  it("renders exactly 5 pillar cards", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    const list = screen.getByRole("list");
    expect(list.children).toHaveLength(5);
  });

  it("renders pillar titles distinct from the Lounge accordion's raw item titles", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    // Pillar titles are thematic groupings, not the original 9 SERVICES titles.
    expect(screen.getByText("Custom Software & Platforms")).toBeInTheDocument();
    expect(screen.getByText("Web & Mobile Experiences")).toBeInTheDocument();
    expect(screen.getByText("Systems & Cloud Infrastructure")).toBeInTheDocument();
    expect(screen.getByText("Ongoing Partnership")).toBeInTheDocument();
    expect(screen.queryByText("Custom Software Development")).not.toBeInTheDocument();
  });

  it("links the CTA back to Contact in the Lounge", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    const cta = screen.getByRole("link", { name: /talk to us/i });
    expect(cta).toHaveAttribute("href", "/#contact");
  });

  it("renders a testimonial placeholder without a fabricated quote", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    expect(screen.getByText(/client testimonial — pending/i)).toBeInTheDocument();
  });

  it("renders a recognition/awards placeholder without fabricated awards", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    expect(screen.getByText(/recognition & awards — pending/i)).toBeInTheDocument();
  });
});
