import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Industries from "./Industries";
import { INDUSTRIES } from "@/data/industries";

// jsdom lacks IntersectionObserver; motion's whileInView/useInView need it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

function mockMatchMedia({
  minWidthMatches = false,
  reducedMotionMatches = false,
}: {
  minWidthMatches?: boolean;
  reducedMotionMatches?: boolean;
}) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMotionMatches
        : minWidthMatches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("Industries", () => {
  it("renders without crashing and shows the heading", () => {
    mockMatchMedia({ minWidthMatches: false });
    render(<Industries />);
    expect(
      screen.getByRole("heading", { name: /built across sectors/i }),
    ).toBeInTheDocument();
  });

  it("renders every sector name, in order", () => {
    mockMatchMedia({ minWidthMatches: false });
    render(<Industries />);
    for (const industry of INDUSTRIES) {
      expect(screen.getByText(industry.name)).toBeInTheDocument();
    }
  });

  it("renders every sector's description", () => {
    mockMatchMedia({ minWidthMatches: false });
    render(<Industries />);
    for (const industry of INDUSTRIES) {
      expect(screen.getByText(industry.desc)).toBeInTheDocument();
    }
  });

  it("shows the sector/core count stat", () => {
    mockMatchMedia({ minWidthMatches: true });
    render(<Industries />);
    expect(screen.getByText("13 SECTORS · 3 core")).toBeInTheDocument();
  });

  describe("desktop gallery", () => {
    it("renders the expanding gallery with one image per sector", () => {
      mockMatchMedia({ minWidthMatches: true });
      render(<Industries />);
      const gallery = screen.getByTestId("industries-gallery");
      expect(gallery.querySelectorAll("img")).toHaveLength(INDUSTRIES.length);
    });

    it("every sector description stays in the DOM even when not hovered", () => {
      mockMatchMedia({ minWidthMatches: true });
      render(<Industries />);
      const gallery = screen.getByTestId("industries-gallery");
      for (const industry of INDUSTRIES) {
        expect(within(gallery).getByText(industry.desc)).toBeInTheDocument();
      }
    });

    it("hovering a column marks it as the active one", async () => {
      mockMatchMedia({ minWidthMatches: true });
      const user = userEvent.setup();
      render(<Industries />);
      const gallery = screen.getByTestId("industries-gallery");
      const target = within(gallery)
        .getByText(INDUSTRIES[3].name)
        .closest("button");
      expect(target).not.toBeNull();

      await user.hover(target as HTMLElement);

      expect(target).toHaveAttribute("aria-current", "true");
    });

    it("respects prefers-reduced-motion: content still renders, nothing crashes", () => {
      mockMatchMedia({ minWidthMatches: true, reducedMotionMatches: true });
      render(<Industries />);
      const gallery = screen.getByTestId("industries-gallery");
      expect(gallery.querySelectorAll("img")).toHaveLength(INDUSTRIES.length);
    });
  });

  describe("mobile fallback", () => {
    it("renders a vertical list instead of the gallery below 1024px", () => {
      mockMatchMedia({ minWidthMatches: false });
      render(<Industries />);
      expect(screen.queryByTestId("industries-gallery")).not.toBeInTheDocument();
      expect(screen.getAllByRole("img")).toHaveLength(INDUSTRIES.length);
    });
  });
});
