import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Deployments from "./Deployments";

// jsdom lacks IntersectionObserver; motion's whileInView needs it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

function mockPointer(coarse: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: query === "(pointer: coarse)" ? coarse : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

afterEach(() => {
  mockPointer(false);
});

describe("Deployments", () => {
  it("renders without crashing and shows the heading", () => {
    render(<Deployments />);
    expect(
      screen.getByRole("heading", { name: /built for real-world environments/i }),
    ).toBeInTheDocument();
  });

  it("renders all 5 sector names (front + back face, so 2 occurrences each)", () => {
    render(<Deployments />);
    for (const sector of [
      "Public Services",
      "Infrastructure",
      "Logistics",
      "Hospitality",
      "Communities",
    ]) {
      expect(screen.getAllByText(sector)).toHaveLength(2);
    }
  });

  it("renders one back-face Unsplash image per deployment card", () => {
    render(<Deployments />);
    const images = [...document.querySelectorAll("img")].filter((img) =>
      img.src.includes("images.unsplash.com"),
    );
    expect(images).toHaveLength(5);
  });

  it("fine-pointer devices flip a deployment card on hover", () => {
    mockPointer(false);
    render(<Deployments />);
    const card = screen.getByRole("button", { name: /public services/i });

    expect(card).toHaveAttribute("aria-pressed", "false");
    fireEvent.mouseEnter(card);
    expect(card).toHaveAttribute("aria-pressed", "true");
    fireEvent.mouseLeave(card);
    expect(card).toHaveAttribute("aria-pressed", "false");
  });

  it("coarse-pointer (touch) devices flip a deployment card on tap instead of hover", async () => {
    mockPointer(true);
    const user = userEvent.setup();
    render(<Deployments />);
    const card = screen.getByRole("button", { name: /public services/i });

    expect(card).toHaveAttribute("aria-pressed", "false");
    fireEvent.mouseEnter(card);
    expect(card).toHaveAttribute("aria-pressed", "false");

    await user.click(card);
    expect(card).toHaveAttribute("aria-pressed", "true");
    await user.click(card);
    expect(card).toHaveAttribute("aria-pressed", "false");
  });
});
