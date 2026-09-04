import { contentProcessSteps } from "@/lib/content/store";
import {
  FALLBACK_PROCESS_STEPS,
  type ProcessGlyphKey,
  type ProcessStepContent,
} from "./processStepsFallback";

/* Bentuknya tinggal di `processStepsFallback.ts` bersama literalnya, dan cuma
   diteruskan dari sini: berkas ini dibaca komponen situs, sedangkan berkas itu
   juga dibaca skrip seed dari Node. Satu definisi, dua pembaca. */
export type { ProcessStepContent, ProcessGlyphKey };

/**
 * Langkah seksi "How We Work" — dari CMS kalau `content.json` terbaca, kalau
 * tidak dari `processStepsFallback.ts` yang ikut ter-bundle.
 *
 * FUNGSI, bukan konstanta, dan itu bukan selera: `content.json` baru mendarat
 * sesudah `loadContent()` di `main.tsx`. Sebuah `export const STEPS = ...`
 * dihitung saat modulnya diimpor — sebelum itu — jadi ia akan membekukan isi
 * cadangan selamanya dan CMS-nya tidak akan pernah kelihatan berpengaruh,
 * tanpa satu pun error. Jebakan yang sama sudah memakan slice-slice sebelumnya.
 *
 * ⚠️ Konsekuensinya menular ke pemanggil: `Process.tsx` dulu memegang daftar
 * ini sebagai konstanta modul (`const STEPS = [...]` di kepala berkas).
 * Pemanggilannya HARUS di dalam komponen (lewat `useMemo`), bukan di ruang
 * modul.
 *
 * Nomor "01"–"06" TIDAK ada di sini dan tidak pernah disimpan di database —
 * yang merender menurunkannya dari posisi baris. Lihat `shared/processStep.ts`.
 */
export function processSteps(): ProcessStepContent[] {
  const dariCms = contentProcessSteps();
  if (!dariCms) return FALLBACK_PROCESS_STEPS;

  /* Daftar KOSONG dari CMS dihormati apa adanya — lihat alasan lengkapnya di
     `peopleValues()` di `src/data/people.ts`. Yang menangani keadaan kosong itu
     `Process.tsx` sendiri: seluruh seksi berikut tali SVG dan landasan ekornya
     tidak dirender sama sekali. */

  return dariCms.map((s) => ({
    title: s.title,
    kicker: s.kicker,
    desc: s.desc,
    glyph: s.glyph,
  }));
}
