import { describe, expect, it } from "vitest";
import { slugify, type Job } from "@shared/job";
import {
  firstJobError,
  isPublishable,
  validateJob,
  type JobInput,
} from "@shared/validateJob";

const copy = () => ({
  intro: "Join PT Cognitiva Solusi Indonesia and build things people use.",
  responsibilities: ["Bangun fitur", "Rawat yang sudah jalan"],
  qualifications: ["Terbiasa TypeScript", "Suka detail"],
});

const lengkap = (over: Partial<JobInput> = {}): JobInput => ({
  slug: "full-stack-engineer",
  title: "Full Stack Engineer",
  department: "Engineering",
  state: "open",
  overview: "Bangun dan rawat produk cogniti dari ujung ke ujung.",
  photo: "/careers/fullstack-engineer.jpg",
  skills: ["TypeScript", "React"],
  askGithub: true,
  detail: { en: copy(), id: copy() } as Job["detail"],
  ...over,
});

describe("validateJob — draft longgar", () => {
  it("draft cuma butuh judul dan alamat halaman", () => {
    const errors = validateJob({
      ...lengkap(),
      state: "draft",
      department: "",
      overview: "",
      photo: "",
      skills: [],
      detail: null,
    });
    expect(errors).toEqual({});
  });

  it("draft tanpa judul tetap ditolak", () => {
    const errors = validateJob({ ...lengkap(), state: "draft", title: "  " });
    expect(errors.title).toBeTruthy();
  });
});

describe("validateJob — tayang diperiksa penuh", () => {
  it("lowongan lengkap lolos", () => {
    expect(validateJob(lengkap())).toEqual({});
    expect(isPublishable(lengkap())).toBe(true);
  });

  it("isian yang dibiarkan kosong di draft jadi wajib begitu tayang", () => {
    const errors = validateJob({
      ...lengkap(),
      department: "",
      overview: "",
      photo: "",
      skills: [],
    });
    expect(Object.keys(errors).sort()).toEqual([
      "department",
      "overview",
      "photo",
      "skills",
    ]);
  });

  it("keahlian kembar ditolak tanpa peduli besar-kecil huruf", () => {
    const errors = validateJob(lengkap({ skills: ["React", "react"] }));
    expect(errors.skills).toMatch(/dua kali/i);
  });

  it("alamat halaman dengan spasi atau huruf besar ditolak", () => {
    expect(validateJob(lengkap({ slug: "Full Stack" })).slug).toBeTruthy();
    expect(validateJob(lengkap({ slug: "full--stack" })).slug).toBeTruthy();
  });
});

describe("validateJob — dua bahasa", () => {
  it("lowongan tanpa halaman sendiri sah (accordion)", () => {
    expect(validateJob(lengkap({ detail: null }))).toEqual({});
  });

  it("satu bahasa kosong ditolak — toggle EN/ID tidak boleh mendarat di halaman kosong", () => {
    const detail = { en: copy(), id: { ...copy(), intro: "" } } as Job["detail"];
    const errors = validateJob(lengkap({ detail }));
    expect(errors.detail_id).toMatch(/bahasa Indonesia/);
    expect(errors.detail_en).toBeUndefined();
  });

  it("daftar poin kosong ditolak", () => {
    const detail = {
      en: { ...copy(), responsibilities: ["", "   "] },
      id: copy(),
    } as Job["detail"];
    expect(validateJob(lengkap({ detail })).detail_en).toMatch(/kosong/i);
  });
});

describe("firstJobError", () => {
  it("memilih masalah paling atas menurut urutan baca form", () => {
    const errors = validateJob(lengkap({ title: "", overview: "" }));
    expect(firstJobError(errors)?.field).toBe("title");
  });

  it("null kalau tidak ada masalah", () => {
    expect(firstJobError({})).toBeNull();
  });
});

describe("slugify", () => {
  it("membuat alamat halaman dari judul", () => {
    expect(slugify("Full Stack Engineer")).toBe("full-stack-engineer");
    expect(slugify("R & D  Officer")).toBe("r-d-officer");
    expect(slugify("Señor Developer")).toBe("senor-developer");
    expect(slugify("  --Trailing-- ")).toBe("trailing");
  });
});
