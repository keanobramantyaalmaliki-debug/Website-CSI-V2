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

const ROLE_TITLES = [
  "Innovation & Growth Manager",
  "Technical Lead",
  "Product Builder",
  "Full Stack Engineer",
];
const HIRING_STAGES = [
  "Application",
  "Conversation",
  "Practical Challenge",
  "Final Interview",
  "Welcome Aboard",
];

describe("Careers — promote", () => {
  it("renders every role once across the hero + strip", () => {
    render(<Careers />);
    for (const title of ROLE_TITLES) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it("features the first role in the hero with a working Apply link", () => {
    render(<Careers />);
    const hero = screen.getByTestId("career-hero");
    expect(within(hero).getByText(ROLE_TITLES[0])).toBeInTheDocument();

    const apply = within(hero).getByRole("link", { name: /apply for this role/i });
    expect(apply).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:hello@cogniti.id"),
    );
  });

  it("exposes the other three roles as promote buttons", () => {
    render(<Careers />);
    for (const title of ROLE_TITLES.slice(1)) {
      expect(
        screen.getByRole("button", { name: `Feature the ${title} role` }),
      ).toBeInTheDocument();
    }
    // The featured role is not also a promote button.
    expect(
      screen.queryByRole("button", { name: `Feature the ${ROLE_TITLES[0]} role` }),
    ).not.toBeInTheDocument();
  });

  it("promotes a clicked role to the hero and demotes the old hero to the strip", async () => {
    const user = userEvent.setup();
    render(<Careers />);

    await user.click(
      screen.getByRole("button", { name: "Feature the Technical Lead role" }),
    );

    const hero = screen.getByTestId("career-hero");
    expect(within(hero).getByText("Technical Lead")).toBeInTheDocument();

    // Old hero is now a strip button; promoted role no longer is.
    expect(
      screen.getByRole("button", {
        name: "Feature the Innovation & Growth Manager role",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Feature the Technical Lead role" }),
    ).not.toBeInTheDocument();
  });

  it("renders the hero spotlight + icon sweep when motion is not reduced", () => {
    render(<Careers />);
    const hero = screen.getByTestId("career-hero");

    expect(hero.querySelector('[data-testid="spotlight"]')).toBeInTheDocument();
    const field = hero.querySelector('[data-testid="career-field"]') as HTMLElement;
    expect(field.querySelectorAll("svg").length).toBe(2);
    expect(
      field.querySelector('[data-testid="career-field-sweep"]'),
    ).toBeInTheDocument();
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
});
