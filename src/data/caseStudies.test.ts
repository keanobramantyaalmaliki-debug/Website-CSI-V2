import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { caseStudies } from "./caseStudies";
import { __resetContent, __setContent } from "@/lib/content/store";
import { FALLBACK_CASE_STUDIES } from "./caseStudiesFallback";

const dariCms = (over: Record<string, unknown> = {}) => ({
  id: "a",
  title: "Cerita Baru",
  client: "Klien Baru",
  year: "2025",
  industry: "Public Sector",
  scope: ["Web Platform"],
  outcome: "67% lebih cepat",
  quote: "Semuanya masih dikerjakan manual.",
  desc: "Paragraf pertama.\n\nParagraf kedua.",
  image: "/work/baru.webp",
  state: "live" as const,
  sortOrder: 0,
  ...over,
});

const kosong = {
  version: 1 as const,
  generatedAt: new Date().toISOString(),
  vision: null,
  footer: null,
  jobs: [],
  values: [],
  crew: [],
  projects: [],
  services: [],
  testimonials: [],
  industries: [],
  deployments: [],
  processSteps: [],
  sectionTexts: [],
};

describe("FALLBACK_CASE_STUDIES", () => {
  it("is non-empty", () => {
    expect(FALLBACK_CASE_STUDIES.length).toBeGreaterThan(0);
  });

  it("every entry fills the fields the section prints without a gate", () => {
    for (const s of FALLBACK_CASE_STUDIES) {
      expect(s.title.trim()).not.toBe("");
      expect(s.client.trim()).not.toBe("");
      expect(s.year.trim()).not.toBe("");
      expect(s.industry.trim()).not.toBe("");
      expect(s.quote.trim()).not.toBe("");
      expect(s.image.trim()).not.toBe("");
      /* Dicetak di antara judul dan tombol "Read the full story" — kosong di
         sini berarti ruang kosong bercetak tebal, bukan baris yang hilang. */
      expect(s.outcome.trim()).not.toBe("");
      /* Judul "Scope" ikut dicetak walau daftarnya kosong. */
      expect(s.scope.length).toBeGreaterThan(0);
    }
  });

  it("no duplicate titles, and no duplicate scope labels inside one story", () => {
    const titles = FALLBACK_CASE_STUDIES.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);

    /* `key={label}` dipakai di CaseStudySpotlight. */
    for (const s of FALLBACK_CASE_STUDIES) {
      expect(new Set(s.scope).size).toBe(s.scope.length);
    }
  });

  /* Ceritanya dipisah dengan `split("\n\n")` di komponen; satu Enter saja tidak
     jadi paragraf baru dan akan tayang sebagai satu blok panjang. */
  it("every story splits into at least one paragraph", () => {
    for (const s of FALLBACK_CASE_STUDIES) {
      expect(s.desc.split("\n\n").length).toBeGreaterThan(0);
      expect(s.desc.trim()).not.toBe("");
    }
  });
});

describe("caseStudies()", () => {
  beforeEach(() => __resetContent());
  afterEach(() => __resetContent());

  it("falls back to the bundled stories when content.json never loaded", () => {
    expect(caseStudies()).toEqual(FALLBACK_CASE_STUDIES);
  });

  it("prefers CMS stories over the bundle once content is loaded", () => {
    __setContent({ ...kosong, caseStudies: [dariCms()] });

    const hasil = caseStudies();
    expect(hasil).toHaveLength(1);
    expect(hasil[0].title).toBe("Cerita Baru");
    expect(hasil[0].scope).toEqual(["Web Platform"]);
  });

  /* Urutan blok cerita adalah urutan bacanya di halaman Work. */
  it("keeps the CMS order untouched", () => {
    __setContent({
      ...kosong,
      caseStudies: [
        dariCms({ id: "a", title: "Kedua", sortOrder: 1 }),
        dariCms({ id: "b", title: "Pertama", sortOrder: 0 }),
      ],
    });
    expect(caseStudies().map((s) => s.title)).toEqual(["Kedua", "Pertama"]);
  });

  /* Daftar kosong BUKAN alasan menghidupkan lagi isi bundle: kalau iya, editor
     yang menghapus semua cerita akan melihat cerita lama kembali sesudah
     Publish dan tidak punya cara menghapusnya. Yang menangani keadaan kosong
     itu `CaseStudySpotlight`, yang tidak merender seksinya sama sekali. */
  it("honours an empty CMS list instead of resurrecting the bundle", () => {
    __setContent({ ...kosong, caseStudies: [] });
    expect(caseStudies()).toHaveLength(0);
  });

  /* content.json yang ditulis sebelum case study masuk CMS tidak punya
     `caseStudies` sama sekali — itu berkas sehat, bukan berkas rusak. */
  it("falls back when the payload predates the caseStudies field", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      vision: null,
      footer: null,
      jobs: [],
    } as never);
    expect(caseStudies()).toEqual(FALLBACK_CASE_STUDIES);
  });

  /* Beda dengan `workProjects()`: di sana `outcome` kosong diubah jadi
     `undefined` supaya barisnya digerbangi. Di sini tidak ada terjemahan
     apa pun — kalau ada, isi CMS dan isi bundle jadi beda bentuk. */
  it("passes the CMS text through without reshaping it", () => {
    __setContent({
      ...kosong,
      caseStudies: [dariCms({ desc: "Satu.\n\nDua.", outcome: "" })],
    });
    const [hasil] = caseStudies();
    expect(hasil.outcome).toBe("");
    expect(hasil.desc).toBe("Satu.\n\nDua.");
  });
});
