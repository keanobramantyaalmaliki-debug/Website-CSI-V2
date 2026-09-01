import { contentCrew, contentValues } from "@/lib/content/store";
import { FALLBACK_CREW, type TeamMember } from "./crewFallback";
import { FALLBACK_VALUES, type ValueContent } from "./valuesFallback";

export type Value = ValueContent;

/* Bentuknya tinggal di `crewFallback.ts` bersama literalnya, dan cuma
   diteruskan dari sini: berkas ini dibaca komponen situs, sedangkan berkas
   itu juga dibaca skrip seed dari Node. Satu definisi, dua pembaca. */
export type { TeamMember };


/**
 * Nilai "What We Stand For" — dari CMS kalau `content.json` terbaca, kalau
 * tidak dari `valuesFallback.ts` yang ikut ter-bundle.
 *
 * FUNGSI, bukan konstanta, dan itu bukan selera: `content.json` baru mendarat
 * sesudah `loadContent()` di `main.tsx`. Sebuah `export const VALUES = ...`
 * dihitung saat modulnya diimpor — sebelum itu — jadi ia akan membekukan isi
 * cadangan selamanya dan CMS-nya tidak akan pernah kelihatan berpengaruh,
 * tanpa satu pun error.
 */
export function peopleValues(): Value[] {
  const dariCms = contentValues();
  if (!dariCms) return FALLBACK_VALUES;

  /* Daftar KOSONG dari CMS dihormati apa adanya, sama seperti `careerRoles()`.
     Yang jatuh ke cadangan cuma `null` — artinya "berkasnya tidak terbaca".
     Kalau kosong ikut jatuh ke cadangan, editor yang menghapus semua nilai
     akan melihat tiga nilai lama hidup kembali sesudah Publish dan tidak punya
     cara menghapusnya. Yang menangani keadaan kosong itu seksinya sendiri:
     `PeopleValues` tidak merender apa-apa. */

  /* `photo` di CMS selalu string ("" kalau kosong); di situs field-nya
     opsional supaya bingkai "PHOTO" yang tampil. Diterjemahkan di sini, satu
     kali, alih-alih membuat komponennya memeriksa dua bentuk kosong. */
  return dariCms.map((v) => ({
    title: v.title,
    tagline: v.tagline,
    description: v.description,
    photo: v.photo || undefined,
  }));
}

/**
 * Anggota crew — dari CMS kalau `content.json` terbaca, kalau tidak dari
 * `crewFallback.ts` yang ikut ter-bundle.
 *
 * FUNGSI, bukan konstanta, alasan yang sama persis dengan `peopleValues()`
 * di atas: `content.json` baru mendarat sesudah `loadContent()` di
 * `main.tsx`, jadi `export const` akan membekukan isi cadangan selamanya
 * tanpa satu pun error.
 *
 * ⚠️ Konsekuensinya menular ke pemanggil: `TheCrew.tsx` dulu menghitung
 * pengelompokan dan urutannya di module scope. Perhitungan itu HARUS pindah
 * ke dalam komponen — kalau tidak, ia membekukan hasil `crew()` pada saat
 * modulnya diimpor, dan bug-nya kelihatan persis seperti "CMS-nya tidak
 * jalan".
 */
export function crew(): TeamMember[] {
  const dariCms = contentCrew();
  if (!dariCms) return FALLBACK_CREW;

  /* Daftar KOSONG dari CMS dihormati apa adanya — lihat alasan lengkapnya di
     `peopleValues()`. */

  /* Dua terjemahan kecil dari bentuk CMS ke bentuk situs, dilakukan di sini
     sekali alih-alih membuat tiap komponen memeriksa dua bentuk "kosong":
     `photo` selalu string di CMS ("" kalau tidak ada) tapi opsional di situs,
     dan `social` selalu array di CMS tapi opsional di situs. */
  return dariCms.map((m) => ({
    name: m.name,
    role: m.role,
    category: m.category,
    social: m.social.length ? m.social : undefined,
    photoUrl: m.photo || undefined,
  }));
}
