import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { processSteps } from "./processSteps";
import { __resetContent, __setContent } from "@/lib/content/store";
import {
  FALLBACK_PROCESS_STEPS,
  type ProcessGlyphKey,
} from "./processStepsFallback";
import {
  MAX_LIVE_PROCESS_STEPS,
  PROCESS_GLYPH_KEYS,
} from "@shared/processStep";
import { PROCESS_GLYPHS_BY_KEY } from "@/components/motion/ProcessGlyphs";

const dariCms = (over: Record<string, unknown> = {}) => ({
  id: "a",
  title: "Langkah Baru",
  kicker: "MULAI",
  desc: "Penjelasan satu kalimat.",
  glyph: "discovery" as ProcessGlyphKey,
  state: "live" as const,
  sortOrder: 0,
  ...over,
});

const kosong = {
  version: 1 as const,
  generatedAt: new Date().toISOString(),
  vision: null,
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

describe("FALLBACK_PROCESS_STEPS", () => {
  it("tidak kosong", () => {
    expect(FALLBACK_PROCESS_STEPS.length).toBeGreaterThan(0);
  });

  /* Cadangan bundle ikut tayang, jadi ia terikat batas yang sama dengan daftar
     dari CMS. */
  it("tidak melewati batas langkah yang boleh tayang", () => {
    expect(FALLBACK_PROCESS_STEPS.length).toBeLessThanOrEqual(
      MAX_LIVE_PROCESS_STEPS,
    );
  });

  it("tiap langkah punya judul, kicker, kalimat, dan ilustrasi", () => {
    for (const s of FALLBACK_PROCESS_STEPS) {
      expect(s.title.trim()).not.toBe("");
      expect(s.kicker.trim()).not.toBe("");
      expect(s.desc.trim()).not.toBe("");
      expect(PROCESS_GLYPH_KEYS).toContain(s.glyph);
    }
  });

  it("tidak ada judul kembar", () => {
    /* `key={step.title}` dipakai di loop kartu Process.tsx. */
    const judul = FALLBACK_PROCESS_STEPS.map((s) => s.title);
    expect(new Set(judul).size).toBe(judul.length);
  });

  /* Cadangan ini menggantikan literal `STEPS` yang dulu memasangkan gambar
     lewat POSISI (`PROCESS_GLYPHS[i]`). Test ini menjaga pasangan lama tetap
     utuh sesudah pemasangannya pindah ke kolom `glyph`. */
  it("memakai keenam ilustrasi, satu-satu, sesuai urutan lama", () => {
    expect(FALLBACK_PROCESS_STEPS.map((s) => s.glyph)).toEqual([
      ...PROCESS_GLYPH_KEYS,
    ]);
  });
});

describe("PROCESS_GLYPHS_BY_KEY", () => {
  /* Kalau sebuah kunci tidak punya komponennya, `PROCESS_GLYPHS_BY_KEY[glyph]`
     jadi `undefined` dan React melempar saat merender — bukan galat yang
     terbaca. */
  it("punya satu komponen untuk tiap kunci yang boleh disimpan CMS", () => {
    for (const key of PROCESS_GLYPH_KEYS) {
      expect(typeof PROCESS_GLYPHS_BY_KEY[key]).toBe("function");
    }
    expect(Object.keys(PROCESS_GLYPHS_BY_KEY).sort()).toEqual(
      [...PROCESS_GLYPH_KEYS].sort(),
    );
  });
});

describe("processSteps()", () => {
  beforeEach(() => __resetContent());
  afterEach(() => __resetContent());

  it("memakai isi bundle saat content.json tidak pernah termuat", () => {
    expect(processSteps()).toEqual(FALLBACK_PROCESS_STEPS);
  });

  it("memilih isi CMS begitu kontennya termuat", () => {
    __setContent({ ...kosong, processSteps: [dariCms()] });

    const hasil = processSteps();
    expect(hasil).toHaveLength(1);
    expect(hasil[0].title).toBe("Langkah Baru");
    expect(hasil[0].kicker).toBe("MULAI");
  });

  /* Urutan di sini adalah alur kerja yang dibaca dari atas ke bawah SEKALIGUS
     nomor 01–06 yang tercetak di kartunya. Yang mengurutkan server
     (`sortOrder`); pembaca ini tidak boleh mengurutkan ulang apa pun. */
  it("membiarkan urutan dari CMS apa adanya", () => {
    __setContent({
      ...kosong,
      processSteps: [
        dariCms({ id: "a", title: "Kedua", sortOrder: 1 }),
        dariCms({ id: "b", title: "Pertama", sortOrder: 0 }),
      ],
    });
    expect(processSteps().map((s) => s.title)).toEqual(["Kedua", "Pertama"]);
  });

  /* Inti slice ini: ilustrasi dibaca dari kolomnya sendiri, bukan dari posisi
     baris. Kalau seseorang mengembalikan `PROCESS_GLYPHS[i]`, test ini yang
     jatuh. */
  it("membawa ilustrasi milik tiap langkah, bukan yang seurutan posisinya", () => {
    __setContent({
      ...kosong,
      processSteps: [
        dariCms({ id: "a", title: "Pertama", glyph: "deployment" }),
        dariCms({ id: "b", title: "Kedua", glyph: "discovery" }),
      ],
    });
    expect(processSteps().map((s) => s.glyph)).toEqual([
      "deployment",
      "discovery",
    ]);
  });

  /* Daftar kosong dari CMS = permintaan yang sah ("semuanya draft dulu"),
     bukan tanda content.json rusak. Yang menanganinya `Process.tsx`: seluruh
     seksi tidak dirender. Kalau pembaca ini malah jatuh ke cadangan, editor
     akan melihat langkah yang sudah dia draftkan tetap tayang. */
  it("menghormati daftar kosong dari CMS, tidak diam-diam kembali ke bundle", () => {
    __setContent({ ...kosong, processSteps: [] });
    expect(processSteps()).toEqual([]);
  });

  /* `content.json` yang ditulis SEBELUM cara kerja masuk CMS adalah berkas
     sehat yang cuma belum punya bagian ini — bukan berkas rusak. */
  it("memakai isi bundle saat content.json belum punya bagian cara kerja", () => {
    const lama = { ...kosong } as Record<string, unknown>;
    delete lama.processSteps;
    __setContent(lama as never);
    expect(processSteps()).toEqual(FALLBACK_PROCESS_STEPS);
  });

  /* Kolom yang cuma urusan panel tidak boleh bocor ke komponen: yang dipakai
     merender persis empat, dan `state`/`sortOrder`/`id` bukan salah satunya. */
  it("cuma meneruskan isian yang dirender", () => {
    __setContent({ ...kosong, processSteps: [dariCms()] });
    expect(Object.keys(processSteps()[0]).sort()).toEqual([
      "desc",
      "glyph",
      "kicker",
      "title",
    ]);
  });
});
