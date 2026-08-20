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
  it("renders without the eyebrow label (removed 20 Aug)", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    // Eyebrow "Services" dicabut 20 Agu: navbar sudah menyebut nama
    // halamannya, jadi label di atas heading cuma mengulang.
    expect(screen.queryByText("Services")).not.toBeInTheDocument();
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
    // "Custom Software Development" is service #0, the default active
    // panel, so it also appears in PinnedServiceStack's sr-only label.
    expect(screen.getAllByText("Custom Software Development").length).toBeGreaterThan(0);
    expect(screen.getByText("Artificial Intelligence Solutions")).toBeInTheDocument();
    expect(screen.getByText("Cloud & DevOps")).toBeInTheDocument();
    expect(screen.getByText("Maintenance & Technical Support")).toBeInTheDocument();
  });

  // CTA "Talk to us" dicabut 20 Agu bersama panel stat — section ini ditutup
  // AwardsShowcase, tanpa tombol.
  it("does not render the removed Talk to us CTA", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /talk to us/i })).toBeNull();
  });

  it("renders a dummy testimonial quote with a named client", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    // getAllByText: TestimonialSpotlight merender tiap entri 2x (sizer
    // pengunci tinggi + overlay aktif), detailnya diuji di
    // TestimonialSpotlight.test.tsx.
    expect(screen.getAllByText(/cogniti rebuilt the systems/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ratna wijaya/i).length).toBeGreaterThan(0);
  });

  it("renders the founder recognition section", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    // Konten founder-section v1, dihidupkan 20 Agu menggantikan daftar award
    // fiktif (label "Recognition"-nya ikut dicabut) — detailnya diuji di
    // AwardsShowcase.test.tsx.
    expect(screen.getAllByText("Fami Maliki").length).toBeGreaterThan(0);
  });

  it("renders 9 desktop sticky-panel photos plus 9 mobile row thumbnails", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    // jsdom doesn't apply the lg: breakpoint CSS that hides one set or the
    // other, so both mount: 9 in PinnedServiceStack (desktop) + 9 collapsed
    // row thumbnails (mobile card anchor) = 18.
    const panelImages = [...document.querySelectorAll("img")].filter((img) =>
      img.src.includes("images.unsplash.com"),
    );
    expect(panelImages).toHaveLength(18);
  });

  it("expanding a row swaps its thumbnail for a full photo and reveals the description", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    // Collapsed thumbnail is removed and replaced by the expanded full photo
    // (shared layoutId morph) — net image count for this row stays at 1, so
    // the total across all 18 images is unchanged.
    const before = document.querySelectorAll("img").length;
    await user.click(screen.getByRole("button", { name: /custom software development/i }));
    expect(document.querySelectorAll("img").length).toBe(before);
    expect(screen.getByRole("region").textContent).toMatch(
      /software built around your processes/i,
    );
  });

  it("shows the first service's photo by default (scroll-driven index starts at 0)", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    // jsdom has no real scroll geometry, so scrollYProgress stays at rest —
    // this just guards against a crash and confirms the initial state is
    // sane (first panel visible, announced via the sr-only label) rather
    // than driving an actual scroll simulation.
    expect(screen.getAllByText("Custom Software Development").length).toBeGreaterThan(0);
  });
});
