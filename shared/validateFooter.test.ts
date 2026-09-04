import { describe, expect, it } from "vitest";
import {
  firstFooterError,
  validateFooter,
  FOOTER_FIELD_ORDER,
  type FooterInput,
} from "@shared/validateFooter";

const lengkap = (over: Partial<FooterInput> = {}): FooterInput => ({
  email: "hello@cogniti.id",
  address: "Jl. Kediri No.27, Tuban, Badung, Bali 80361",
  copyright: "Cognitiva Solusi Indonesia. All rights reserved.",
  socials: [
    { label: "Instagram", href: "https://www.instagram.com/cogniti.id/" },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/cogniti/" },
  ],
  ...over,
});

describe("validateFooter — selalu diperiksa penuh", () => {
  it("kaki halaman lengkap lolos", () => {
    expect(validateFooter(lengkap())).toEqual({});
  });

  /* Alasan sama seperti visi: kaki halaman tidak punya draft, jadi tidak ada
     jalan pintas yang membuat isian wajib jadi opsional. Test ini yang
     menahannya kalau suatu hari `state` diselipkan kembali. */
  it("tidak ada jalan longgar: status yang diselipkan tidak melonggarkan apa pun", () => {
    const errors = validateFooter({
      ...lengkap({ email: "  ", address: "", copyright: " " }),
      state: "draft",
    } as FooterInput);

    expect(errors.email).toBeTruthy();
    expect(errors.address).toBeTruthy();
    expect(errors.copyright).toBeTruthy();
  });
});

describe("validateFooter — surel", () => {
  it("kosong ditolak", () => {
    expect(validateFooter(lengkap({ email: "   " })).email).toBeTruthy();
  });

  /* Dua salah ketik yang benar-benar terjadi, dan keduanya menghasilkan
     `href="mailto:…"` yang membuka aplikasi surel dengan alamat kacau alih-alih
     galat apa pun. */
  it("menolak mailto: yang ikut tertempel", () => {
    expect(
      validateFooter(lengkap({ email: "mailto:hello@cogniti.id" })).email,
    ).toBeTruthy();
  });

  it("menolak alamat tanpa domain", () => {
    expect(validateFooter(lengkap({ email: "hello" })).email).toBeTruthy();
    expect(validateFooter(lengkap({ email: "hello@cogniti" })).email).toBeTruthy();
  });

  it("kepanjangan ditolak", () => {
    const panjang = `${"a".repeat(130)}@cogniti.id`;
    expect(validateFooter(lengkap({ email: panjang })).email).toBeTruthy();
  });
});

describe("validateFooter — alamat", () => {
  it("kosong ditolak", () => {
    expect(validateFooter(lengkap({ address: "  " })).address).toBeTruthy();
  });

  it("kepanjangan ditolak — kaki halaman cuma punya satu baris", () => {
    expect(
      validateFooter(lengkap({ address: "J".repeat(200) })).address,
    ).toBeTruthy();
  });
});

/**
 * Baris hak cipta, dan inilah bagian yang paling mudah salah diisi.
 *
 * Situs mencetak `© {tahun berjalan} {baris ini}` sendiri. Editor yang
 * menyalin apa yang dilihatnya di situs — "© 2026 Cognitiva Solusi Indonesia"
 * — akan menghasilkan "© 2026 © 2026 Cognitiva…", dan tahun yang diketik itu
 * basi tanggal 1 Januari tanpa ada yang menyadarinya.
 */
