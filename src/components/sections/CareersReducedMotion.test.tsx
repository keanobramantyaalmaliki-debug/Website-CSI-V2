import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Careers from "./Careers";

// jsdom lacks IntersectionObserver; motion's whileInView needs it.
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

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => true };
});

describe("Careers — reduced motion", () => {
  it("drops the cursor-follow spotlight on the hero", () => {
    render(<Careers />);
    const hero = screen.getByTestId("career-hero");
    expect(hero.querySelector('[data-testid="spotlight"]')).not.toBeInTheDocument();
  });

  it("falls back to a single static icon (no sweep overlay) in the hero field", () => {
    render(<Careers />);
    const hero = screen.getByTestId("career-hero");
    const field = hero.querySelector('[data-testid="career-field"]') as HTMLElement;

    expect(field).toBeInTheDocument();
    expect(field.querySelectorAll("svg").length).toBe(1);
    expect(
      field.querySelector('[data-testid="career-field-sweep"]'),
    ).not.toBeInTheDocument();
  });

  it("still promotes a role (functional without the FLIP animation)", async () => {
    const user = userEvent.setup();
    render(<Careers />);

    await user.click(
      screen.getByRole("button", { name: "Feature the Product Builder role" }),
    );

    const hero = screen.getByTestId("career-hero");
    expect(within(hero).getByText("Product Builder")).toBeInTheDocument();
  });
});
