import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("renders exactly 9 service accordion items", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    const list = screen.getByRole("list");
    expect(list.children).toHaveLength(9);
  });

  it("renders the service titles moved from the former Lounge accordion", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    expect(screen.getByText("Custom Software Development")).toBeInTheDocument();
    expect(screen.getByText("Artificial Intelligence Solutions")).toBeInTheDocument();
    expect(screen.getByText("Cloud & DevOps")).toBeInTheDocument();
    expect(screen.getByText("Maintenance & Technical Support")).toBeInTheDocument();
  });

  it("does not send Talk to us out of the room", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    // This section used to end in a "Talk to us" link to "/#contact" — the only
    // way to reach Contact while Office had none of its own. Office now renders
    // <Contact /> right below it (see roomContent.tsx), so that link would only
    // throw the visitor out of the page they are already reading; reported
    // 2026-08-06 as "talk to us in Office has no component".
    expect(
      screen.queryByRole("link", { name: /talk to us/i }),
      "Office links out to another room for Talk to us again. Its own " +
        "Contact section is directly below — the link is a detour.",
    ).not.toBeInTheDocument();
  });

  it("renders a testimonial placeholder without a fabricated quote", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    expect(screen.getByText(/testimonial coming soon/i)).toBeInTheDocument();
  });

  it("renders a recognition/awards placeholder without fabricated awards", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    expect(screen.getByText(/recognition & awards coming soon/i)).toBeInTheDocument();
  });

  it("renders the dummy stat panel next to the hero heading", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    expect(screen.getByText(/projects delivered/i)).toBeInTheDocument();
    expect(screen.getByText(/service lines/i)).toBeInTheDocument();
    expect(screen.getByText(/sectors served/i)).toBeInTheDocument();
  });

  it("renders one image panel per service, synced to the accordion list", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    // 9 services = 9 crossfaded photo panels (one visible at a time via hover state)
    const panelImages = [...document.querySelectorAll("img")].filter((img) =>
      img.src.includes("images.unsplash.com"),
    );
    expect(panelImages).toHaveLength(9);
  });

  it("reveals the service photo inline when a row is expanded (mobile has no hover)", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    // Desktop panel already renders all 9 photos; expanding a row adds one
    // more (the inline mobile copy) on top of that baseline.
    const before = document.querySelectorAll("img").length;
    await user.click(screen.getByRole("button", { name: /custom software development/i }));
    expect(document.querySelectorAll("img").length).toBe(before + 1);
  });
});
