import { describe, expect, it } from "vitest";
import {
  firstValueError,
  isValuePublishable,
  validateValue,
  type ValueInput,
} from "@shared/validateValue";

const lengkap = (over: Partial<ValueInput> = {}): ValueInput => ({
  title: "Craft First",
  tagline: "Precision over speed",
  description:
    "We believe the details are the work. Every margin, transition, and copy decision is deliberate.",
  photo: "/people/craft-first.webp",
  state: "live",
  ...over,
});

describe("validateValue — draft longgar", () => {
  it("draft cuma butuh judul", () => {
    expect(
      validateValue({
        ...lengkap(),
        state: "draft",
        tagline: "",
        description: "",
        photo: "",
      }),
    ).toEqual({});
  });

  it("draft tanpa judul tetap ditolak", () => {
    expect(validateValue({ ...lengkap(), state: "draft", title: "  " }).title)
      .toBeTruthy();
  });
});

describe("validateValue — live diperiksa penuh", () => {
  it("nilai lengkap lolos", () => {
    expect(validateValue(lengkap())).toEqual({});
    expect(isValuePublishable(lengkap())).toBe(true);
  });

  it("isian yang boleh kosong di draft jadi wajib begitu live", () => {
    const errors = validateValue({
      ...lengkap(),
      tagline: "",
      description: "",
      photo: "",
    });
    expect(errors.tagline).toBeTruthy();
    expect(errors.description).toBeTruthy();
    expect(errors.photo).toBeTruthy();
  });

  /* Bingkai "Photo" kosong itu tempat penampung saat menyusun, bukan tampilan
     yang boleh sampai ke pengunjung. */
  it("nilai live tanpa foto tidak ikut publish", () => {
    expect(isValuePublishable(lengkap({ photo: "" }))).toBe(false);
  });

  it("draft tidak pernah ikut publish meski isinya lengkap", () => {
    expect(isValuePublishable(lengkap({ state: "draft" }))).toBe(false);
  });

  it("status di luar daftar ditolak", () => {
    expect(
      validateValue(lengkap({ state: "tayang" as ValueInput["state"] })).state,
    ).toBeTruthy();
  });
});

describe("validateValue — batas panjang ikut tata letak", () => {
  it("judul sepanjang kalimat ditolak", () => {
    expect(validateValue(lengkap({ title: "A".repeat(49) })).title).toBeTruthy();
    expect(validateValue(lengkap({ title: "A".repeat(48) })).title).toBeUndefined();
  });

  it("uraian sepanjang esai ditolak", () => {
    expect(
      validateValue(lengkap({ description: "a".repeat(501) })).description,
    ).toBeTruthy();
  });
});

describe("firstValueError", () => {
  /* Fokus dilompatkan ke masalah PERTAMA dari atas, bukan ke masalah yang
     kebetulan lebih dulu ditemukan pemeriksa. */
  it("mengembalikan isian teratas yang bermasalah", () => {
    const errors = validateValue(lengkap({ title: "", description: "" }));
    expect(firstValueError(errors)?.field).toBe("title");
  });

  it("null kalau sudah sah", () => {
    expect(firstValueError(validateValue(lengkap()))).toBeNull();
  });
});
