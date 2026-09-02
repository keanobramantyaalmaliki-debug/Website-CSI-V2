/**
 * Isi kaki halaman yang IKUT TER-BUNDLE — jaring pengaman kalau `content.json`
 * tidak ada, rusak, atau lambat.
 *
 * Literal murni, tanpa satu pun impor, dengan alasan yang sama seperti
 * `visionFallback.ts`: dua pembaca yang sangat berbeda bergantung pada sifat
 * itu —
 *
 * 1. `src/data/footer.ts` memakainya sebagai cadangan di peramban.
 * 2. `server/db/seed.ts` membacanya dari Node untuk mengisi database pertama
 *    kali. Satu impor ke store situs sudah cukup menyeret `fetch` dan tipe DOM
 *    ke dalam skrip seed.
 *
 * Isinya SALINAN APA ADANYA dari yang dulu ditulis langsung di
 * `SiteFooter.tsx` (surel, alamat, hak cipta) dan di `src/data/socials.ts`
 * (tautan sosial) — berkas kedua itu dihapus waktu kaki halaman masuk CMS,
 * supaya tidak ada dua sumber kebenaran untuk daftar yang sama.
 */

export type FooterSocialContent = {
  /** Yang tercetak, misalnya "Instagram". */
  label: string;
  /** Alamat lengkapnya, berikut `https://`. */
  href: string;
};

export type FooterContent = {
  /** Alamat surel saja — situs yang menambahkan `mailto:`. */
  email: string;
  /** Alamat kantor, satu baris. */
  address: string;
  /** Baris hak cipta TANPA tahun: situs mencetak `© {tahun berjalan}` di
   *  depannya, dihitung saat render supaya tidak basi tiap 1 Januari. */
  copyright: string;
  socials: FooterSocialContent[];
};

/**
 * ⚠️ URL sosialnya disalin dari situs cogniti yang sudah tayang (Website-CSI
 * `index.html`), jadi ini yang paling mendekati kebenaran: yang di sana sudah
 * dipakai orang dan diperbaiki kalau salah. Catatan ini ikut pindah dari
 * `socials.ts` karena masih berlaku — kalau suatu hari tautannya terlihat
 * salah, bandingkan dengan situs lama dulu sebelum menebak.
 */
export const FALLBACK_FOOTER: FooterContent = {
  email: "hello@cogniti.id",
  address: "Jl. Kediri No.27, Tuban, Badung, Bali 80361",
  copyright: "Cognitiva Solusi Indonesia. All rights reserved.",
  socials: [
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
  ],
};
