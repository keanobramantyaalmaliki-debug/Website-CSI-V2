import { contentDeployments } from "@/lib/content/store";
import {
  FALLBACK_DEPLOYMENTS,
  type DeploymentContent,
} from "./deploymentsFallback";

/* Bentuknya tinggal di `deploymentsFallback.ts` bersama literalnya, dan cuma
   diteruskan dari sini: berkas ini dibaca komponen situs, sedangkan berkas itu
   juga dibaca skrip seed dari Node. Satu definisi, dua pembaca. */
export type { DeploymentContent };

/**
 * Kartu-kartu strip "Built for real-world environments…" — dari CMS kalau
 * `content.json` terbaca, kalau tidak dari `deploymentsFallback.ts` yang ikut
 * ter-bundle.
 *
 * FUNGSI, bukan konstanta, dan itu bukan selera: `content.json` baru mendarat
 * sesudah `loadContent()` di `main.tsx`. Sebuah `export const DEPLOYMENTS = ...`
 * dihitung saat modulnya diimpor — sebelum itu — jadi ia akan membekukan isi
 * cadangan selamanya dan CMS-nya tidak akan pernah kelihatan berpengaruh,
 * tanpa satu pun error. Jebakan yang sama sudah memakan lima slice sebelumnya.
 *
 * ⚠️ Konsekuensinya menular ke pemanggil: `Deployments.tsx` dulu memegang
 * daftar ini sebagai konstanta modul. Pemanggilannya HARUS di dalam komponen
 * (lewat `useMemo`), bukan di ruang modul.
 *
 * Nomor "01"–"05" TIDAK ada di sini dan tidak pernah disimpan di database —
 * yang merender menurunkannya dari posisi baris. Lihat `shared/deployment.ts`.
 */
export function deployments(): DeploymentContent[] {
  const dariCms = contentDeployments();
  if (!dariCms) return FALLBACK_DEPLOYMENTS;

  /* Daftar KOSONG dari CMS dihormati apa adanya — lihat alasan lengkapnya di
     `peopleValues()` di `src/data/people.ts`. Yang menangani keadaan kosong itu
     `Deployments.tsx` sendiri: seluruh section berikut judul dan kartu ajakan
     kontaknya tidak dirender sama sekali. */

  return dariCms.map((d) => ({
    sector: d.sector,
    region: d.region,
    desc: d.desc,
    image: d.image,
  }));
}
