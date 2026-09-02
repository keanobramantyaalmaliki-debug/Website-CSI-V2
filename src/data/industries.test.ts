import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { industries } from "./industries";
import { __resetContent, __setContent } from "@/lib/content/store";
import { FALLBACK_INDUSTRIES } from "./industriesFallback";
import { MAX_LIVE_INDUSTRIES } from "@shared/industry";

const dariCms = (over: Record<string, unknown> = {}) => ({
  id: "a",
  name: "Sektor Baru",
  desc: "Penjelasan satu kalimat.",
  tier: "also" as const,
  image: "/industries/baru.webp",
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
  services: [],
  testimonials: [],
  industries: [],
  deployments: [],
  processSteps: [],
};

describe("FALLBACK_INDUSTRIES", () => {
  it("tidak kosong", () => {
    expect(FALLBACK_INDUSTRIES.length).toBeGreaterThan(0);
  });

  /* Cadangan bundle adalah salah satu daftar yang benar-benar tayang, jadi ia
     terikat batas yang sama dengan daftar dari CMS — tumpukan spiralnya cuma
     muat sekian plank. */
  it("tidak melewati batas plank yang muat di tumpukan", () => {
    expect(FALLBACK_INDUSTRIES.length).toBeLessThanOrEqual(MAX_LIVE_INDUSTRIES);
  });

  it("tiap sektor punya nama, kalimat, dan foto", () => {
    for (const s of FALLBACK_INDUSTRIES) {
      expect(s.name.trim()).not.toBe("");
      /* Strip 3D-nya `aria-hidden`, jadi `desc` di daftar sr-only adalah
         satu-satunya bentuk sektor ini yang sampai ke pembaca layar dan mesin
         pencari. */
      expect(s.desc.trim()).not.toBe("");
      expect(s.image.trim()).not.toBe("");
    }
  });

  it("tidak ada nama kembar", () => {
    /* `key={industry.name}` dipakai di plank IndustriesStack dan di daftar
       sr-only Industries.tsx — nama kembar berarti dua elemen dengan key yang
       sama. */
    const nama = FALLBACK_INDUSTRIES.map((s) => s.name);
    expect(new Set(nama).size).toBe(nama.length);
  });
});

describe("industries()", () => {
  beforeEach(() => __resetContent());
  afterEach(() => __resetContent());

  it("memakai isi bundle saat content.json tidak pernah termuat", () => {
    expect(industries()).toEqual(FALLBACK_INDUSTRIES);
  });

  it("memilih isi CMS begitu kontennya termuat", () => {
    __setContent({ ...kosong, industries: [dariCms()] });

    const hasil = industries();
    expect(hasil).toHaveLength(1);
    expect(hasil[0].name).toBe("Sektor Baru");
    expect(hasil[0].image).toBe("/industries/baru.webp");
  });

  /* Urutan di sini bukan sekadar urutan daftar: ia menentukan anak tangga
     spiral yang ditempati tiap plank DAN nomor 01–13 yang tercetak di HUD.
     Yang mengurutkan adalah server (`sortOrder`); pembaca ini tidak boleh
     mengurutkan ulang apa pun. */
  it("membiarkan urutan dari CMS apa adanya", () => {
    __setContent({
      ...kosong,
      industries: [
        dariCms({ id: "a", name: "Kedua", sortOrder: 1 }),
        dariCms({ id: "b", name: "Pertama", sortOrder: 0 }),
      ],
    });
    expect(industries().map((s) => s.name)).toEqual(["Kedua", "Pertama"]);
  });

  /* Daftar kosong dari CMS = permintaan yang sah ("semuanya draft dulu"),
     bukan tanda content.json rusak. Yang menanganinya `Industries.tsx`:
     seluruh strip tidak dirender. Kalau pembaca ini malah jatuh ke cadangan,
     editor akan melihat sektor yang sudah dia draftkan tetap tayang. */
  it("menghormati daftar kosong dari CMS, tidak diam-diam kembali ke bundle", () => {
    __setContent({ ...kosong, industries: [] });
    expect(industries()).toEqual([]);
  });

  /* `content.json` yang ditulis SEBELUM industri masuk CMS adalah berkas sehat
     yang cuma belum punya bagian ini — bukan berkas rusak. */
  it("memakai isi bundle saat content.json belum punya bagian industri", () => {
    const lama = { ...kosong } as Record<string, unknown>;
    delete lama.industries;
    __setContent(lama as never);
    expect(industries()).toEqual(FALLBACK_INDUSTRIES);
  });

  /* Kolom yang cuma urusan panel tidak boleh bocor ke komponen: yang dipakai
     merender persis empat, dan `state`/`sortOrder`/`id` bukan salah satunya. */
  it("cuma meneruskan isian yang dirender", () => {
    __setContent({ ...kosong, industries: [dariCms()] });
    expect(Object.keys(industries()[0]).sort()).toEqual([
      "desc",
      "image",
      "name",
      "tier",
    ]);
  });
});
