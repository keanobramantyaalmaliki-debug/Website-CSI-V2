import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

const ROLE_TITLES = [
  "Innovation & Growth Manager",
  "Technical Lead",
  "Product Builder",
  "Full Stack Engineer",
];
const ROLE_TAGS = ["Growth", "Engineering", "Product"];
const HIRING_STAGES = [
  "Application",
  "Conversation",
  "Practical Challenge",
  "Final Interview",
  "Welcome Aboard",
];

describe("Careers", () => {
  it("renders all role titles and tags", () => {
    render(<Careers />);
    for (const title of ROLE_TITLES) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    for (const tag of ROLE_TAGS) {
      expect(screen.getAllByText(tag).length).toBeGreaterThan(0);
    }
  });

  it("How We Hire stages still render in order", () => {
    render(<Careers />);
    const nodes = HIRING_STAGES.map((stage) => screen.getByText(stage));
    for (let i = 1; i < nodes.length; i++) {
      expect(
        nodes[i - 1].compareDocumentPosition(nodes[i]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("mobile idle-glow class is present when motion is not reduced", () => {
    render(<Careers />);
    const heading = screen.getByText(ROLE_TITLES[0]);
    const card = heading.closest("article") as HTMLElement;
    expect(card.className).toMatch(/careers-idle-glow/);
  });

  it("hovering a card renders the cursor-follow spotlight when motion is not reduced", async () => {
    const user = userEvent.setup();
    render(<Careers />);
    const heading = screen.getByText(ROLE_TITLES[0]);
    const card = heading.closest("article") as HTMLElement;

    expect(card.querySelector('[data-testid="spotlight"]')).toBeInTheDocument();
    await user.hover(card);
  });

  it("every card renders a gray base icon + orange sweep overlay in its visual box", () => {
    render(<Careers />);
    for (const title of ROLE_TITLES) {
      const heading = screen.getByText(title);
      const card = heading.closest("article") as HTMLElement;
      const field = card.querySelector('[data-testid="career-field"]') as HTMLElement;
      expect(field).toBeInTheDocument();
      expect(field.querySelectorAll("svg").length).toBe(2);
      expect(
        field.querySelector('[data-testid="career-field-sweep"]'),
      ).toBeInTheDocument();
    }
  });
});
