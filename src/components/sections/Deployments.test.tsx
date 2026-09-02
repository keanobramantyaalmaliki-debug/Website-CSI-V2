import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Deployments from "./Deployments";
import { __resetContent, __setContent } from "@/lib/content/store";
import type { ContentPayload } from "@shared/content";

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

/* Sejak isinya datang dari CMS, daftarnya bisa berbentuk yang literal array di
   dalam komponen tidak pernah bisa: nol kartu, atau satu. Dan nomor "01"–"05"
   yang dulu diketik tangan sekarang diturunkan dari posisi — jadi urutan yang
   diubah editor harus menomori ulang dengan sendirinya. */
const payload = (deployments: unknown[]): ContentPayload =>
  ({
    version: 1,
    generatedAt: new Date().toISOString(),
    vision: null,
    jobs: [],
    values: [],
    crew: [],
    projects: [],
    services: [],
    caseStudies: [],
    testimonials: [],
    industries: [],
    processSteps: [],
    deployments,
  }) as ContentPayload;

const dariCms = (over: Record<string, unknown> = {}) => ({
  id: "a",
  sector: "Sektor CMS",
  region: "Indonesia",
  desc: "Satu kalimat dari panel.",
  image: "/deployments/satu.webp",
  state: "live",
  sortOrder: 0,
  ...over,
});

describe("Deployments dengan isi dari CMS", () => {
  afterEach(() => __resetContent());

  it("membaca kartunya dari CMS, bukan dari cadangan bundle", () => {
    __setContent(payload([dariCms()]));
    render(<Deployments />);
    expect(screen.getByText("Sektor CMS")).toBeInTheDocument();
    expect(screen.queryByText("Public Services")).not.toBeInTheDocument();
  });

  /* Editor yang men-draft-kan semua kartunya memang meminta seluruh strip
     hilang. Judul yang menggantung di atas grid kosong lebih buruk daripada
     tidak ada apa-apa — dan celah 80px ke Process tetap utuh karena
     CsiHero di atasnya yang memegang angkanya. */
  it("tidak merender apa pun saat daftar CMS kosong", () => {
    __setContent(payload([]));
    const { container } = render(<Deployments />);
    expect(container).toBeEmptyDOMElement();
  });

  /* Nomor tidak pernah disimpan: yang tayang harus 01, 02, 03 berurutan dari
     posisi. Kalau ia ikut tersimpan, editor yang menghapus kartu ke-2 akan
     meninggalkan 01, 03, 04 di halaman. */
  it("menomori kartu dari posisinya, bukan dari kolom tersimpan", () => {
    __setContent(
      payload([
        dariCms({ id: "a", sector: "Pertama" }),
        dariCms({ id: "b", sector: "Kedua", region: "International" }),
        dariCms({ id: "c", sector: "Ketiga", region: "Southeast Asia" }),
      ]),
    );
    render(<Deployments />);
    expect(screen.getByText(/01 · Indonesia/)).toBeInTheDocument();
    expect(screen.getByText(/02 · International/)).toBeInTheDocument();
    expect(screen.getByText(/03 · Southeast Asia/)).toBeInTheDocument();
  });

  /* Dua kartu bersektor sama beda wilayah itu sah — pasangannya yang unik di
     basis data. Keduanya harus tampil, bukan salah satu tertelan React karena
     key kembar. */
  it("menampilkan dua kartu bersektor sama dengan wilayah berbeda", () => {
    __setContent(
      payload([
        dariCms({ id: "a", sector: "Logistics", region: "Indonesia" }),
        dariCms({ id: "b", sector: "Logistics", region: "International" }),
      ]),
    );
    render(<Deployments />);
    expect(screen.getAllByText("Logistics")).toHaveLength(2);
    expect(screen.getByText(/01 · Indonesia/)).toBeInTheDocument();
    expect(screen.getByText(/02 · International/)).toBeInTheDocument();
  });

  /* Foto kosong = `<img>` tidak dirender sama sekali. `src=""` di beberapa
     peramban justru meminta ulang halamannya sendiri. */
  it("tidak merender <img> saat kartunya belum punya foto", () => {
    __setContent(payload([dariCms({ image: "" })]));
    const { container } = render(<Deployments />);
    expect(screen.getByText("Sektor CMS")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});
