import { describe, expect, it } from "vitest";
import {
  firstTestimonialError,
  isTestimonialPublishable,
  validateTestimonial,
  type TestimonialInput,
} from "@shared/validateTestimonial";

const lengkap = (over: Partial<TestimonialInput> = {}): TestimonialInput => ({
  quote:
    "Cogniti rebuilt the systems we had been patching together for years.",
  name: "Ratna Wijaya",
  role: "Head of IT, Dinas Komunikasi & Informatika",
  state: "live",
  ...over,
});

describe("validateTestimonial — draft longgar", () => {
  it("draft cuma butuh nama", () => {
    expect(
      validateTestimonial({ ...lengkap(), state: "draft", quote: "", role: "" }),
    ).toEqual({});
  });

  /* Nama, bukan kutipan, yang jadi syarat minimum: ia kunci baris ini di
     indeks unik database, `key` React di sizer, dan judul barisnya di panel. */
  it("draft tanpa nama tetap ditolak", () => {
    expect(
      validateTestimonial({ ...lengkap(), state: "draft", name: "  " }).name,
    ).toBeTruthy();
  });
});

describe("validateTestimonial — live diperiksa penuh", () => {
  it("testimoni lengkap lolos", () => {
    expect(validateTestimonial(lengkap())).toEqual({});
    expect(isTestimonialPublishable(lengkap())).toBe(true);
  });

  it("isian yang boleh kosong di draft jadi wajib begitu live", () => {
    const errors = validateTestimonial(lengkap({ quote: "", role: "" }));
    expect(errors.quote).toBeTruthy();
    expect(errors.role).toBeTruthy();
  });

  /* Nama asing di bawah pujian tanpa keterangan siapa dia = testimoni yang
     tidak menjelaskan apa-apa. Situs tidak menggerbangi barisnya, jadi yang
     tayang kalau ini lolos adalah baris kosong. */
  it("testimoni live tanpa jabatan tidak ikut publish", () => {
    expect(isTestimonialPublishable(lengkap({ role: "" }))).toBe(false);
  });

  it("draft tidak pernah ikut publish meski isinya lengkap", () => {
    expect(isTestimonialPublishable(lengkap({ state: "draft" }))).toBe(false);
  });

  it("status di luar daftar ditolak", () => {
    expect(
      validateTestimonial(
        lengkap({ state: "tayang" as TestimonialInput["state"] }),
      ).state,
    ).toBeTruthy();
  });
});

describe("validateTestimonial — batas panjang ikut tata letak", () => {
  /* Bukan soal satu kutipan panjang yang jelek sendirian: sizer mengunci
     tinggi blok ke entri TERPANJANG, jadi satu kutipan sepanjang paragraf
     menambah ruang kosong di bawah semua kutipan pendek. */
  it("kutipan sepanjang paragraf ditolak", () => {
    expect(validateTestimonial(lengkap({ quote: "a".repeat(281) })).quote)
      .toBeTruthy();
    expect(validateTestimonial(lengkap({ quote: "a".repeat(280) })).quote)
      .toBeUndefined();
  });

  it("nama dan jabatan punya batasnya sendiri", () => {
    expect(validateTestimonial(lengkap({ name: "A".repeat(61) })).name)
      .toBeTruthy();
    expect(validateTestimonial(lengkap({ role: "A".repeat(101) })).role)
      .toBeTruthy();
  });
});

describe("firstTestimonialError", () => {
  /* Fokus dilompatkan ke masalah PERTAMA dari atas form, bukan ke masalah yang
     kebetulan lebih dulu ditemukan pemeriksa — dan di form ini kutipan yang
     dibaca lebih dulu, meski namanya yang diperiksa lebih dulu. */
  it("mengembalikan isian teratas yang bermasalah", () => {
    const errors = validateTestimonial(lengkap({ quote: "", name: "" }));
    expect(firstTestimonialError(errors)?.field).toBe("quote");
  });

  it("null kalau sudah sah", () => {
    expect(firstTestimonialError(validateTestimonial(lengkap()))).toBeNull();
  });
});
