/**
 * Isi seksi Visi yang IKUT TER-BUNDLE — jaring pengaman kalau `content.json`
 * tidak ada, rusak, atau lambat.
 *
 * Literal murni, tanpa satu pun impor, dengan alasan yang sama seperti
 * `valuesFallback.ts` dan `servicesFallback.ts`: dua pembaca yang sangat
 * berbeda bergantung pada sifat itu —
 *
 * 1. `src/data/vision.ts` memakainya sebagai cadangan di peramban.
 * 2. `server/db/seed.ts` membacanya dari Node untuk mengisi database pertama
 *    kali. Satu impor ke store situs sudah cukup menyeret `fetch` dan tipe DOM
 *    ke dalam skrip seed.
 *
 * ‼️ Cadangan ini lebih berat tugasnya daripada cadangan entitas lain.
 *
 * Di daftar seperti nilai atau layanan, CMS yang mengembalikan daftar kosong
 * berarti seksinya tidak dirender, dan itu memang yang diminta editor. Visi
 * tidak punya keadaan seperti itu: seksinya WAJIB selalu tampil, karena
 * `pt-20 pb-20` miliknya satu-satunya yang menjatah celah 80px antara plank
 * Industries (yang tidak punya `pb`) dan Contact (yang `pt-0`) di mobile.
 * Jadi berkas ini bukan cuma penyelamat halaman putih — ia yang menahan tata
 * letak halaman depan tetap benar selama `content.json` belum terbaca.
 *
 * Isinya SALINAN APA ADANYA dari literal `HEADTEXT` berikut `<img>`-nya yang
 * dulu tinggal di `Vision.tsx`.
 */

export type VisionContent = {
  /** Kalimat visinya — paragraf besar bercetak tebal di puncak seksi. */
  statement: string;
  /** Path foto di bawah kalimatnya. Kosong = seksinya menampilkan kalimatnya
   *  saja. */
  photo: string;
};

/**
 * Fotonya `static`, bukan `upload`: berkas ini sudah lama tinggal di `public/`
 * sebagai hasil grading ffmpeg manual, dan CMS tidak boleh menghapusnya dari
 * disk. Pembedaan itu yang dijaga kolom `source` di tabel `images`.
 */
export const FALLBACK_VISION: VisionContent = {
  statement:
    "To become a trusted technology partner that empowers organizations through intelligent digital innovation, creating sustainable value for businesses and communities worldwide.",
  photo: "/home/P1330392_velocity.webp",
};
