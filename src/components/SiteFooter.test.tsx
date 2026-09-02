/**
 * Penjaga bahwa isi CMS benar-benar SAMPAI ke DOM kaki halaman.
 *
 * Ini bukan pengulangan `src/data/footer.test.ts`. Yang di sana menguji
 * fungsinya; yang di sini menguji cara komponennya memanggil fungsi itu — dan
 * justru pemanggilan itulah yang sudah lima kali gagal diam-diam di slice
 * sebelumnya. `const ISI = footer()` di ruang modul dihitung saat berkas
 * diimpor, yaitu SEBELUM `loadContent()` selesai, jadi CMS-nya tidak pernah
 * kelihatan berpengaruh dan tidak ada satu pun galat yang muncul.
 *
 * Test di bawah menyetel konten SESUDAH modulnya diimpor, persis seperti yang
 * terjadi di peramban. Kalau pemanggilannya pindah ke ruang modul, yang
 * terbaca tetap alamat cadangan dan test ini gagal.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import SiteFooter from "./SiteFooter";
import { __resetContent, __setContent } from "@/lib/content/store";
import { FALLBACK_FOOTER } from "@/data/footerFallback";
import type { ContentPayload } from "@shared/content";

const kosong = {
  version: 1,
  generatedAt: new Date().toISOString(),
  jobs: [],
  values: [],
  crew: [],
  projects: [],
  caseStudies: [],
  services: [],
  testimonials: [],
  industries: [],
  deployments: [],
  processSteps: [],
  vision: null,
  footer: null,
} as unknown as ContentPayload;

afterEach(() => __resetContent());

describe("SiteFooter", () => {
  it("memakai isi bundle saat content.json tidak pernah termuat", () => {
    render(<SiteFooter />);
    expect(screen.getByText(FALLBACK_FOOTER.email)).toBeInTheDocument();
    expect(screen.getByText(FALLBACK_FOOTER.address)).toBeInTheDocument();
  });

  it("membaca isi CMS, bukan cadangan yang beku di ruang modul", () => {
    __setContent({
      ...kosong,
      footer: {
        email: "halo@cogniti.id",
        address: "Alamat dari panel",
        copyright: "Cognitiva Solusi Indonesia.",
        socials: [{ label: "Instagram", href: "https://instagram.com/cogniti.id" }],
      },
    } as ContentPayload);

    render(<SiteFooter />);
    expect(screen.getByText("halo@cogniti.id")).toBeInTheDocument();
    expect(screen.getByText("Alamat dari panel")).toBeInTheDocument();
    expect(screen.queryByText(FALLBACK_FOOTER.email)).not.toBeInTheDocument();
  });

  it("surel jadi tautan mailto, tanpa mailto: ganda", () => {
    __setContent({
      ...kosong,
      footer: {
        email: "halo@cogniti.id",
        address: "Alamat dari panel",
        copyright: "Cognitiva Solusi Indonesia.",
        socials: [],
      },
    } as ContentPayload);

    render(<SiteFooter />);
    expect(screen.getByText("halo@cogniti.id")).toHaveAttribute(
      "href",
      "mailto:halo@cogniti.id",
    );
  });

  it("tautan sosial terbuka ke luar, sesuai urutan di panel", () => {
    __setContent({
      ...kosong,
      footer: {
        email: "halo@cogniti.id",
        address: "Alamat dari panel",
        copyright: "Cognitiva Solusi Indonesia.",
        socials: [
          { label: "Facebook", href: "https://facebook.com/cogniti" },
          { label: "Instagram", href: "https://instagram.com/cogniti.id" },
        ],
      },
    } as ContentPayload);

    render(<SiteFooter />);
    const tautan = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("target") === "_blank");
    expect(tautan.map((a) => a.textContent)).toEqual(["Facebook", "Instagram"]);
    expect(tautan[0]).toHaveAttribute("href", "https://facebook.com/cogniti");
  });

  /* Menghapus semua tautan harus menghasilkan kaki halaman TANPA baris
     tautan — bukan tautan cadangan yang hidup lagi. */
  it("daftar tautan kosong tidak menghidupkan tautan cadangan", () => {
    __setContent({
      ...kosong,
      footer: {
        email: "halo@cogniti.id",
        address: "Alamat dari panel",
        copyright: "Cognitiva Solusi Indonesia.",
        socials: [],
      },
    } as ContentPayload);

    render(<SiteFooter />);
    expect(
      screen.queryAllByRole("link").filter((a) => a.getAttribute("target") === "_blank"),
    ).toHaveLength(0);
  });

  /**
   * Tahunnya dicetak situs, bukan diketik editor — itu satu-satunya alasan
   * validator menolak tahun di baris hak cipta. Kalau cetakan ini hilang,
   * penolakan itu berubah dari penjaga jadi gangguan.
   */
  it("mencetak © dan tahun berjalan sendiri di depan baris hak cipta", () => {
    __setContent({
      ...kosong,
      footer: {
        email: "halo@cogniti.id",
        address: "Alamat dari panel",
        copyright: "Cognitiva Solusi Indonesia.",
        socials: [],
      },
    } as ContentPayload);

    render(<SiteFooter />);
    const tahun = new Date().getFullYear();
    expect(
      screen.getByText(`© ${tahun} Cognitiva Solusi Indonesia.`),
    ).toBeInTheDocument();
  });
});
