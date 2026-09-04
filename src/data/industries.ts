import { contentIndustries } from "@/lib/content/store";
import {
  FALLBACK_INDUSTRIES,
  type IndustryContent,
  type IndustryTier,
} from "./industriesFallback";

/* Bentuknya tinggal di `industriesFallback.ts` bersama literalnya, dan cuma
   diteruskan dari sini: berkas ini dibaca komponen situs, sedangkan berkas itu
   juga dibaca skrip seed dari Node. Satu definisi, dua pembaca. */
export type { IndustryContent, IndustryTier };

/**
 * Daftar sektor strip "Built Across Sectors" — dari CMS kalau `content.json`
 * terbaca, kalau tidak dari `industriesFallback.ts` yang ikut ter-bundle.
 *
 * FUNGSI, bukan konstanta, dan itu bukan selera: `content.json` baru mendarat
 * sesudah `loadContent()` di `main.tsx`. Sebuah `export const INDUSTRIES = ...`
 * dihitung saat modulnya diimpor — sebelum itu — jadi ia akan membekukan isi
 * cadangan selamanya dan CMS-nya tidak akan pernah kelihatan berpengaruh,
 * tanpa satu pun error. Jebakan yang sama sudah memakan empat slice sebelumnya.
 *
 * ⚠️ Konsekuensinya menular ke pemanggil: `Industries.tsx` dulu memegang daftar
 * ini sebagai konstanta modul. Pemanggilannya HARUS di dalam komponen (lewat
 * `useMemo`), bukan di ruang modul.
 *
 * Nomor "01"–"13" TIDAK ada di sini dan tidak pernah disimpan di database —
 * yang merender menurunkannya dari posisi baris. Lihat `shared/industry.ts`.
 */
export function industries(): IndustryContent[] {
  const dariCms = contentIndustries();
  if (!dariCms) return FALLBACK_INDUSTRIES;

  /* Daftar KOSONG dari CMS dihormati apa adanya — lihat alasan lengkapnya di
     `peopleValues()` di `src/data/people.ts`. Yang menangani keadaan kosong itu
     `Industries.tsx` sendiri: seluruh strip berikut tumpukan 3D-nya tidak
     dirender sama sekali. */

  return dariCms.map((i) => ({
    name: i.name,
    desc: i.desc,
    tier: i.tier,
    image: i.image,
  }));
}
