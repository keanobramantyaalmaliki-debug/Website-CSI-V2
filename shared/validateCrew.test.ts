import { describe, expect, it } from "vitest";
import { CREW_CATEGORIES, type CrewCategory } from "@shared/crew";
import {
  firstCrewError,
  isCrewPublishable,
  validateCrew,
  type CrewInput,
} from "@shared/validateCrew";

const lengkap = (over: Partial<CrewInput> = {}): CrewInput => ({
  name: "Bagas Nusantara Nabillah",
  role: "Senior Developer",
  category: "Developer",
  photo: "/people/bagas.webp",
  social: [{ platform: "linkedin", url: "https://linkedin.com/in/bagas" }],
  state: "live",
  ...over,
});

describe("validateCrew — draf longgar", () => {
  it("draf cuma butuh nama dan departemen", () => {
    const errors = validateCrew({
      ...lengkap(),
      state: "draft",
      role: "",
      photo: "",
      social: [],
    });
    expect(errors).toEqual({});
  });

  it("nama tetap wajib meski draf", () => {
    const errors = validateCrew({ ...lengkap(), state: "draft", name: "   " });
    expect(errors.name).toBeTruthy();
  });

  it("draf tidak pernah ikut tayang", () => {
    expect(isCrewPublishable({ ...lengkap(), state: "draft" })).toBe(false);
  });
});

describe("validateCrew — live ketat", () => {
  it("isi lengkap lolos", () => {
    expect(validateCrew(lengkap())).toEqual({});
    expect(isCrewPublishable(lengkap())).toBe(true);
  });

  it("jabatan wajib begitu Live", () => {
    expect(validateCrew({ ...lengkap(), role: "" }).role).toBeTruthy();
  });

  it("departemen di luar daftar ditolak", () => {
    const errors = validateCrew({
      ...lengkap(),
      category: "Marketing" as CrewCategory,
    });
    expect(errors.category).toBeTruthy();
  });

  it("semua departemen resmi diterima", () => {
    for (const category of CREW_CATEGORIES) {
      expect(validateCrew(lengkap({ category }))).toEqual({});
    }
  });

  /* Foto TIDAK wajib — empat dari tiga belas baris yang tayang hari ini
     memang tanpa foto, dan `CrewAvatar` sudah punya tampilan untuk itu. */
  it("tanpa foto tetap boleh tayang", () => {
    expect(validateCrew(lengkap({ photo: "" }))).toEqual({});
  });

  it("tanpa tautan sosial tetap boleh tayang", () => {
    expect(validateCrew(lengkap({ social: [] }))).toEqual({});
  });
});

describe("validateCrew — tautan sosial", () => {
  it('"#" diterima sebagai "belum ada tautannya"', () => {
    expect(validateCrew(lengkap({ social: [{ platform: "linkedin", url: "#" }] })))
      .toEqual({});
  });

  /* Inilah yang sebenarnya dijaga: alamat tanpa skema dibaca peramban sebagai
     halaman di situs ini, jadi tautannya mendarat di 404 cogniti.id. */
  it("alamat tanpa https:// ditolak", () => {
    const errors = validateCrew(
      lengkap({ social: [{ platform: "x", url: "x.com/cogniti" }] }),
    );
    expect(errors.social).toBeTruthy();
  });

  it("tautan kosong ditolak", () => {
    const errors = validateCrew(
      lengkap({ social: [{ platform: "github", url: "  " }] }),
    );
    expect(errors.social).toBeTruthy();
  });

  /* `TheCrew.tsx` memakai `platform` sebagai key React di dalam baris. Dua
     tautan platform sama = React memakai ulang node yang salah. */
  it("platform yang sama dua kali ditolak", () => {
    const errors = validateCrew(
      lengkap({
        social: [
          { platform: "linkedin", url: "https://linkedin.com/in/a" },
          { platform: "linkedin", url: "https://linkedin.com/in/b" },
        ],
      }),
    );
    expect(errors.social).toBeTruthy();
  });
});

describe("firstCrewError", () => {
  it("mengembalikan masalah paling atas menurut urutan form", () => {
    const errors = validateCrew({ ...lengkap(), name: "", role: "" });
    expect(firstCrewError(errors)?.field).toBe("name");
  });

  it("null kalau tidak ada masalah", () => {
    expect(firstCrewError(validateCrew(lengkap()))).toBeNull();
  });
});
