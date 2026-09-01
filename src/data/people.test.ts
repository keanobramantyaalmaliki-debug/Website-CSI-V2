import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { crew, peopleValues } from "./people";
import { __resetContent, __setContent } from "@/lib/content/store";
import { FALLBACK_CREW } from "./crewFallback";
import { FALLBACK_VALUES } from "./valuesFallback";
import type { TeamMember } from "./people";

const VALID_CATEGORIES: TeamMember["category"][] = [
  "Management",
  "Developer",
  "R & D",
];
const VALID_PLATFORMS = ["linkedin", "github", "x"];

describe("FALLBACK_CREW", () => {
  it("is non-empty", () => {
    expect(FALLBACK_CREW.length).toBeGreaterThan(0);
  });

  it("every entry has non-empty name, role, and category", () => {
    for (const m of FALLBACK_CREW) {
      expect(m.name.trim()).not.toBe("");
      expect(m.role.trim()).not.toBe("");
      expect(VALID_CATEGORIES).toContain(m.category);
    }
  });

  it("social platforms are valid when present", () => {
    for (const m of FALLBACK_CREW) {
      if (!m.social) continue;
      for (const s of m.social) {
        expect(VALID_PLATFORMS).toContain(s.platform);
        expect(s.url.trim()).not.toBe("");
      }
    }
  });

  it("has at least one member per category", () => {
    for (const cat of VALID_CATEGORIES) {
      const count = FALLBACK_CREW.filter((m) => m.category === cat).length;
      expect(count).toBeGreaterThan(0);
    }
  });

  it("no duplicate names", () => {
    const names = FALLBACK_CREW.map((m) => m.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});

describe("peopleValues()", () => {
  beforeEach(() => __resetContent());
  afterEach(() => __resetContent());

  it("falls back to the bundled values when content.json never loaded", () => {
    expect(peopleValues()).toHaveLength(3);
  });

  it("every bundled entry has non-empty title, tagline, and description", () => {
    for (const v of FALLBACK_VALUES) {
      expect(v.title.trim()).not.toBe("");
      expect(v.tagline.trim()).not.toBe("");
      expect(v.description.trim()).not.toBe("");
    }
  });

  it("no duplicate titles in the bundled values", () => {
    const titles = FALLBACK_VALUES.map((v) => v.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("prefers CMS values over the bundle once content is loaded", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      jobs: [],
      crew: [],
      values: [
        {
          id: "a",
          title: "Nilai Baru",
          tagline: "Dari CMS",
          description: "Diedit lewat panel admin.",
          photo: "/people/baru.webp",
          state: "live",
          sortOrder: 0,
        },
      ],
    });

    const hasil = peopleValues();
    expect(hasil).toHaveLength(1);
    expect(hasil[0].title).toBe("Nilai Baru");
  });

  /* Daftar kosong BUKAN alasan menghidupkan lagi isi bundle: kalau iya,
     editor yang menghapus semua nilai akan melihat nilai lama kembali sesudah
     Publish dan tidak punya cara menghapusnya. */
  it("honours an empty CMS list instead of resurrecting the bundle", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      jobs: [],
      crew: [],
      values: [],
    });
    expect(peopleValues()).toHaveLength(0);
  });

  /* content.json yang ditulis sebelum nilai masuk CMS tidak punya `values`
     sama sekali — itu berkas sehat, bukan berkas rusak. */
  it("falls back when the payload predates the values field", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      jobs: [],
    } as never);
    expect(peopleValues()).toEqual(FALLBACK_VALUES);
  });

  it("turns an empty CMS photo into an undefined one so the frame shows", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      jobs: [],
      crew: [],
      values: [
        {
          id: "a",
          title: "Tanpa Foto",
          tagline: "x",
          description: "y",
          photo: "",
          state: "live",
          sortOrder: 0,
        },
      ],
    });
    expect(peopleValues()[0].photo).toBeUndefined();
  });
});

describe("crew()", () => {
  beforeEach(() => __resetContent());
  afterEach(() => __resetContent());

  it("falls back to the bundled crew when content.json never loaded", () => {
    expect(crew()).toEqual(FALLBACK_CREW);
  });

  it("prefers CMS crew over the bundle once content is loaded", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      jobs: [],
      values: [],
      crew: [
        {
          id: "a",
          name: "Orang Baru",
          role: "Junior Developer",
          category: "Developer",
          photo: "/people/baru.webp",
          social: [{ platform: "linkedin", url: "https://example.com" }],
          state: "live",
        },
      ],
    });

    const hasil = crew();
    expect(hasil).toHaveLength(1);
    expect(hasil[0].name).toBe("Orang Baru");
    expect(hasil[0].photoUrl).toBe("/people/baru.webp");
  });

  /* Daftar kosong BUKAN alasan menghidupkan lagi isi bundle — alasan yang sama
     persis dengan `peopleValues()` di atas. */
  it("honours an empty CMS list instead of resurrecting the bundle", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      jobs: [],
      values: [],
      crew: [],
    });
    expect(crew()).toHaveLength(0);
  });

  /* content.json yang ditulis sebelum crew masuk CMS tidak punya `crew` sama
     sekali — itu berkas sehat, bukan berkas rusak. */
  it("falls back when the payload predates the crew field", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      jobs: [],
      values: [],
    } as never);
    expect(crew()).toEqual(FALLBACK_CREW);
  });

  /* Dua bentuk "kosong" diterjemahkan di `crew()`, bukan dibiarkan sampai ke
     komponen: `photo: ""` jadi `photoUrl: undefined` supaya CrewAvatar
     menggambar inisial, dan `social: []` jadi `undefined` supaya barisnya
     tidak menyisakan kolom tautan yang kosong. */
  it("turns empty CMS photo and social into undefined", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      jobs: [],
      values: [],
      crew: [
        {
          id: "a",
          name: "Tanpa Apa-apa",
          role: "Manager",
          category: "Management",
          photo: "",
          social: [],
          state: "live",
        },
      ],
    });

    const orang = crew()[0];
    expect(orang.photoUrl).toBeUndefined();
    expect(orang.social).toBeUndefined();
  });
});
