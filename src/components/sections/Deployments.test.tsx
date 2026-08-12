import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Deployments from "./Deployments";

// jsdom lacks IntersectionObserver; motion's whileInView needs it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

const scrollToSectionSpy = vi.fn();
vi.mock("@/lib/smoothScroll", () => ({
  scrollToSection: (id: string) => scrollToSectionSpy(id),
}));

describe("Deployments", () => {
  it("renders without crashing and shows the heading", () => {
    render(<Deployments />);
    expect(
      screen.getByRole("heading", { name: /built for real-world environments/i }),
    ).toBeInTheDocument();
  });

  it("renders each sector name exactly once", () => {
    render(<Deployments />);
    for (const sector of [
      "Public Services",
      "Infrastructure",
      "Logistics",
      "Hospitality",
      "Communities",
    ]) {
      expect(screen.getAllByText(sector)).toHaveLength(1);
    }
  });

  it("renders one Unsplash image per deployment card, always present in the DOM", () => {
    render(<Deployments />);
    const images = [...document.querySelectorAll("img")].filter((img) =>
      img.src.includes("images.unsplash.com"),
    );
    expect(images).toHaveLength(5);
    for (const img of images) {
      expect(img.className).not.toMatch(/opacity-0|hidden/);
    }
  });

  it("renders every deployment description at rest", () => {
    render(<Deployments />);
    expect(
      screen.getByText(
        /citizens reach government services online/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/physical assets and field crews report in/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/every shipment stays visible from origin to delivery/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/property operations and guest service share one system/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/a single platform ties residents/i),
    ).toBeInTheDocument();
  });

  it("no deployment card is a button, and only the CTA is", () => {
    render(<Deployments />);
    expect(document.querySelectorAll("[aria-pressed]")).toHaveLength(0);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("nothing inside a card starts hidden — no hover gate on information", () => {
    render(<Deployments />);
    const cards = document.querySelectorAll("article");
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(
        card.querySelector('[class*="opacity-0"], [class*="invisible"], [hidden]'),
      ).toBeNull();
    }
  });

  it("the sixth grid cell is a CTA that scrolls to #contact through smoothScroll", async () => {
    const user = userEvent.setup();
    render(<Deployments />);
    const cta = screen.getByRole("button", { name: /talk to us/i });
    await user.click(cta);
    expect(scrollToSectionSpy).toHaveBeenCalledWith("contact");
  });

  it("the CTA is not a native anchor jump", () => {
    const { container } = render(<Deployments />);
    expect(container.querySelector('a[href="#contact"]')).toBeNull();
  });

  it("image push-in is applied when motion is allowed", () => {
    render(<Deployments />);
    const images = [...document.querySelectorAll("img")].filter((img) =>
      img.src.includes("images.unsplash.com"),
    );
    for (const img of images) {
      expect(img.className).toMatch(/group-hover:scale-/);
    }
  });
});
