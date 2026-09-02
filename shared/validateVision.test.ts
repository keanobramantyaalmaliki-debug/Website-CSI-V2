import { describe, expect, it } from "vitest";
import {
  firstVisionError,
  validateVision,
  VISION_FIELD_ORDER,
  type VisionInput,
} from "@shared/validateVision";

const lengkap = (over: Partial<VisionInput> = {}): VisionInput => ({
  statement:
    "To become a trusted technology partner that empowers organizations through intelligent digital innovation, creating sustainable value for businesses and communities worldwide.",
  photo: "/home/P1330392_velocity.webp",
  ...over,
});

describe("validateVision — selalu diperiksa penuh", () => {
  it("visi lengkap lolos", () => {
    expect(validateVision(lengkap())).toEqual({});
  });

  /* Entitas lain punya draft sebagai tempat menyimpan pekerjaan setengah
     jalan. Visi tidak punya status sama sekali (lihat shared/vision.ts), jadi
     tidak ada jalan pintas yang membuat isian wajib jadi opsional — dan
     test ini yang menahannya kalau suatu hari `state` diselipkan kembali. */
  it("tidak ada jalan longgar: kedua isian wajib, apa pun tambahannya", () => {
    const errors = validateVision({
      ...lengkap({ statement: "  ", photo: "" }),
      /* Pura-pura ada yang mengirim status seperti entitas lain. Ia tidak
         boleh melonggarkan apa pun. */
      state: "draft",
    } as VisionInput);

    expect(errors.statement).toBeTruthy();
    expect(errors.photo).toBeTruthy();
  });
});

describe("validateVision — kalimat visi", () => {
  it("kosong ditolak", () => {
    expect(validateVision(lengkap({ statement: "   " })).statement).toBeTruthy();
  });

  /* Batasnya dari tata letak, bukan dari kolom database: kalimat ini dirender
     text-5xl tebal, dan yang kepanjangan mendorong foto 90vh keluar viewport. */
  it("400 karakter masih boleh, 401 ditolak", () => {
    expect(validateVision(lengkap({ statement: "x".repeat(400) })).statement)
      .toBeUndefined();
    expect(validateVision(lengkap({ statement: "x".repeat(401) })).statement)
      .toBeTruthy();
  });

  it("kalimat yang tayang sekarang jauh di bawah batas", () => {
    expect(lengkap().statement.length).toBeLessThan(400);
  });
});

describe("validateVision — foto", () => {
  /* Sama seperti nilai: seksinya memang punya keadaan tanpa foto, tapi itu
     jaring pengaman untuk content.json dari versi server lain — bukan
     tampilan yang boleh dipilih editor. */
  it("foto kosong ditolak", () => {
    expect(validateVision(lengkap({ photo: "" })).photo).toBeTruthy();
    expect(validateVision(lengkap({ photo: "   " })).photo).toBeTruthy();
  });
});

describe("firstVisionError", () => {
  it("null kalau tidak ada masalah", () => {
    expect(firstVisionError(validateVision(lengkap()))).toBeNull();
  });

  /* Yang dilaporkan ke editor harus masalah PALING ATAS di form, bukan yang
     kebetulan pertama ditemukan pemeriksa. */
  it("melaporkan masalah paling atas lebih dulu", () => {
    const errors = validateVision(lengkap({ statement: "", photo: "" }));
    expect(firstVisionError(errors)?.field).toBe("statement");
  });

  it("urutannya sama dengan urutan isian di form", () => {
    expect(VISION_FIELD_ORDER).toEqual(["statement", "photo"]);
  });
});
