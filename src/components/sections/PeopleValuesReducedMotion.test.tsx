import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VALUES } from "@/data/people";
import PeopleValues from "./PeopleValues";

// jsdom lacks IntersectionObserver; motion's whileInView + useScroll need it.
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

describe("PeopleValues — reduced motion", () => {
  it("renders the eyebrow and one timeline entry per value", () => {
    render(<PeopleValues />);
    expect(screen.getByText("What We Stand For")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(VALUES.length);
  });

  it("shows every value fully (heading + copy visible, no reveal offset left behind)", () => {
    render(<PeopleValues />);
    for (const value of VALUES) {
      expect(
        screen.getByRole("heading", { level: 2, name: value.title }),
      ).toBeInTheDocument();

      const copy = screen.getByText(value.description);
      // The scroll-linked reveal must not leave the copy dimmed or shifted when
      // the user has asked for reduced motion.
      expect(copy).not.toHaveStyle({ opacity: "0" });
      const style = copy.getAttribute("style") ?? "";
      expect(/translateY\((?!0px\))/.test(style)).toBe(false);
    }
  });
});
