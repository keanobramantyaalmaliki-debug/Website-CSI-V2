/**
 * Pemeriksa Judul seksi — dipakai server saat menyimpan DAN admin saat
 * mengisi form, dengan alasan yang sama seperti `validateVision.ts`: aturan
 * yang ditulis dua kali akan berbeda suatu hari, dan yang menemukannya
 * pengunjung.
 *
 * Pesannya berbahasa Indonesia dan tanpa istilah teknis. Yang membacanya
 * editor non-teknis.
 */
import {
  SECTION_TEXT_META,
  sectionHeadingLines,
  sectionSubheadingParagraphs,
  type SectionTextKey,
} from "./sectionText";

/** Urutan pemberitahuan = urutan isian dibaca dari atas ke bawah di form. */
export const SECTION_TEXT_FIELD_ORDER = ["heading", "subheading"] as const;

export type SectionTextField = (typeof SECTION_TEXT_FIELD_ORDER)[number];

export type SectionTextFieldErrors = Partial<Record<SectionTextField, string>>;

/**
 * Yang dikirim form ke pemeriksa. Tanpa `key`: kuncinya ada di URL
 * (`PUT /api/section-text/:key`), bukan di badan permintaan, jadi editor tidak
 * bisa memindahkan judul satu seksi ke seksi lain lewat body yang dikarang.
 */
export type SectionTextInput = {
  heading: string;
  subheading: string;
};

/**
 * Merapikan sebelum diperiksa DAN sebelum disimpan.
 *
 * Yang dinormalkan bukan selera: `\r\n` dari tempel-salin Windows akan
 * menghasilkan baris yang terlihat sama tapi terhitung beda saat dipecah,
 * dan spasi di ujung baris membuat `LineMask` menyisakan celah yang tak
 * terjelaskan. Bentuk kanoniknya `\n` untuk baris judul dan `\n\n` untuk
 * paragraf subteks.
 */
export function normalizeSectionText(input: SectionTextInput): SectionTextInput {
  return {
    heading: sectionHeadingLines(input.heading).join("\n"),
    subheading: sectionSubheadingParagraphs(input.subheading).join("\n\n"),
  };
}

/**
 * Memeriksa satu judul seksi.
 *
 * ‼️ Ketatnya tidak ikut status, karena entitas ini tidak punya status (lihat
 * `shared/sectionText.ts`). Sama seperti Visi: tidak ada tempat menyimpan
 * pekerjaan setengah jadi, jadi pemeriksaannya selalu penuh. Yang membuatnya
 * tidak menyakitkan, barisnya SELALU sudah terisi sejak seed.
 */
export function validateSectionText(
  key: SectionTextKey,
  raw: SectionTextInput,
): SectionTextFieldErrors {
  const meta = SECTION_TEXT_META[key];
  const input = normalizeSectionText(raw);
  const errors: SectionTextFieldErrors = {};

  const baris = sectionHeadingLines(input.heading);
  if (baris.length === 0) {
    errors.heading = "Judul seksinya belum diisi.";
  } else if (baris.length > meta.maksBaris) {
    errors.heading =
      meta.maksBaris === 1
        ? `Judul seksi ini hanya boleh satu baris. ${meta.catatan}`
        : `Judul seksi ini paling banyak ${meta.maksBaris} baris, sekarang ada ${baris.length}.`;
  } else if (input.heading.length > meta.maksJudul) {
    errors.heading = `Judulnya kepanjangan (maksimal ${meta.maksJudul} karakter, sekarang ${input.heading.length}). Judul ini dirender besar, dan yang panjang meluber keluar layar di HP.`;
  }

  /**
   * Penolakan bersuara, bukan pembuangan diam-diam.
   *
   * Isian subteks memang tidak dirender di form seksi tanpa sub, jadi jalur
   * ini cuma tersentuh lewat permintaan yang dikarang atau versi panel yang
   * tertinggal. Tetap ditegakkan: menyimpan teks yang tak pernah tampil
   * adalah cara paling halus membuat editor mengira situsnya rusak.
   */
  if (!meta.adaSub) {
    if (input.subheading.length > 0)
      errors.subheading = "Seksi ini tidak menampilkan subteks, jadi isiannya tidak bisa disimpan.";
    return errors;
  }

  const paragraf = sectionSubheadingParagraphs(input.subheading);
  if (paragraf.length > meta.maksParagraf) {
    errors.subheading =
      meta.maksParagraf === 1
        ? "Subteks seksi ini hanya satu paragraf, hapus baris kosong di tengahnya."
        : `Subteks seksi ini paling banyak ${meta.maksParagraf} paragraf, sekarang ada ${paragraf.length}.`;
  } else if (input.subheading.length > meta.maksSub) {
    errors.subheading = `Subteksnya kepanjangan (maksimal ${meta.maksSub} karakter, sekarang ${input.subheading.length}).`;
  }

  return errors;
}

/** Masalah PERTAMA menurut urutan baca form, atau null kalau sudah sah. */
export function firstSectionTextError(
  errors: SectionTextFieldErrors,
): { field: SectionTextField; message: string } | null {
  for (const field of SECTION_TEXT_FIELD_ORDER) {
    const message = errors[field];
    if (message) return { field, message };
  }
  return null;
}
