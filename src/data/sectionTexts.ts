import { contentSectionTexts } from "@/lib/content/store";
import {
  sectionHeadingLines,
  sectionSubheadingParagraphs,
  type SectionTextKey,
} from "@shared/sectionText";
import {
  FALLBACK_SECTION_TEXTS,
  type SectionTextContent,
} from "./sectionTextsFallback";

/* Bentuknya tinggal di `sectionTextsFallback.ts` bersama literalnya, dan cuma
   diteruskan dari sini: berkas ini dibaca komponen situs, sedangkan berkas itu
   juga dibaca skrip seed dari Node. Satu definisi, dua pembaca. */
export type { SectionTextContent };

/**
 * Jaring pengaman TIPE, bukan nilai baru.
 *
 * `sectionTextsFallback.ts` sengaja tanpa impor (dibaca juga oleh seed Node),
 * jadi kuncinya di sana cuma string biasa. Baris ini yang mempertemukannya
 * dengan `SectionTextKey`: kunci yang salah ketik atau seksi yang lupa diisi
 * cadangannya jadi galat kompilasi di sini, bukan judul yang diam-diam hilang
 * di situs.
 */
const CADANGAN: Record<SectionTextKey, SectionTextContent> = FALLBACK_SECTION_TEXTS;

/**
 * Judul & subteks satu seksi — dari CMS kalau `content.json` terbaca, kalau
 * tidak dari `sectionTextsFallback.ts` yang ikut ter-bundle.
 *
 * FUNGSI, bukan konstanta, dengan alasan yang sama seperti `services()` dan
 * `vision()`: `content.json` baru mendarat sesudah `loadContent()` di
 * `main.tsx`. Sebuah `export const HEADINGS = ...` dihitung saat modulnya
 * diimpor — sebelum itu — jadi ia membekukan isi cadangan selamanya dan
 * CMS-nya tidak akan pernah kelihatan berpengaruh, tanpa satu pun error.
 * Jebakan yang sama sudah memakan beberapa slice sebelumnya.
 *
 * ⚠️ Konsekuensinya menular ke pemanggil: `CsiHero.tsx` dulu memegang
 * judulnya sebagai konstanta modul (`const HEADING_LINES = [...]`).
 * Pemanggilannya HARUS di dalam komponen (lewat `useMemo`), bukan di ruang
 * modul.
 *
 * ‼️ SELALU mengembalikan isi, tidak pernah `null`, dan cadangannya PER-ISIAN.
 *
 * Sebelas seksi ini tetap tayang apa pun isi `content.json`-nya, jadi judul
 * yang hilang bukan seksi yang hilang melainkan seksi berkepala kosong.
 * Judul kosong dari CMS diperlakukan sebagai judul yang BELUM ADA dan jatuh ke
 * cadangan; subteks kosong TIDAK — untuk seksi tanpa subteks ia memang selalu
 * kosong, dan validator sudah menolak subteks yang diisi di sana. Yang tersisa
 * cuma satu jalan menuju subteks kosong pada seksi bersubteks: editor
 * mengosongkannya dengan sengaja, dan itu dihormati (komponennya menggerbangi
 * paragrafnya, bukan merender `<p>` kosong).
 */
export function sectionText(key: SectionTextKey): SectionTextContent {
  const cadangan = CADANGAN[key];
  const dariCms = contentSectionTexts()?.find((row) => row.key === key);
  if (!dariCms) return cadangan;

  const heading = dariCms.heading.trim();
  return {
    heading: heading || cadangan.heading,
    subheading: dariCms.subheading,
  };
}

/**
 * Judulnya sudah dipecah jadi baris siap render.
 *
 * Ada di sini, bukan di tiap komponen, supaya sebelas seksi memecah dengan
 * aturan yang sama: `\r\n` dari tempel-salin ikut dinormalkan dan baris kosong
 * dibuang, jadi `\n\n` yang tak disengaja tidak melahirkan `LineMask` kosong
 * setinggi satu baris.
 */
export function sectionHeading(key: SectionTextKey): string[] {
  return sectionHeadingLines(sectionText(key).heading);
}

/** Subteksnya sudah dipecah jadi paragraf. Larik kosong = tidak ada subteks. */
export function sectionSubheading(key: SectionTextKey): string[] {
  return sectionSubheadingParagraphs(sectionText(key).subheading);
}
