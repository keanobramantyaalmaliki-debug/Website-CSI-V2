import { contentWorkProjects } from "@/lib/content/store";
import {
  FALLBACK_WORK_PROJECTS,
  type WorkProjectContent,
} from "./workProjectsFallback";

/* Bentuknya tinggal di `workProjectsFallback.ts` bersama literalnya, dan cuma
   diteruskan dari sini: berkas ini dibaca komponen situs, sedangkan berkas itu
   juga dibaca skrip seed dari Node. Satu definisi, dua pembaca. */
export type { WorkProjectContent };

/**
 * Proyek "Selected Work" — dari CMS kalau `content.json` terbaca, kalau tidak
 * dari `workProjectsFallback.ts` yang ikut ter-bundle.
 *
 * FUNGSI, bukan konstanta, dan itu bukan selera: `content.json` baru mendarat
 * sesudah `loadContent()` di `main.tsx`. Sebuah `export const PROJECTS = ...`
 * dihitung saat modulnya diimpor — sebelum itu — jadi ia akan membekukan isi
 * cadangan selamanya dan CMS-nya tidak akan pernah kelihatan berpengaruh,
 * tanpa satu pun error. Jebakan yang sama sudah memakan dua slice sebelumnya.
 *
 * ⚠️ Konsekuensinya menular ke pemanggil: `CaseGrid.tsx` dulu memegang daftar
 * ini sebagai konstanta modul. Pemanggilannya HARUS di dalam komponen (lewat
 * `useMemo`), bukan di ruang modul.
 */
export function workProjects(): WorkProjectContent[] {
  const dariCms = contentWorkProjects();
  if (!dariCms) return FALLBACK_WORK_PROJECTS;

  /* Daftar KOSONG dari CMS dihormati apa adanya — lihat alasan lengkapnya di
     `peopleValues()` di `src/data/people.ts`. Yang menangani keadaan kosong
     itu `CaseGrid` sendiri: seksinya tidak dirender sama sekali. */

  /* Satu terjemahan kecil dari bentuk CMS ke bentuk situs: `outcome` selalu
     string di CMS ("" kalau kosong) tapi opsional di situs, karena barisnya
     berikut garis pemisahnya memang tidak dirender saat kosong. */
  return dariCms.map((p) => ({
    title: p.title,
    client: p.client,
    year: p.year,
    tags: p.tags,
    image: p.image,
    outcome: p.outcome || undefined,
  }));
}
