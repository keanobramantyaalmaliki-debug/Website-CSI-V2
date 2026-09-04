import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TestimonialSpotlight from "./TestimonialSpotlight";
import { __resetContent, __setContent } from "@/lib/content/store";
import type { ContentPayload } from "@shared/content";

// jsdom lacks IntersectionObserver; motion's whileInView/useInView need it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

// Semua query di-scope ke overlay aktif (data-testid="testimonial-active"):
// sizer pengunci tinggi merender SEMUA entri (invisible), jadi query global
// akan menemukan nama entri lain bahkan sebelum panah diklik.
const active = () => screen.getByTestId("testimonial-active");

// AnimatePresence mode="wait" plays a real exit animation (~0.35s) before the
// next quote mounts, so assertions after a click go through findByText.
describe("TestimonialSpotlight", () => {
  it("shows the first testimonial by default", () => {
    render(<TestimonialSpotlight />);
    expect(within(active()).getByText(/cogniti rebuilt the systems/i)).toBeInTheDocument();
    expect(within(active()).getByText(/ratna wijaya/i)).toBeInTheDocument();
  });

  it("renders labelled prev/next arrows", () => {
    render(<TestimonialSpotlight />);
    expect(screen.getByRole("button", { name: /previous testimonial/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next testimonial/i })).toBeInTheDocument();
  });

  it("renders an invisible sizer with every entry so the block height stays locked", () => {
    render(<TestimonialSpotlight />);
    // Tiap nama muncul 2x: satu di sizer (selalu), satu di overlay aktif
    // (hanya entri terpilih) — total 3 + 1.
    expect(screen.getAllByText(/ratna wijaya/i)).toHaveLength(2);
    expect(screen.getAllByText(/budi hartono/i)).toHaveLength(1);
    expect(screen.getAllByText(/sari kusuma/i)).toHaveLength(1);
  });

  it("advances to the second testimonial on next", async () => {
    const user = userEvent.setup();
    render(<TestimonialSpotlight />);
    await user.click(screen.getByRole("button", { name: /next testimonial/i }));
    expect(await within(active()).findByText(/budi hartono/i)).toBeInTheDocument();
  });

  it("wraps from the first entry back to the last on prev", async () => {
    const user = userEvent.setup();
    render(<TestimonialSpotlight />);
    await user.click(screen.getByRole("button", { name: /previous testimonial/i }));
    expect(await within(active()).findByText(/sari kusuma/i)).toBeInTheDocument();
  });

  it("wraps from the last entry back to the first on next", async () => {
    const user = userEvent.setup();
    render(<TestimonialSpotlight />);
    const next = screen.getByRole("button", { name: /next testimonial/i });
    await user.click(next);
    await within(active()).findByText(/budi hartono/i);
    await user.click(next);
    await within(active()).findByText(/sari kusuma/i);
    await user.click(next);
    expect(await within(active()).findByText(/ratna wijaya/i)).toBeInTheDocument();
  });
});

/* Sejak isinya datang dari CMS, daftarnya bisa berbentuk yang literal array di
   dalam komponen tidak pernah bisa: nol entri, atau satu. Keduanya memakai
   `count` sebagai angka — `(i + dir + count) % count` — dan yang nol
   menghasilkan NaN. */
const payload = (testimonials: unknown[]): ContentPayload =>
  ({
    version: 1,
    generatedAt: new Date().toISOString(),
    vision: null,
    footer: null,
    jobs: [],
    values: [],
    crew: [],
    projects: [],
    services: [],
    caseStudies: [],
    industries: [],
    deployments: [],
    processSteps: [],
    sectionTexts: [],
    testimonials,
  }) as ContentPayload;

const dariCms = (over: Record<string, unknown> = {}) => ({
  id: "a",
  quote: "Kutipan dari CMS.",
  name: "Nama Satu",
  role: "Jabatan Satu",
  state: "live",
  sortOrder: 0,
  ...over,
});

describe("TestimonialSpotlight dengan isi dari CMS", () => {
  afterEach(() => __resetContent());

  it("reads its entries from the CMS instead of the bundle", () => {
    __setContent(payload([dariCms({ name: "Nama CMS" }), dariCms({ id: "b", name: "Nama Kedua" })]));
    render(<TestimonialSpotlight />);
    expect(within(active()).getByText(/nama cms/i)).toBeInTheDocument();
    expect(screen.queryByText(/ratna wijaya/i)).not.toBeInTheDocument();
  });

  /* Editor yang menghapus semua kutipannya memang meminta bloknya hilang —
     bukan halaman yang roboh karena `entries[NaN]`. */
  it("renders nothing at all when the CMS list is empty", () => {
    __setContent(payload([]));
    const { container } = render(<TestimonialSpotlight />);
    expect(container).toBeEmptyDOMElement();
  });

  /* Satu kutipan = tidak ada yang bisa diputar; panah yang tidak mengubah apa
     pun lebih buruk daripada panah yang tidak ada. */
  it("hides both arrows when only one testimonial is left", () => {
    __setContent(payload([dariCms()]));
    render(<TestimonialSpotlight />);
    expect(within(active()).getByText(/nama satu/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /previous testimonial/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /next testimonial/i }),
    ).not.toBeInTheDocument();
  });
});
