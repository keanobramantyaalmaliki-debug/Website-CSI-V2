import { describe, expect, it } from "vitest";
import {
  firstWorkProjectError,
  isWorkProjectPublishable,
  validateWorkProject,
  type WorkProjectInput,
} from "@shared/validateWorkProject";

const lengkap = (over: Partial<WorkProjectInput> = {}): WorkProjectInput => ({
  title: "Citizen Service Portal",
  client: "Regional Government",
  year: "2024",
  tags: ["React", "Node.js", "PostgreSQL"],
  image: "/work/citizen-portal.webp",
  outcome: "2.3M citizens served",
  state: "live",
  ...over,
});

describe("validateWorkProject — draft longgar", () => {
  it("draft cuma butuh nama proyek", () => {
    expect(
      validateWorkProject({
        ...lengkap(),
        state: "draft",
        client: "",
        year: "",
        tags: [],
        image: "",
        outcome: "",
      }),
    ).toEqual({});
  });

  it("draft tanpa nama tetap ditolak", () => {
    expect(
      validateWorkProject({ ...lengkap(), state: "draft", title: "  " }).title,
    ).toBeTruthy();
  });

  it("draft tidak pernah ikut publish, selengkap apa pun isinya", () => {
    expect(isWorkProjectPublishable(lengkap({ state: "draft" }))).toBe(false);
  });
});

describe("validateWorkProject — live diperiksa penuh", () => {
  it("proyek lengkap lolos", () => {
    expect(validateWorkProject(lengkap())).toEqual({});
    expect(isWorkProjectPublishable(lengkap())).toBe(true);
  });

  it("isian yang boleh kosong di draft jadi wajib begitu live", () => {
    const errors = validateWorkProject({
      ...lengkap(),
      client: "",
      year: "",
      image: "",
    });
    expect(errors.client).toBeTruthy();
    expect(errors.year).toBeTruthy();
    expect(errors.image).toBeTruthy();
  });

  /* Kartu proyek TIDAK punya tampilan tanpa gambar — bukan kartu polos yang
     tayang, melainkan ikon "gambar rusak" bawaan peramban. */
  it("proyek live tanpa gambar tidak ikut publish", () => {
    expect(isWorkProjectPublishable(lengkap({ image: "" }))).toBe(false);
  });

  /* Kebalikannya, dan sama-sama disengaja: `CaseGrid` sudah menggerbangi baris
     hasil berikut garis pemisahnya, jadi kartu tanpa hasil adalah tampilan
     yang memang dirancang. */
  it("baris hasil boleh kosong", () => {
    expect(validateWorkProject(lengkap({ outcome: "" }))).toEqual({});
    expect(isWorkProjectPublishable(lengkap({ outcome: "" }))).toBe(true);
  });

  it("label boleh tidak ada sama sekali", () => {
    expect(validateWorkProject(lengkap({ tags: [] }))).toEqual({});
  });
});

describe("tahun", () => {
  it("rentang tahun diterima — pekerjaan bisa melewati pergantian tahun", () => {
    expect(validateWorkProject(lengkap({ year: "2023–2024" })).year).toBeUndefined();
  });

  it("tanpa empat angka ditolak", () => {
    expect(validateWorkProject(lengkap({ year: "tahun lalu" })).year).toBeTruthy();
    expect(validateWorkProject(lengkap({ year: "'24" })).year).toBeTruthy();
  });
});

describe("label", () => {
  /* Yang dijaga bukan kerapian: `CaseGrid.tsx` dan `CaseGridMobileStack.tsx`
     sama-sama memakai teks label sebagai key React. */
  it("label kembar ditolak, tanpa membedakan huruf besar-kecil", () => {
    expect(validateWorkProject(lengkap({ tags: ["React", "react"] })).tags)
      .toBeTruthy();
  });

  it("label kosong ditolak — barisnya harus diisi atau dihapus", () => {
    expect(validateWorkProject(lengkap({ tags: ["React", "  "] })).tags)
      .toBeTruthy();
  });

  it("terlalu banyak label ditolak", () => {
    const tujuh = ["a", "b", "c", "d", "e", "f", "g"];
    expect(validateWorkProject(lengkap({ tags: tujuh })).tags).toBeTruthy();
  });
});

describe("firstWorkProjectError", () => {
  it("menyebut masalah paling atas dulu, bukan yang pertama ditemukan mesin", () => {
    const errors = validateWorkProject(
      lengkap({ title: "", client: "", image: "" }),
    );
    expect(firstWorkProjectError(errors)?.field).toBe("title");
  });

  it("null saat semuanya sudah benar", () => {
    expect(firstWorkProjectError(validateWorkProject(lengkap()))).toBeNull();
  });
});
