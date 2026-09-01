import { describe, expect, it } from "vitest";
import {
  descParagraphs,
  firstCaseStudyError,
  isCaseStudyPublishable,
  normalizeDesc,
  validateCaseStudy,
  type CaseStudyInput,
} from "@shared/validateCaseStudy";

const lengkap = (over: Partial<CaseStudyInput> = {}): CaseStudyInput => ({
  title: "Citizen Service Portal",
  client: "Regional Government",
  year: "2024",
  industry: "Public Sector",
  scope: ["Web Platform", "SIPD Integration", "Staff Training"],
  outcome: "67% faster turnaround",
  quote: "Ribuan permohonan sebulan, semuanya masih diproses manual di loket.",
  desc: "Paragraf pertama menceritakan masalahnya.\n\nParagraf kedua menceritakan apa yang dikerjakan dan hasilnya.",
  image: "/work/citizen-portal.webp",
  state: "live",
  ...over,
});

describe("validateCaseStudy — draft longgar", () => {
  it("draft cuma butuh judul", () => {
    expect(
      validateCaseStudy({
        ...lengkap(),
        state: "draft",
        client: "",
        year: "",
        industry: "",
        scope: [],
        outcome: "",
        quote: "",
        desc: "",
        image: "",
      }),
    ).toEqual({});
  });

  it("draft tanpa judul tetap ditolak", () => {
    expect(
      validateCaseStudy({ ...lengkap(), state: "draft", title: "  " }).title,
    ).toBeTruthy();
  });

  it("draft tidak pernah ikut publish, selengkap apa pun isinya", () => {
    expect(isCaseStudyPublishable(lengkap({ state: "draft" }))).toBe(false);
  });
});

describe("validateCaseStudy — live diperiksa penuh", () => {
  it("cerita lengkap lolos", () => {
    expect(validateCaseStudy(lengkap())).toEqual({});
    expect(isCaseStudyPublishable(lengkap())).toBe(true);
  });

  it("isian yang boleh kosong di draft jadi wajib begitu live", () => {
    const errors = validateCaseStudy({
      ...lengkap(),
      client: "",
      year: "",
      industry: "",
      quote: "",
      desc: "",
      image: "",
    });
    expect(errors.client).toBeTruthy();
    expect(errors.year).toBeTruthy();
    expect(errors.industry).toBeTruthy();
    expect(errors.quote).toBeTruthy();
    expect(errors.desc).toBeTruthy();
    expect(errors.image).toBeTruthy();
  });

  /**
   * Perbedaan yang disengaja dengan "Selected work": di sana baris hasil boleh
   * kosong karena kartunya menggerbangi barisnya. Di sini `outcome` dicetak
   * apa adanya di antara judul dan tombol "Read the full story", jadi cerita
   * tanpa hasil tayang sebagai ruang kosong bercetak tebal.
   */
  it("hasil WAJIB, tidak seperti di kartu proyek", () => {
    expect(validateCaseStudy(lengkap({ outcome: "" })).outcome).toBeTruthy();
    expect(isCaseStudyPublishable(lengkap({ outcome: "" }))).toBe(false);
  });

  /* Judul "Scope" ikut dicetak walau daftarnya kosong, jadi minimal satu. */
  it("lingkup pekerjaan minimal satu untuk cerita yang tayang", () => {
    expect(validateCaseStudy(lengkap({ scope: [] })).scope).toBeTruthy();
  });

  it("cerita live tanpa gambar tidak ikut publish — gambarnya tombol pembuka", () => {
    expect(isCaseStudyPublishable(lengkap({ image: "" }))).toBe(false);
  });
});

describe("tahun", () => {
  it("rentang tahun diterima — pekerjaan bisa melewati pergantian tahun", () => {
    expect(validateCaseStudy(lengkap({ year: "2023–2024" })).year).toBeUndefined();
  });

  it("tanpa empat angka ditolak", () => {
    expect(validateCaseStudy(lengkap({ year: "tahun lalu" })).year).toBeTruthy();
  });
});

describe("lingkup pekerjaan", () => {
  /* Yang dijaga bukan kerapian: teks labelnya dipakai sebagai key React. */
  it("label kembar ditolak, tanpa membedakan huruf besar-kecil", () => {
    expect(
      validateCaseStudy(lengkap({ scope: ["Web Platform", "web platform"] }))
        .scope,
    ).toBeTruthy();
  });

  it("label kosong ditolak — barisnya harus diisi atau dihapus", () => {
    expect(
      validateCaseStudy(lengkap({ scope: ["Web Platform", "  "] })).scope,
    ).toBeTruthy();
  });

  it("terlalu banyak label ditolak", () => {
    expect(
      validateCaseStudy(lengkap({ scope: ["a", "b", "c", "d", "e", "f", "g"] }))
        .scope,
    ).toBeTruthy();
  });
});

/**
 * Paragraf adalah satu-satunya bentuk di seluruh CMS ini yang dibawa oleh
 * SPASI PUTIH, bukan oleh struktur data. `CaseStudySpotlight.tsx` memisahkan
 * `desc` dengan `split("\n\n")` apa adanya, jadi yang dirapikan di sini
 * menentukan persis apa yang tayang.
 */
describe("normalizeDesc & descParagraphs", () => {
  it("baris ala Windows tidak menghasilkan paragraf berbeda", () => {
    expect(normalizeDesc("Satu.\r\n\r\nDua.")).toBe("Satu.\n\nDua.");
    expect(descParagraphs("Satu.\r\n\r\nDua.")).toHaveLength(2);
  });

  it("Enter yang ditekan berkali-kali tetap jadi satu jeda", () => {
    expect(normalizeDesc("Satu.\n\n\n\n\nDua.")).toBe("Satu.\n\nDua.");
    expect(descParagraphs("Satu.\n\n\n\n\nDua.")).toHaveLength(2);
  });

  it("satu Enter BUKAN paragraf baru — inilah yang bikin editor terkecoh", () => {
    expect(descParagraphs("Satu.\nDua.")).toHaveLength(1);
  });

  it("spasi di ujung baris tidak menyisakan paragraf hantu", () => {
    expect(descParagraphs("Satu.   \n\nDua.\n\n   ")).toEqual([
      "Satu.",
      "Dua.",
    ]);
  });

  it("terlalu banyak paragraf ditolak", () => {
    const sembilan = Array.from({ length: 9 }, (_, i) => `Paragraf ${i}.`).join(
      "\n\n",
    );
    expect(validateCaseStudy(lengkap({ desc: sembilan })).desc).toBeTruthy();
  });

  it("satu paragraf saja tetap sah", () => {
    expect(
      validateCaseStudy(lengkap({ desc: "Cukup satu paragraf saja." })).desc,
    ).toBeUndefined();
  });
});

describe("firstCaseStudyError", () => {
  it("menyebut masalah paling atas dulu, bukan yang pertama ditemukan mesin", () => {
    const errors = validateCaseStudy(
      lengkap({ title: "", client: "", image: "" }),
    );
    expect(firstCaseStudyError(errors)?.field).toBe("title");
  });

  it("null saat semuanya sudah benar", () => {
    expect(firstCaseStudyError(validateCaseStudy(lengkap()))).toBeNull();
  });
});
