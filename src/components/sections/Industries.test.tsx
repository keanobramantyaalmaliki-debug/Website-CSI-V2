import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
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

    it("the active indicator follows the hovered column, not every core column", async () => {
      mockMatchMedia({ minWidthMatches: true });
      const user = userEvent.setup();
      render(<Industries />);
      const gallery = screen.getByTestId("industries-gallery");

      // 04 is not core; 01 is. Hovering 04 should light 04 up, not 01.
      const target = within(gallery)
        .getByText(INDUSTRIES[3].name)
        .closest("button") as HTMLElement;
      const idleCore = within(gallery)
        .getByText(INDUSTRIES[0].name)
        .closest("button") as HTMLElement;

      expect(within(gallery).queryAllByTestId("active-indicator")).toHaveLength(0);

      await user.hover(target);

      expect(target).toHaveAttribute("aria-current", "true");
      expect(within(target).getByTestId("active-indicator")).toBeInTheDocument();
      expect(within(idleCore).queryByTestId("active-indicator")).not.toBeInTheDocument();
    });

    it("respects prefers-reduced-motion: content still renders, nothing crashes", () => {
      mockMatchMedia({ minWidthMatches: true, reducedMotionMatches: true });
      render(<Industries />);
      const gallery = screen.getByTestId("industries-gallery");
      expect(gallery.querySelectorAll("img")).toHaveLength(INDUSTRIES.length);
    });
  });

  describe("mobile master-detail", () => {
    it("renders a sector grid instead of the gallery below 1024px", () => {
      mockMatchMedia({ minWidthMatches: false });
      render(<Industries />);
      expect(screen.queryByTestId("industries-gallery")).not.toBeInTheDocument();
      const grid = screen.getByTestId("industries-mobile-grid");
      expect(within(grid).getAllByRole("button")).toHaveLength(INDUSTRIES.length);
    });

    it("tapping a sector reveals its detail with a back button", async () => {
      mockMatchMedia({ minWidthMatches: false });
      const user = userEvent.setup();
      render(<Industries />);
      const grid = screen.getByTestId("industries-mobile-grid");
      const target = within(grid)
        .getByText(INDUSTRIES[3].name)
        .closest("button");
      expect(target).not.toBeNull();

      await user.click(target as HTMLElement);

      const detail = screen.getByTestId("industries-mobile-detail");
      expect(within(detail).getByText(INDUSTRIES[3].name)).toBeInTheDocument();
      expect(within(detail).getByText(INDUSTRIES[3].desc)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /back to sectors/i }),
      ).toBeInTheDocument();
    });

    it("clicking back returns to the grid and hides the detail", async () => {
      mockMatchMedia({ minWidthMatches: false });
      const user = userEvent.setup();
      render(<Industries />);
      const grid = screen.getByTestId("industries-mobile-grid");
      const target = within(grid)
        .getByText(INDUSTRIES[0].name)
        .closest("button");

      await user.click(target as HTMLElement);
      const backButton = screen.getByRole("button", { name: /back to sectors/i });
      await user.click(backButton);

      // AnimatePresence keeps the exiting panel mounted during its exit
      // animation, so the removal lands a tick after the click.
      await waitFor(() =>
        expect(screen.queryByTestId("industries-mobile-detail")).not.toBeInTheDocument(),
      );
    });
  });
});
