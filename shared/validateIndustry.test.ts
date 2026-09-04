import { describe, expect, it } from "vitest";
import { MAX_LIVE_INDUSTRIES } from "@shared/industry";
import {
  firstIndustryError,
  isIndustryPublishable,
  validateIndustry,
  type IndustryInput,
} from "@shared/validateIndustry";

const lengkap = (over: Partial<IndustryInput> = {}): IndustryInput => ({
  name: "Government & Public Sector",
  desc: "Digital services and data platforms for public institutions.",
  tier: "core",
  image: "https://images.unsplash.com/photo-1",
  state: "live",
  ...over,
});

describe("validateIndustry — draft longgar", () => {
  it("draft cuma butuh nama sektor", () => {
    expect(
      validateIndustry({ ...lengkap(), state: "draft", desc: "", image: "" }),
    ).toEqual({});
  });

  it("draft tanpa nama tetap ditolak", () => {
    expect(
      validateIndustry({ ...lengkap(), state: "draft", name: "  " }).name,
    ).toBeTruthy();
  });

  it("draft tidak pernah ikut publish, selengkap apa pun isinya", () => {
    expect(isIndustryPublishable(lengkap({ state: "draft" }))).toBe(false);
  });
});

describe("validateIndustry — live diperiksa penuh", () => {
  it("sektor lengkap lolos", () => {
    expect(validateIndustry(lengkap())).toEqual({});
    expect(isIndustryPublishable(lengkap())).toBe(true);
  });

  /* Tumpukan 3D-nya `aria-hidden`, jadi kalimat ini yang dibaca pembaca layar
     lewat daftar sr-only — sekaligus satu-satunya isi kartu fokus. */
  it("kalimat penjelas jadi wajib begitu live", () => {
    expect(validateIndustry(lengkap({ desc: "" })).desc).toBeTruthy();
    expect(isIndustryPublishable(lengkap({ desc: "" }))).toBe(false);
  });

  it("kalimat penjelas sepanjang paragraf ditolak", () => {
    expect(validateIndustry(lengkap({ desc: "a".repeat(161) })).desc)
      .toBeTruthy();
  });

  /* Plank tanpa foto punya tampilan sah (putih buram) — yang kosong melompong
     justru kartu fokusnya, setelah pengunjung telanjur mengklik. */
  it("foto jadi wajib begitu live", () => {
    expect(validateIndustry(lengkap({ image: "  " })).image).toBeTruthy();
    expect(isIndustryPublishable(lengkap({ image: "" }))).toBe(false);
  });

  it("nama kepanjangan ditolak — kolom navigasi sentuh berlebar tetap", () => {
    expect(validateIndustry(lengkap({ name: "a".repeat(41) })).name)
      .toBeTruthy();
  });

  it("nama terpanjang yang tayang hari ini masih lolos", () => {
    expect(validateIndustry(lengkap()).name).toBeUndefined();
  });
});

describe("bobot & status", () => {
  it("bobot di luar dua pilihan ditolak, bahkan untuk draft", () => {
    const rusak = {
      ...lengkap({ state: "draft" }),
      tier: "utama",
    } as unknown as IndustryInput;
    expect(validateIndustry(rusak).tier).toBeTruthy();
  });

  it("status di luar dua pilihan ditolak", () => {
    const rusak = { ...lengkap(), state: "closed" } as unknown as IndustryInput;
    expect(validateIndustry(rusak).state).toBeTruthy();
  });
});

describe("firstIndustryError", () => {
  it("menyebut masalah paling atas dulu, bukan yang pertama ditemukan mesin", () => {
    const errors = validateIndustry(lengkap({ name: "", desc: "" }));
    expect(firstIndustryError(errors)?.field).toBe("name");
  });

  it("null saat semuanya sudah benar", () => {
    expect(firstIndustryError(validateIndustry(lengkap()))).toBeNull();
  });
});

describe("MAX_LIVE_INDUSTRIES", () => {
  /* Bukan tugas validateIndustry — dicatat di sini supaya kalau suatu hari ada
     yang memindahkan penjaganya, tesnya ikut mengarahkan ke tempat yang benar
     (`server/routes/industries.ts`). */
  it("bukan urusan pemeriksa per-baris", () => {
    expect(MAX_LIVE_INDUSTRIES).toBe(13);
    expect(validateIndustry(lengkap())).toEqual({});
  });
});
