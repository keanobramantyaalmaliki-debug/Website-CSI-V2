import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { services } from "./services";
import { __resetContent, __setContent } from "@/lib/content/store";
import { FALLBACK_SERVICES } from "./servicesFallback";

const dariCms = (over: Record<string, unknown> = {}) => ({
  id: "a",
  title: "Layanan Baru",
  desc: "Penjelasan satu kalimat.",
  subs: ["Rincian Pertama"],
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
  caseStudies: [],
  testimonials: [],
  industries: [],
  deployments: [],
  processSteps: [],
};

describe("FALLBACK_SERVICES", () => {
  it("is non-empty", () => {
    expect(FALLBACK_SERVICES.length).toBeGreaterThan(0);
  });

  it("every entry has a non-empty title and desc", () => {
    for (const s of FALLBACK_SERVICES) {
      expect(s.title.trim()).not.toBe("");
      /* Sabuk 3D-nya `aria-hidden`, jadi `desc` adalah satu-satunya bentuk
         layanan ini yang sampai ke pembaca layar dan mesin pencari. */
      expect(s.desc.trim()).not.toBe("");
    }
  });

  it("no duplicate titles", () => {
    /* `key={item.title}` dipakai di ServicesTicker dan di daftar sr-only
       Office.tsx — judul kembar berarti dua elemen dengan key yang sama. */
    const titles = FALLBACK_SERVICES.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("services()", () => {
  beforeEach(() => __resetContent());
  afterEach(() => __resetContent());

  it("falls back to the bundled services when content.json never loaded", () => {
    expect(services()).toEqual(FALLBACK_SERVICES);
  });

  it("prefers CMS services over the bundle once content is loaded", () => {
    __setContent({ ...kosong, services: [dariCms()] });

    const hasil = services();
    expect(hasil).toHaveLength(1);
    expect(hasil[0].title).toBe("Layanan Baru");
    expect(hasil[0].subs).toEqual(["Rincian Pertama"]);
  });

  /* Urutan di sini bukan sekadar urutan daftar: ia urutan judul di sabuk, DAN
     urutan kalimat yang dibacakan pembaca layar dari atas ke bawah. */
  it("keeps the CMS order untouched", () => {
    __setContent({
      ...kosong,
      services: [
        dariCms({ id: "a", title: "Kedua", sortOrder: 1 }),
        dariCms({ id: "b", title: "Pertama", sortOrder: 0 }),
      ],
    });
    expect(services().map((s) => s.title)).toEqual(["Kedua", "Pertama"]);
  });

  /* Daftar kosong BUKAN alasan menghidupkan lagi isi bundle: kalau iya, editor
     yang menghapus semua layanan akan melihat layanan lama kembali sesudah
     Publish dan tidak punya cara menghapusnya. Yang menangani keadaan kosong
     itu `Office.tsx`, yang tidak merender sabuk maupun daftar sr-only-nya. */
  it("honours an empty CMS list instead of resurrecting the bundle", () => {
    __setContent({ ...kosong, services: [] });
    expect(services()).toHaveLength(0);
  });

  /* content.json yang ditulis sebelum layanan masuk CMS tidak punya `services`
     sama sekali — itu berkas sehat, bukan berkas rusak. */
  it("falls back when the payload predates the services field", () => {
    __setContent({
      version: 1,
      generatedAt: new Date().toISOString(),
      vision: null,
      footer: null,
      jobs: [],
    } as never);
    expect(services()).toEqual(FALLBACK_SERVICES);
  });

  /* Tidak ada terjemahan bentuk apa pun di `services()` — beda dengan
     `workProjects()`, yang mengubah `outcome: ""` jadi `undefined`. Layanan
     tanpa rincian tetap `subs: []`, dan Office.tsx yang memutuskan barisnya
     tidak ditulis. */
  it("passes an empty subs list through as an empty array", () => {
    __setContent({ ...kosong, services: [dariCms({ subs: [] })] });
    expect(services()[0].subs).toEqual([]);
  });
});
