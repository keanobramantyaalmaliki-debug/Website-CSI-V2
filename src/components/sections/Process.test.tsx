import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Process from "./Process";
import { __resetContent, __setContent } from "@/lib/content/store";
import type { ContentPayload } from "@shared/content";

// jsdom lacks IntersectionObserver; motion's whileInView needs it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

// jsdom lacks ResizeObserver; the rope-path measurement effect needs it.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

describe("Process", () => {
  it("renders without crashing and shows the heading", () => {
    render(<Process />);
    expect(screen.getByRole("heading", { name: /how we work/i })).toBeInTheDocument();
  });

  it("renders each step exactly once (title + description in its card)", () => {
    render(<Process />);
    for (const title of [
      "Discovery",
      "Strategy & Planning",
      "Design",
      "Development",
      "Testing & QA",
      "Deployment & Support",
    ]) {
      expect(screen.getAllByText(title)).toHaveLength(1);
    }
    expect(
      screen.getByText(/We map your current workflows/i),
    ).toBeInTheDocument();
  });

  it("renders 6 step kickers", () => {
    render(<Process />);
    for (const kicker of ["UNDERSTAND", "PLAN", "SHAPE", "BUILD", "VERIFY", "LAUNCH"]) {
      expect(screen.getAllByText(kicker)).toHaveLength(1);
    }
  });

  it("renders one glyph SVG per step; the rope SVG is layout-measured so it stays absent in jsdom (zero-size wrapper)", () => {
    render(<Process />);
    expect(document.querySelectorAll("svg")).toHaveLength(6);
  });
});

/* Sejak isinya datang dari CMS, daftarnya bisa berbentuk yang literal `STEPS`
   di dalam berkas komponen tidak pernah bisa: nol langkah, atau satu. Dan
   nomor "01"–"06" yang dulu diketik tangan sekarang diturunkan dari posisi —
   jadi urutan yang diubah editor harus menomori ulang dengan sendirinya. */
const payload = (processSteps: unknown[]): ContentPayload =>
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
    testimonials: [],
    industries: [],
    deployments: [],
    processSteps,
  }) as ContentPayload;

const dariCms = (over: Record<string, unknown> = {}) => ({
  id: "a",
  title: "Langkah CMS",
  kicker: "MULAI",
  desc: "Satu kalimat dari panel.",
  glyph: "discovery",
  state: "live",
  sortOrder: 0,
  ...over,
});

describe("Process dengan isi dari CMS", () => {
  afterEach(() => __resetContent());

  it("membaca langkahnya dari CMS, bukan dari cadangan bundle", () => {
    __setContent(payload([dariCms()]));
    render(<Process />);
    expect(screen.getByText("Langkah CMS")).toBeInTheDocument();
    expect(screen.queryByText("Strategy & Planning")).not.toBeInTheDocument();
  });

  /* Editor yang men-draft-kan semua langkahnya memang meminta seluruh seksi
     hilang. Judul "How We Work" yang menggantung di atas tali tanpa kartu
     lebih buruk daripada tidak ada apa-apa — dan celah 80px mobile tetap utuh
     karena `pb-20` milik Deployments di atasnya yang menjatahnya, bukan seksi
     ini (yang memang tidak punya `pb` sama sekali). */
  it("tidak merender apa pun saat daftar CMS kosong", () => {
    __setContent(payload([]));
    const { container } = render(<Process />);
    expect(container).toBeEmptyDOMElement();
  });

  it("satu langkah pun sah — tidak ada perhitungan yang jatuh di daftar sependek itu", () => {
    __setContent(payload([dariCms()]));
    render(<Process />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(document.querySelectorAll("svg")).toHaveLength(1);
  });

  /* Nomor tidak pernah disimpan: yang tayang harus 01, 02, 03 berurutan dari
     posisi. Kalau ia ikut tersimpan, editor yang menghapus langkah ke-2 akan
     meninggalkan 01, 03, 04 di halaman. */
  it("menomori kartu dari posisinya, bukan dari kolom tersimpan", () => {
    __setContent(
      payload([
        dariCms({ id: "a", title: "Pertama" }),
        dariCms({ id: "b", title: "Kedua", kicker: "LANJUT" }),
        dariCms({ id: "c", title: "Ketiga", kicker: "SELESAI" }),
      ]),
    );
    render(<Process />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.queryByText("04")).not.toBeInTheDocument();
  });

  /* Inti slice ini. Dulu gambar dipilih `PROCESS_GLYPHS[i]` — menukar urutan
     dua langkah menukar gambarnya juga, tanpa ada yang meminta. Sekarang
     gambarnya MILIK langkahnya: dua langkah berilustrasi sama harus benar-
     benar menggambar SVG yang sama, apa pun posisinya. */
  it("memilih ilustrasi dari kolom `glyph`, bukan dari posisi barisnya", () => {
    __setContent(
      payload([
        dariCms({ id: "a", title: "Pertama", glyph: "deployment" }),
        dariCms({ id: "b", title: "Kedua", glyph: "deployment" }),
      ]),
    );
    render(<Process />);
    const svgs = [...document.querySelectorAll("svg")];
    expect(svgs).toHaveLength(2);
    expect(svgs[0].innerHTML).toBe(svgs[1].innerHTML);
  });
});
