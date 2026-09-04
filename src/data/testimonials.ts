import { contentTestimonials } from "@/lib/content/store";
import {
  FALLBACK_TESTIMONIALS,
  type TestimonialContent,
} from "./testimonialsFallback";

/* Bentuknya tinggal di `testimonialsFallback.ts` bersama literalnya, dan cuma
   diteruskan dari sini: berkas ini dibaca komponen situs, sedangkan berkas itu
   juga dibaca skrip seed dari Node. Satu definisi, dua pembaca. */
export type { TestimonialContent };

/**
 * Kutipan klien di dasar halaman Services — dari CMS kalau `content.json`
 * terbaca, kalau tidak dari `testimonialsFallback.ts` yang ikut ter-bundle.
 *
 * FUNGSI, bukan konstanta, dan itu bukan selera: `content.json` baru mendarat
 * sesudah `loadContent()` di `main.tsx`. Sebuah `export const TESTIMONIALS = ...`
 * dihitung saat modulnya diimpor — sebelum itu — jadi ia akan membekukan isi
 * cadangan selamanya dan CMS-nya tidak akan pernah kelihatan berpengaruh,
 * tanpa satu pun error. Jebakan yang sama sudah memakan tiga slice sebelumnya.
 *
 * ⚠️ Konsekuensinya menular ke pemanggil: `TestimonialSpotlight.tsx` dulu
 * memegang daftar ini sebagai konstanta modul. Pemanggilannya HARUS di dalam
 * komponen (lewat `useMemo`), bukan di ruang modul.
 *
 * URUTANNYA dipakai apa adanya: yang pertama adalah kutipan yang terlihat saat
 * halaman dibuka.
 */
export function testimonials(): TestimonialContent[] {
  const dariCms = contentTestimonials();
  if (!dariCms) return FALLBACK_TESTIMONIALS;

  /* Daftar KOSONG dari CMS dihormati apa adanya — blok testimoninya lalu tidak
     dirender sama sekali. Yang menangani keadaan itu `TestimonialSpotlight`
     sendiri, karena hanya dia yang tahu bahwa panah kiri-kanan juga harus ikut
     hilang. */
  return dariCms.map((t) => ({
    quote: t.quote,
    name: t.name,
    role: t.role,
  }));
}
