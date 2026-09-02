/**
 * Kutipan klien di dasar halaman Services yang IKUT TER-BUNDLE — jaring
 * pengaman kalau `content.json` tidak ada, rusak, atau lambat.
 *
 * Literal murni, tanpa satu pun impor, alasan yang sama seperti
 * `valuesFallback.ts` dan `crewFallback.ts`: dua pembaca yang sangat berbeda
 * bergantung pada sifat itu —
 *
 * 1. `src/data/testimonials.ts` memakainya sebagai cadangan di peramban.
 * 2. `server/db/seed.ts` membacanya dari Node untuk mengisi database pertama
 *    kali. Satu impor ke store situs sudah cukup menyeret `fetch` dan tipe DOM
 *    ke dalam skrip seed.
 *
 * Isinya SALINAN APA ADANYA dari yang tayang sebelum ada CMS — termasuk
 * kenyataan bahwa tiga kutipan ini masih PLACEHOLDER (dulu ditandai
 * `TODO(content)` di `TestimonialSpotlight.tsx`). Menggantinya dengan kutipan
 * klien sungguhan sekarang jadi pekerjaan panel, bukan pekerjaan kode.
 *
 * URUTAN PENTING: yang pertama adalah kutipan yang TERLIHAT saat halaman
 * dibuka; sisanya baru muncul kalau pengunjung menekan panah.
 */

export type TestimonialContent = {
  /** Tanpa tanda kutip — komponennya menambahkan “ ” sendiri. */
  quote: string;
  name: string;
  /** Jabatan + instansi, satu baris. */
  role: string;
};

export const FALLBACK_TESTIMONIALS: TestimonialContent[] = [
  {
    quote:
      "Cogniti rebuilt the systems we’d been patching together for years. What used to take a week of manual work now happens in an afternoon.",
    name: "Ratna Wijaya",
    role: "Head of IT, Dinas Komunikasi & Informatika",
  },
  {
    quote:
      "They didn’t just ship the platform, they sat with our staff until every workflow made sense to the people actually using it.",
    name: "Budi Hartono",
    role: "Operations Director, PT Nusantara Logistik",
  },
  {
    quote:
      "Three legacy systems, one dashboard. Our reporting cycle went from two weeks to same-day.",
    name: "Sari Kusuma",
    role: "Kepala Bagian Program, Pemerintah Kabupaten",
  },
];
