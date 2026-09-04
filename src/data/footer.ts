import { contentFooter } from "@/lib/content/store";
import {
  FALLBACK_FOOTER,
  type FooterContent,
  type FooterSocialContent,
} from "./footerFallback";

/* Bentuknya tinggal di `footerFallback.ts` bersama literalnya, dan cuma
   diteruskan dari sini: berkas ini dibaca komponen situs, sedangkan berkas itu
   juga dibaca skrip seed dari Node. Satu definisi, dua pembaca. */
export type { FooterContent, FooterSocialContent };

/**
 * Isi kaki halaman — dari CMS kalau `content.json` terbaca, kalau tidak dari
 * `footerFallback.ts` yang ikut ter-bundle.
 *
 * FUNGSI, bukan konstanta, dengan alasan yang sama seperti `vision()` dan
 * `services()`: `content.json` baru mendarat sesudah `loadContent()` di
 * `main.tsx`. Sebuah `export const FOOTER = ...` dihitung saat modulnya
 * diimpor — sebelum itu — jadi ia membekukan isi cadangan selamanya dan
 * CMS-nya tidak akan pernah kelihatan berpengaruh, tanpa satu pun error.
 * Jebakan yang sama sudah memakan lima slice sebelumnya.
 *
 * ⚠️ Konsekuensinya menular ke pemanggil: `SiteFooter.tsx` dan menu HP di
 * `Navbar.tsx` dulu membaca `SOCIALS` sebagai konstanta modul. Pemanggilannya
 * HARUS di dalam komponen (lewat `useMemo`), bukan di ruang modul.
 *
 * ‼️ SELALU mengembalikan isi, tidak pernah `null` — sama seperti `vision()`
 * dan beda dari pembaca daftar. Kaki halaman ikut setiap halaman situs; tidak
 * ada keadaan "halaman tanpa kaki halaman" yang bisa dicapai lewat data.
 *
 * Tiga isian teksnya jatuh ke cadangan PER ISIAN, bukan sekaligus, supaya
 * `content.json` yang cuma separuh terisi tidak menyeret isian yang sudah
 * benar ikut mundur.
 *
 * ‼️ Tapi `socials` TIDAK begitu: larik kosong dari CMS dihormati apa adanya.
 * Editor yang menghapus semua tautannya memang minta kaki halaman tanpa baris
 * tautan — menjatuhkannya ke cadangan akan menghidupkan lagi tautan yang baru
 * saja dihapus, dan tidak ada cara menghapusnya untuk selamanya. Yang jatuh ke
 * cadangan cuma keadaan "CMS-nya belum bicara" (`null` dari `contentFooter()`),
 * dan itu keadaan yang berbeda.
 */
export function footer(): FooterContent {
  const dariCms = contentFooter();
  if (!dariCms) return FALLBACK_FOOTER;

  const email = dariCms.email.trim();
  const address = dariCms.address.trim();
  const copyright = dariCms.copyright.trim();

  return {
    email: email || FALLBACK_FOOTER.email,
    address: address || FALLBACK_FOOTER.address,
    copyright: copyright || FALLBACK_FOOTER.copyright,
    socials: dariCms.socials,
  };
}
