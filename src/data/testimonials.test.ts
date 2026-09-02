import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { testimonials } from "./testimonials";
import { __resetContent, __setContent } from "@/lib/content/store";
import { FALLBACK_TESTIMONIALS } from "./testimonialsFallback";

const dariCms = (over: Record<string, unknown> = {}) => ({
  id: "a",
  quote: "Kutipan dari CMS.",
  name: "Nama Baru",
  role: "Jabatan Baru",
  state: "live" as const,
  sortOrder: 0,
  ...over,
});

describe("FALLBACK_TESTIMONIALS", () => {
  it("is non-empty", () => {
    expect(FALLBACK_TESTIMONIALS.length).toBeGreaterThan(0);
  });

  it("every entry has a non-empty quote, name, and role", () => {
    for (const t of FALLBACK_TESTIMONIALS) {
      expect(t.quote.trim()).not.toBe("");
      expect(t.name.trim()).not.toBe("");
      /* Nama tanpa jabatan membuat testimoninya kehilangan bobot — aturan yang
         sama dijaga `validateTestimonial` untuk yang `live`. */
      expect(t.role.trim()).not.toBe("");
    }
  });

  /* `key={e.name}` dipakai sizer pengunci tinggi di TestimonialSpotlight. */
  it("no duplicate names", () => {
    const names = FALLBACK_TESTIMONIALS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  /* Situs menambahkan “ ” sendiri; kutipan yang sudah membawa tanda kutip
     akan tayang dengan dua lapis. */
  it("no entry carries its own quotation marks", () => {
    for (const t of FALLBACK_TESTIMONIALS) {
      expect(t.quote).not.toMatch(/^[“"]/);
      expect(t.quote).not.toMatch(/[”"]$/);
    }
  });
});

describe("testimonials()", () => {
  beforeEach(() => __resetContent());
  afterEach(() => __resetContent());

  it("falls back to the bundled testimonials when content.json never loaded", () => {
    expect(testimonials()).toEqual(FALLBACK_TESTIMONIALS);
  });

  it("prefers CMS testimonials over the bundle once content is loaded", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      vision: null,
      caseStudies: [],
      services: [],
      industries: [],
      deployments: [],
      processSteps: [],
      jobs: [],
      values: [],
      crew: [],
      projects: [],
      testimonials: [dariCms()],
    });

    const hasil = testimonials();
    expect(hasil).toHaveLength(1);
    expect(hasil[0].name).toBe("Nama Baru");
    expect(hasil[0].quote).toBe("Kutipan dari CMS.");
  });

  /* Urutan di sini bukan sekadar urutan daftar: yang pertama adalah kutipan
     yang terlihat saat halaman Services dibuka. */
  it("keeps the CMS order untouched", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      vision: null,
      caseStudies: [],
      services: [],
      industries: [],
      deployments: [],
      processSteps: [],
      jobs: [],
      values: [],
      crew: [],
      projects: [],
      testimonials: [
        dariCms({ id: "a", name: "Kedua", sortOrder: 1 }),
        dariCms({ id: "b", name: "Pertama", sortOrder: 0 }),
      ],
    });
    expect(testimonials().map((t) => t.name)).toEqual(["Kedua", "Pertama"]);
  });

  /* Daftar kosong BUKAN alasan menghidupkan lagi isi bundle: kalau iya, editor
     yang menghapus semua kutipan akan melihat kutipan lama kembali sesudah
     Publish dan tidak punya cara menghapusnya. */
  it("honours an empty CMS list instead of resurrecting the bundle", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      vision: null,
      caseStudies: [],
      services: [],
      industries: [],
      deployments: [],
      processSteps: [],
      jobs: [],
      values: [],
      crew: [],
      projects: [],
      testimonials: [],
    });
    expect(testimonials()).toHaveLength(0);
  });

  /* content.json yang ditulis sebelum testimoni masuk CMS tidak punya
     `testimonials` sama sekali — itu berkas sehat, bukan berkas rusak. */
  it("falls back when the payload predates the testimonials field", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      vision: null,
      caseStudies: [],
      jobs: [],
      values: [],
      crew: [],
      projects: [],
    } as never);
    expect(testimonials()).toEqual(FALLBACK_TESTIMONIALS);
  });
});
