import { contentCaseStudies } from "@/lib/content/store";
import {
  FALLBACK_CASE_STUDIES,
  type CaseStudyContent,
} from "./caseStudiesFallback";

/* Bentuknya tinggal di `caseStudiesFallback.ts` bersama literalnya, dan cuma
   diteruskan dari sini: berkas ini dibaca komponen situs, sedangkan berkas itu
   juga dibaca skrip seed dari Node. Satu definisi, dua pembaca. */
export type { CaseStudyContent };

/**
 * Cerita "Case Studies" — dari CMS kalau `content.json` terbaca, kalau tidak
 * dari `caseStudiesFallback.ts` yang ikut ter-bundle.
 *
 * FUNGSI, bukan konstanta, dan itu bukan selera: `content.json` baru mendarat
 * sesudah `loadContent()` di `main.tsx`. Sebuah `export const SPOTLIGHTS = ...`
 * dihitung saat modulnya diimpor — sebelum itu — jadi ia akan membekukan isi
 * cadangan selamanya dan CMS-nya tidak akan pernah kelihatan berpengaruh, tanpa
 * satu pun error. Jebakan yang sama sudah memakan tiga slice sebelumnya.
 *
 * ⚠️ Konsekuensinya menular ke pemanggil: `CaseStudySpotlight.tsx` dulu memegang
 * daftar ini sebagai konstanta modul. Pemanggilannya HARUS di dalam komponen
 * (lewat `useMemo`), bukan di ruang modul.
 */
export function caseStudies(): CaseStudyContent[] {
  const dariCms = contentCaseStudies();
  if (!dariCms) return FALLBACK_CASE_STUDIES;

  /* Daftar KOSONG dari CMS dihormati apa adanya — lihat alasan lengkapnya di
     `peopleValues()` di `src/data/people.ts`. Yang menangani keadaan kosong itu
     `CaseStudySpotlight` sendiri: seksinya tidak dirender sama sekali. */

  /* Tidak ada terjemahan bentuk di sini: berbeda dengan `workProjects()`,
     `outcome` di cerita ini wajib dan selalu dicetak, jadi string kosong pun
     tidak berubah jadi `undefined`. */
  return dariCms.map((s) => ({
    title: s.title,
    client: s.client,
    year: s.year,
    industry: s.industry,
    scope: s.scope,
    outcome: s.outcome,
    quote: s.quote,
    desc: s.desc,
    image: s.image,
  }));
}
