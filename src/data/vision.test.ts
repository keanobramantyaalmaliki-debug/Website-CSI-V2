import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { vision } from "./vision";
import { __resetContent, __setContent } from "@/lib/content/store";
import { FALLBACK_VISION } from "./visionFallback";

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
  vision: null,
};

describe("FALLBACK_VISION", () => {
  it("punya kalimat dan foto — keduanya, bukan salah satu", () => {
    expect(FALLBACK_VISION.statement.trim()).not.toBe("");
    expect(FALLBACK_VISION.photo.trim()).not.toBe("");
  });
});

describe("vision()", () => {
  beforeEach(() => __resetContent());
  afterEach(() => __resetContent());

  it("memakai isi bundle saat content.json tidak pernah termuat", () => {
    expect(vision()).toEqual(FALLBACK_VISION);
  });

  it("memilih isi CMS begitu kontennya termuat", () => {
    __setContent({
      ...kosong,
      vision: { statement: "Visi yang baru.", photo: "/home/baru.webp" },
    });

    expect(vision()).toEqual({
      statement: "Visi yang baru.",
      photo: "/home/baru.webp",
    });
  });

  /**
   * INI yang membedakan visi dari semua pembaca daftar.
   *
   * Di nilai atau layanan, daftar kosong dari CMS dihormati apa adanya dan
   * seksinya menghilang — memang itu yang diminta editor. Visi tidak punya
   * jalan ke sana: `pt-20 pb-20` miliknya satu-satunya yang menjatah celah
   * 80px antara plank Industries (tanpa `pb`) dan Contact (`pt-0`) di mobile,
   * jadi seksinya selalu dirender. Kalimat kosong berarti `<p>` kosong dan
   * foto kosong berarti `<img src="">` yang rusak — dua hal yang tidak pernah
   * diminta siapa pun.
   */
  it("jatuh ke cadangan per-isian saat CMS mengirim isian kosong", () => {
    __setContent({ ...kosong, vision: { statement: "", photo: "" } });
    expect(vision()).toEqual(FALLBACK_VISION);

    __setContent({ ...kosong, vision: { statement: "   ", photo: "  " } });
    expect(vision()).toEqual(FALLBACK_VISION);
  });

  /* Per-isian, bukan semua-atau-tidak sama sekali: `content.json` yang cuma
     separuh terisi tidak boleh menyeret isian yang sudah benar ikut mundur. */
  it("mempertahankan isian yang terisi saat isian lain kosong", () => {
    __setContent({
      ...kosong,
      vision: { statement: "Cuma kalimatnya yang diganti.", photo: "" },
    });
    expect(vision()).toEqual({
      statement: "Cuma kalimatnya yang diganti.",
      photo: FALLBACK_VISION.photo,
    });

    __setContent({
      ...kosong,
      vision: { statement: "", photo: "/home/cuma-foto.webp" },
    });
    expect(vision()).toEqual({
      statement: FALLBACK_VISION.statement,
      photo: "/home/cuma-foto.webp",
    });
  });

  /* `content.json` yang ditulis SEBELUM visi masuk CMS adalah berkas sehat
     yang cuma belum punya bagian ini — bukan berkas rusak. */
  it("memakai isi bundle saat content.json belum punya bagian visi", () => {
    __setContent({ ...kosong, vision: null });
    expect(vision()).toEqual(FALLBACK_VISION);
  });
});
