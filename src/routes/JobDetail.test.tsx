/**
 * Halaman detail lowongan — perilaku yang benar-benar dipakai pelamar.
 *
 * <ApplyForm/> dirender SUNGGUHAN, tidak di-mock: ia HTML biasa (tidak ada 3D
 * di dalamnya, tidak seperti <Contact/> yang dulu menempel di sini dan menyeret
 * laptop + spring kamera ke jsdom). Yang dibuktikan di sini cuma bahwa halaman
 * menaruh form-nya dan bahwa toggle bahasa ikut sampai ke sana; perilaku
 * form-nya sendiri diuji di ApplyForm.test.tsx.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import JobDetail from "./JobDetail";

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

const scrollToSectionSpy = vi.fn();
const scrollToTopSpy = vi.fn();
vi.mock("@/lib/smoothScroll", () => ({
  scrollToSection: (id: string) => scrollToSectionSpy(id),
  scrollToTop: () => scrollToTopSpy(),
}));

function LocationProbe({ onChange }: { onChange: (url: string) => void }) {
  const loc = useLocation();
  useEffect(() => {
    onChange(loc.pathname + loc.hash);
  }, [loc, onChange]);
  return null;
}

function renderJob(path: string, onUrl?: (url: string) => void) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/careers/:slug" element={<JobDetail />} />
        <Route path="/people" element={<p>daftar lowongan</p>} />
      </Routes>
      {onUrl && <LocationProbe onChange={onUrl} />}
    </MemoryRouter>,
  );
}

const JOB = "/careers/full-stack-engineer";

beforeEach(() => {
  localStorage.clear();
  scrollToSectionSpy.mockClear();
  scrollToTopSpy.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("JobDetail", () => {
  it("menampilkan lowongan dalam bahasa Inggris secara default", () => {
    renderJob(JOB);

    expect(
      screen.getByRole("heading", { name: "Full Stack Engineer", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/What you will do/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Design, build, and maintain web applications/i),
    ).toBeInTheDocument();
    // Sisa situs berbahasa Inggris; halaman ini tidak boleh membuka dengan ID.
    expect(screen.queryByText(/Merancang, mengembangkan/i)).toBeNull();
  });

  it("toggle ID menukar isinya dan mengingat pilihannya", async () => {
    const user = userEvent.setup();
    renderJob(JOB);

    await user.click(screen.getByRole("button", { name: "id" }));

    expect(
      screen.getByText(/Merancang, mengembangkan & memelihara aplikasi web/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Apa yang akan kamu kerjakan/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Design, build, and maintain web applications/i),
    ).toBeNull();
    expect(localStorage.getItem("cogniti:job-lang")).toBe("id");
  });

  it("pilihan bahasa yang tersimpan dipakai saat halaman dibuka lagi", () => {
    localStorage.setItem("cogniti:job-lang", "id");
    renderJob(JOB);

    expect(screen.getByText(/Apa yang akan kamu kerjakan/i)).toBeInTheDocument();
  });

  /*
   * Router TIDAK mereset gulir sendiri — tidak ada <ScrollRestoration> di situs
   * ini. Tanpa panggilan ini, klik lowongan dari /people yang sudah tergulir
   * jauh mendarat di tengah-tengah halaman baru.
   */
  it("mereset gulir ke puncak lewat helper smoothScroll", () => {
    renderJob(JOB);
    expect(scrollToTopSpy).toHaveBeenCalled();
  });

  /* Tombol pintasan "Apply for this role" dicabut 27 Agu — form-nya sudah
     menempel langsung di bawah daftar, tanpa layar kosong di antaranya, jadi
     tombol yang cuma menggulir ke sana jadi tombol yang tidak mengerjakan
     apa-apa. Yang dijaga sekarang kebalikannya: ia tidak boleh diam-diam
     kembali, dan halaman ini tidak lagi menggulir sendiri ke mana pun selain
     ke puncak. */
  it("tidak ada lagi tombol pintasan Apply", () => {
    renderJob(JOB);

    expect(
      screen.queryByRole("button", { name: /apply for this role|lamar posisi ini/i }),
    ).not.toBeInTheDocument();
    expect(scrollToSectionSpy).not.toHaveBeenCalled();
  });

  /*
   * Form lamaran menggantikan section Contact (laptop 3D) yang dulu menempel di
   * sini. Dua form di satu halaman membuat pelamar menebak mana yang
   * benar-benar mengirim lamaran — dan yang salah tebak lamarannya mendarat
   * sebagai pertanyaan umum.
   */
  it("membawa form lamaran, bukan form Contact umum", () => {
    renderJob(JOB);

    expect(screen.getByRole("heading", { name: /apply now/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.queryByText(/Let.s Start a Conversation/i)).toBeNull();
  });

  it("toggle bahasa ikut sampai ke label form", async () => {
    const user = userEvent.setup();
    renderJob(JOB);

    await user.click(screen.getByRole("button", { name: "id" }));

    expect(screen.getByRole("heading", { name: /lamar sekarang/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nama depan/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/first name/i)).toBeNull();
  });

  /*
   * QC zoom-out (§4bb/§4bh): tanpa `section-shell`, halaman ini melar dari
   * tepi ke tepi saat browser di-zoom-out — bug yang sama yang sudah
   * dibereskan di 14 section pada 26 Agu, tapi halaman ini lahir belakangan
   * dan sempat sengaja tanpa shell (alasannya gugur sejak plafon dinamis
   * shellMax.ts). Footer ikut dijaga: ia satu-satunya elemen di luar
   * <article> selain ApplyForm (yang shell-nya dijaga strukturnya sendiri).
   */
  it("artikel dan footer terjepit kolom section-shell (QC zoom-out)", () => {
    const { container } = renderJob(JOB);

    expect(container.querySelector("article")?.className).toContain("section-shell");
    expect(container.querySelector("footer")?.className).toContain("section-shell");
  });

  /*
   * Plafon dalam ala basement (27 Agu): shell 1920 baru menjepit di zoom
   * <67% pada layar 1280 — supaya zoom-out menengah tetap terasa "mengecil",
   * konten diberi ukuran intrinsiknya sendiri: foto dipatok px, teks dipatok
   * ukuran baca 65ch. Yang dijaga kelasnya, bukan angkanya persis — angka
   * boleh di-tweak, disiplinnya jangan hilang diam-diam.
   */
  it("foto dan teks punya plafon dalam sendiri (ala basement)", () => {
    const { container } = renderJob(JOB);

    const photoWrap = container.querySelector("article img")?.parentElement;
    expect(photoWrap?.className).toMatch(/max-w-\[\d+px\]/);
    for (const ul of container.querySelectorAll("article ul")) {
      expect(ul.className).toContain("max-w-[65ch]");
    }
    expect(container.querySelectorAll("article ul").length).toBeGreaterThan(0);
  });

  it("slug tak dikenal dipulangkan ke daftar lowongan", async () => {
    let url = "";
    renderJob("/careers/ngawur", (u) => (url = u));

    expect(url).toBe("/people#careers");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});
