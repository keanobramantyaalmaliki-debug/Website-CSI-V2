import { contentServices } from "@/lib/content/store";
import { FALLBACK_SERVICES, type ServiceContent } from "./servicesFallback";

/* Bentuknya tinggal di `servicesFallback.ts` bersama literalnya, dan cuma
   diteruskan dari sini: berkas ini dibaca komponen situs, sedangkan berkas itu
   juga dibaca skrip seed dari Node. Satu definisi, dua pembaca. */
export type { ServiceContent };

/**
 * Daftar layanan halaman Services — dari CMS kalau `content.json` terbaca,
 * kalau tidak dari `servicesFallback.ts` yang ikut ter-bundle.
 *
 * FUNGSI, bukan konstanta, dan itu bukan selera: `content.json` baru mendarat
 * sesudah `loadContent()` di `main.tsx`. Sebuah `export const SERVICES = ...`
 * dihitung saat modulnya diimpor — sebelum itu — jadi ia akan membekukan isi
 * cadangan selamanya dan CMS-nya tidak akan pernah kelihatan berpengaruh,
 * tanpa satu pun error. Jebakan yang sama sudah memakan tiga slice sebelumnya.
 *
 * ⚠️ Konsekuensinya menular ke pemanggil: `Office.tsx` dulu memegang daftar ini
 * sebagai konstanta modul (`const SERVICES = [...]`). Pemanggilannya HARUS di
 * dalam komponen (lewat `useMemo`), bukan di ruang modul.
 */
export function services(): ServiceContent[] {
  const dariCms = contentServices();
  if (!dariCms) return FALLBACK_SERVICES;

  /* Daftar KOSONG dari CMS dihormati apa adanya — lihat alasan lengkapnya di
     `peopleValues()` di `src/data/people.ts`. Yang menangani keadaan kosong itu
     `Office.tsx` sendiri: sabuk 3D berikut daftar sr-only-nya tidak dirender
     sama sekali. */

  return dariCms.map((s) => ({
    title: s.title,
    desc: s.desc,
    subs: s.subs,
  }));
}