describe("validateFooter — baris hak cipta", () => {
  it("kosong ditolak", () => {
    expect(validateFooter(lengkap({ copyright: " " })).copyright).toBeTruthy();
  });

  it("menolak tahun yang ikut diketik", () => {
    expect(
      validateFooter(lengkap({ copyright: "2026 Cognitiva Solusi Indonesia." }))
        .copyright,
    ).toBeTruthy();
    expect(
      validateFooter(lengkap({ copyright: "Cognitiva Solusi Indonesia 2026." }))
        .copyright,
    ).toBeTruthy();
  });

  it("menolak lambang © yang ikut diketik", () => {
    expect(
      validateFooter(lengkap({ copyright: "© Cognitiva Solusi Indonesia." }))
        .copyright,
    ).toBeTruthy();
  });

  /* Angka yang BUKAN tahun tidak boleh ikut tertangkap — "PT Cognitiva" yang
     menyebut nomor apa pun tetap harus bisa disimpan. */
  it("angka yang bukan tahun tetap lolos", () => {
    expect(
      validateFooter(lengkap({ copyright: "Cognitiva Solusi Indonesia. Izin No.27/XI." }))
        .copyright,
    ).toBeUndefined();
  });
});

describe("validateFooter — tautan sosial", () => {
  /* Ini yang membedakan daftar tautan dari isian lain di berkas ini: kosong
     SAH. Perusahaan yang sedang tidak memajang kanal sosial mana pun bukan
     keadaan yang berhak ditolak — kaki halamannya tetap utuh tanpa baris itu. */
  it("daftar kosong sah", () => {
    expect(validateFooter(lengkap({ socials: [] }))).toEqual({});
  });

  it("baris tanpa tulisan ditolak, disebut lewat nomornya", () => {
    const errors = validateFooter(
      lengkap({
        socials: [
          { label: "Instagram", href: "https://instagram.com/cogniti.id" },
          { label: "  ", href: "https://linkedin.com/company/cogniti" },
        ],
      }),
    );
    expect(errors.socials).toContain("ke-2");
  });

  it("baris tanpa alamat ditolak", () => {
    expect(
      validateFooter(lengkap({ socials: [{ label: "Instagram", href: "" }] }))
        .socials,
    ).toBeTruthy();
  });

  /**
   * Alamat tanpa skema adalah kegagalan diam-diam yang paling mahal di sini:
   * `href="instagram.com/cogniti"` dibaca peramban sebagai halaman DI SITUS
   * INI, jadi pengunjung mendarat di 404 cogniti.id tanpa satu pun galat.
   */
  it("alamat tanpa https:// ditolak", () => {
    expect(
      validateFooter(
        lengkap({ socials: [{ label: "Instagram", href: "instagram.com/cogniti" }] }),
      ).socials,
    ).toBeTruthy();
    expect(
      validateFooter(
        lengkap({ socials: [{ label: "Instagram", href: "/cogniti" }] }),
      ).socials,
    ).toBeTruthy();
  });

  it("http:// masih diterima — tautan lama tidak dipaksa gagal", () => {
    expect(
      validateFooter(
        lengkap({ socials: [{ label: "Blog", href: "http://blog.cogniti.id" }] }),
      ).socials,
    ).toBeUndefined();
  });

  it("tulisan kepanjangan ditolak", () => {
    expect(
      validateFooter(
        lengkap({
          socials: [{ label: "I".repeat(60), href: "https://instagram.com/x" }],
        }),
      ).socials,
    ).toBeTruthy();
  });
});

describe("firstFooterError", () => {
  it("null saat semuanya sah", () => {
    expect(firstFooterError(validateFooter(lengkap()))).toBeNull();
  });

  /* Urutannya urutan isian dibaca dari atas ke bawah, bukan urutan pemeriksaan
     di dalam validator — itu yang membuat panel bisa melompat ke isian
     bermasalah PERTAMA yang dilihat editor, bukan yang kebetulan diperiksa
     duluan. */
  it("memilih menurut urutan form, bukan urutan pemeriksaan", () => {
    const errors = validateFooter(
      lengkap({ email: "", copyright: "", socials: [{ label: "", href: "" }] }),
    );
    expect(firstFooterError(errors)?.field).toBe("email");
    expect(FOOTER_FIELD_ORDER.indexOf("email")).toBe(0);
  });
});
