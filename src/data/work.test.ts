import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { workProjects } from "./work";
import { __resetContent, __setContent } from "@/lib/content/store";
import { FALLBACK_WORK_PROJECTS } from "./workProjectsFallback";

const dariCms = (over: Record<string, unknown> = {}) => ({
  id: "a",
  title: "Proyek Baru",
  client: "Klien Baru",
  year: "2025",
  tags: ["React"],
  image: "/work/baru.webp",
  outcome: "Hasilnya begini",
  state: "live" as const,
  sortOrder: 0,
  ...over,
});

describe("FALLBACK_WORK_PROJECTS", () => {
  it("is non-empty", () => {
    expect(FALLBACK_WORK_PROJECTS.length).toBeGreaterThan(0);
  });

  it("every entry has a non-empty title, client, year, and image", () => {
    for (const p of FALLBACK_WORK_PROJECTS) {
      expect(p.title.trim()).not.toBe("");
      expect(p.client.trim()).not.toBe("");
      expect(p.year.trim()).not.toBe("");
      /* Kartunya seluruhnya gambar — yang tayang tanpa ini adalah ikon
         "gambar rusak" bawaan peramban, bukan kartu polos. */
      expect(p.image.trim()).not.toBe("");
    }
  });

  it("no duplicate titles, and no duplicate tags inside one project", () => {
    const titles = FALLBACK_WORK_PROJECTS.map((p) => p.title);
    expect(new Set(titles).size).toBe(titles.length);

    /* `key={tag}` dipakai di CaseGrid dan CaseGridMobileStack. */
    for (const p of FALLBACK_WORK_PROJECTS) {
      expect(new Set(p.tags).size).toBe(p.tags.length);
    }
  });
});

describe("workProjects()", () => {
  beforeEach(() => __resetContent());
  afterEach(() => __resetContent());

  it("falls back to the bundled projects when content.json never loaded", () => {
    expect(workProjects()).toEqual(FALLBACK_WORK_PROJECTS);
  });

  it("prefers CMS projects over the bundle once content is loaded", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      vision: null,
      caseStudies: [],
      services: [],
      testimonials: [],
      industries: [],
      deployments: [],
      processSteps: [],
      jobs: [],
      values: [],
      crew: [],
      projects: [dariCms()],
    });

    const hasil = workProjects();
    expect(hasil).toHaveLength(1);
    expect(hasil[0].title).toBe("Proyek Baru");
    expect(hasil[0].tags).toEqual(["React"]);
  });

  /* Urutan di sini bukan sekadar urutan daftar: yang pertama adalah kartu yang
     sudah terbuka saat halaman Work dibuka. */
  it("keeps the CMS order untouched", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      vision: null,
      caseStudies: [],
      services: [],
      testimonials: [],
      industries: [],
      deployments: [],
      processSteps: [],
      jobs: [],
      values: [],
      crew: [],
      projects: [
        dariCms({ id: "a", title: "Kedua", sortOrder: 1 }),
        dariCms({ id: "b", title: "Pertama", sortOrder: 0 }),
      ],
    });
    expect(workProjects().map((p) => p.title)).toEqual(["Kedua", "Pertama"]);
  });

  /* Daftar kosong BUKAN alasan menghidupkan lagi isi bundle: kalau iya, editor
     yang menghapus semua proyek akan melihat proyek lama kembali sesudah
     Publish dan tidak punya cara menghapusnya. */
  it("honours an empty CMS list instead of resurrecting the bundle", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      vision: null,
      caseStudies: [],
      services: [],
      testimonials: [],
      industries: [],
      deployments: [],
      processSteps: [],
      jobs: [],
      values: [],
      crew: [],
      projects: [],
    });
    expect(workProjects()).toHaveLength(0);
  });

  /* content.json yang ditulis sebelum proyek masuk CMS tidak punya `projects`
     sama sekali — itu berkas sehat, bukan berkas rusak. */
  it("falls back when the payload predates the projects field", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      vision: null,
      caseStudies: [],
      jobs: [],
    } as never);
    expect(workProjects()).toEqual(FALLBACK_WORK_PROJECTS);
  });

  /* `outcome` opsional di situs: `CaseGrid` menggerbanginya berikut garis
     pemisah di atasnya, dan yang digerbangi adalah nilai falsy — string kosong
     dari database harus jadi `undefined`, bukan lolos sebagai baris kosong. */
  it("turns an empty CMS outcome into an undefined one", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      vision: null,
      caseStudies: [],
      services: [],
      testimonials: [],
      industries: [],
      deployments: [],
      processSteps: [],
      jobs: [],
      values: [],
      crew: [],
      projects: [dariCms({ outcome: "" })],
    });
    expect(workProjects()[0].outcome).toBeUndefined();
  });
});
