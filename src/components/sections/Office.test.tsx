import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Office from "./Office";

// jsdom lacks IntersectionObserver; motion's whileInView/useInView need it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

// jsdom lacks ResizeObserver; @react-three/fiber's Canvas needs it to mount —
// Office menampung <ServicesTicker/> (sabuk teks 3D). Stub-nya tidak pernah
// memanggil balik, jadi canvas tidak pernah mengukur dirinya dan konteks WebGL
// tidak pernah dibuat — sama seperti pola overflow-guard.test.tsx.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

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

  // Sejak 21 Agu daftar layanan tampil sebagai sabuk teks 3D (ServicesTicker);
  // konten yang terbaca mesin adalah <ul> sr-only — itu yang diuji di sini.
  // Canvas-nya sendiri tidak bisa diuji di jsdom (tidak ada WebGL).
  it("renders exactly 9 services in the machine-readable sr-only list", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    const list = screen.getByRole("list");
    expect(list.children).toHaveLength(9);
  });

  it("keeps titles AND descriptions readable despite the canvas presentation", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    expect(screen.getByText(/custom software development/i)).toBeInTheDocument();
    expect(screen.getByText(/artificial intelligence solutions/i)).toBeInTheDocument();
    expect(screen.getByText(/maintenance & technical support/i)).toBeInTheDocument();
    // desc + subs pindah dari accordion ke baris sr-only yang sama.
    expect(screen.getByText(/software built around your processes/i)).toBeInTheDocument();
    expect(screen.getByText(/jenna\.ai/i)).toBeInTheDocument();
  });

  it("hides the decorative ticker panel from assistive tech", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    // Panel canvas murni dekoratif (aria-hidden); pembaca layar hanya boleh
    // bertemu daftar sr-only, bukan kotak kosong berisi petunjuk interaksi.
    // Bunyinya ikut perangkat: "scroll to explore" di pointer presisi (jsdom
    // default), "drag to explore" di layar sentuh (useCoarsePointer).
    expect(
      screen.getByText(/(scroll|drag) to explore/i).closest("[aria-hidden='true']"),
    ).not.toBeNull();
  });

  // CTA "Talk to us" dicabut 20 Agu bersama panel stat — section ini ditutup
  // TestimonialSpotlight, tanpa tombol.
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

  it("no longer hotlinks Unsplash photos (accordion thumbnails removed with the ticker redesign)", () => {
    render(
      <MemoryRouter>
        <Office />
      </MemoryRouter>,
    );
    const photos = [...document.querySelectorAll("img")].filter((img) =>
      img.src.includes("images.unsplash.com"),
    );
    expect(photos).toHaveLength(0);
  });
});
