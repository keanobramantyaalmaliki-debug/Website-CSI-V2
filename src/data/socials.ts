/**
 * Tautan sosial cogniti — satu daftar untuk seluruh situs.
 *
 * URL-nya disalin dari situs cogniti yang sudah tayang (Website-CSI
 * `index.html`), jadi ini yang paling mendekati kebenaran: yang di sana sudah
 * dipakai orang dan diperbaiki kalau salah.
 *
 * ⚠️ `sections/Contact.tsx` MASIH punya daftarnya sendiri (dua tautan, dengan
 * TODO(content) yang belum ditutup). Sengaja tidak ikut diubah di sini karena
 * itu mengubah isi halaman yang tampil — kalau nanti ditutup, arahkan ke sini
 * supaya tidak ada dua sumber kebenaran.
 */
export interface SocialLink {
  label: string;
  href: string;
}

export const SOCIALS: readonly SocialLink[] = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/baliinteraktifperkasa",
  },
  {
    label: "LinkedIn",
    href: "https://id.linkedin.com/company/bali-interaktif-perkasa",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/p/Bali-Interaktif-Perkasa-100055132909309/",
  },
] as const;
