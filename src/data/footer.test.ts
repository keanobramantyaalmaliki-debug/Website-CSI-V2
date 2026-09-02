import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { footer } from "./footer";
import { __resetContent, __setContent } from "@/lib/content/store";
import { FALLBACK_FOOTER } from "./footerFallback";

const kosong = {
  version: 1 as const,
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
};

const isi = {
  email: "halo@cogniti.id",
  address: "Alamat baru dari CMS",
  copyright: "Cognitiva Solusi Indonesia.",
  socials: [{ label: "Instagram", href: "https://instagram.com/cogniti.id" }],
};

describe("FALLBACK_FOOTER", () => {
  it("ketiga isian teksnya terisi", () => {
    expect(FALLBACK_FOOTER.email.trim()).not.toBe("");
    expect(FALLBACK_FOOTER.address.trim()).not.toBe("");
    expect(FALLBACK_FOOTER.copyright.trim()).not.toBe("");
  });

  /* Cadangan yang sudah mengandung tahun akan tayang sebagai "© 2026 © 2026 …"
     — situs mencetak lambang dan tahunnya sendiri di depan baris ini. */
  it("baris hak ciptanya tanpa tahun dan tanpa lambang ©", () => {
    expect(FALLBACK_FOOTER.copyright).not.toMatch(/(19|20)\d{2}/);
    expect(FALLBACK_FOOTER.copyright).not.toContain("©");
  });

  it("tiap tautan cadangan punya tulisan dan alamat luar", () => {
    for (const s of FALLBACK_FOOTER.socials) {
      expect(s.label.trim()).not.toBe("");
      expect(s.href).toMatch(/^https?:\/\//);
    }
  });
});

describe("footer()", () => {
  beforeEach(() => __resetContent());
  afterEach(() => __resetContent());

  it("memakai isi bundle saat content.json tidak pernah termuat", () => {
    expect(footer()).toEqual(FALLBACK_FOOTER);
  });

  it("memilih isi CMS begitu kontennya termuat", () => {
    __setContent({ ...kosong, footer: isi });
    expect(footer()).toEqual(isi);
  });

  /* `content.json` yang ditulis SEBELUM kaki halaman masuk CMS adalah berkas
     sehat yang cuma belum punya bagian ini — bukan berkas rusak. */
  it("memakai isi bundle saat content.json belum punya bagian kaki halaman", () => {
    __setContent({ ...kosong, footer: null });
    expect(footer()).toEqual(FALLBACK_FOOTER);
  });

  it("jatuh ke cadangan per-isian saat teksnya kosong", () => {
    __setContent({
      ...kosong,
      footer: { ...isi, email: "", address: "   ", copyright: "" },
    });
    expect(footer()).toEqual({
      email: FALLBACK_FOOTER.email,
      address: FALLBACK_FOOTER.address,
      copyright: FALLBACK_FOOTER.copyright,
      socials: isi.socials,
    });
  });

  it("mempertahankan isian yang terisi saat isian lain kosong", () => {
    __setContent({
      ...kosong,
      footer: { ...isi, address: "", copyright: "" },
    });
    expect(footer()).toEqual({
      email: isi.email,
      address: FALLBACK_FOOTER.address,
      copyright: FALLBACK_FOOTER.copyright,
      socials: isi.socials,
    });
  });

  /**
   * INI yang membedakan `socials` dari tiga isian di atasnya, dan satu-satunya
   * alasan berkas ini ada.
   *
   * Larik kosong dari CMS dihormati apa adanya. Kalau ia ikut jatuh ke
   * cadangan seperti teksnya, editor yang menghapus semua tautannya akan
   * melihat tautan lama hidup lagi sesudah Publish — dan tidak ada cara
   * menghapusnya untuk selamanya, karena setiap daftar kosong dibaca sebagai
   * "belum diisi".
   */
  it("menghormati daftar tautan yang dikosongkan editor", () => {
    __setContent({ ...kosong, footer: { ...isi, socials: [] } });
    expect(footer().socials).toEqual([]);
  });

  /* Yang JATUH ke cadangan cuma keadaan "CMS-nya belum bicara" — keadaan yang
     berbeda dari "daftarnya sengaja dikosongkan", dan test di atas berpasangan
     dengan yang ini. */
  it("tautan cadangan tetap dipakai saat bagian kaki halamannya tidak ada", () => {
    __setContent({ ...kosong, footer: null });
    expect(footer().socials).toEqual(FALLBACK_FOOTER.socials);
  });
});
