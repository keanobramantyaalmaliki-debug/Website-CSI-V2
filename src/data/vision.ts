import { contentVision } from "@/lib/content/store";
import { FALLBACK_VISION, type VisionContent } from "./visionFallback";

/* Bentuknya tinggal di `visionFallback.ts` bersama literalnya, dan cuma
   diteruskan dari sini: berkas ini dibaca komponen situs, sedangkan berkas itu
   juga dibaca skrip seed dari Node. Satu definisi, dua pembaca. */
export type { VisionContent };

/**
 * Isi seksi Visi — dari CMS kalau `content.json` terbaca, kalau tidak dari
 * `visionFallback.ts` yang ikut ter-bundle.
 *
 * FUNGSI, bukan konstanta, dengan alasan yang sama seperti `services()` dan
 * `peopleValues()`: `content.json` baru mendarat sesudah `loadContent()` di
 * `main.tsx`. Sebuah `export const VISION = ...` dihitung saat modulnya
 * diimpor — sebelum itu — jadi ia membekukan isi cadangan selamanya dan
 * CMS-nya tidak akan pernah kelihatan berpengaruh, tanpa satu pun error.
 * Jebakan yang sama sudah memakan empat slice sebelumnya.
 *
 * ⚠️ Konsekuensinya menular ke pemanggil: `Vision.tsx` dulu memegang
 * kalimatnya sebagai konstanta modul (`const HEADTEXT = "..."`).
 * Pemanggilannya HARUS di dalam komponen (lewat `useMemo`), bukan di ruang
 * modul.
 *
 * ‼️ SELALU mengembalikan isi, tidak pernah `null` — beda dari pembaca daftar.
 *
 * Di nilai atau layanan, daftar kosong dari CMS dihormati apa adanya dan
 * seksinya menghilang. Di sini tidak ada jalan seperti itu: seksi Visi
 * memegang satu-satunya celah 80px antara plank Industries dan Contact di
 * mobile, jadi "tidak dirender" bukan keadaan yang boleh dicapai lewat data.
 * Isian yang kosong dari CMS diperlakukan sebagai isian yang BELUM ADA, dan
 * jatuh ke cadangan per-isian: kalimat kosong memakai kalimat cadangan, foto
 * kosong memakai foto cadangan. Keduanya dijaga terpisah supaya
 * `content.json` yang cuma separuh terisi tidak menyeret isian yang sudah
 * benar ikut mundur.
 */
export function vision(): VisionContent {
  const dariCms = contentVision();
  if (!dariCms) return FALLBACK_VISION;

  const statement = dariCms.statement.trim();
  const photo = dariCms.photo.trim();

  return {
    statement: statement || FALLBACK_VISION.statement,
    photo: photo || FALLBACK_VISION.photo,
  };
}
