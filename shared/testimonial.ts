/**
 * Bentuk satu testimoni — kutipan klien di dasar halaman Services.
 *
 * Satu-satunya definisi, dipakai bertiga persis seperti `shared/value.ts`:
 * `server/` saat menyimpan ke Postgres, `admin/` saat mengisi form, dan `src/`
 * saat membaca `content.json`.
 *
 * ⚠️ Ini SATU-SATUNYA kutipan bernama di situs ini. Case study di halaman Work
 * juga punya `quote`, tapi itu kutipan MASALAH kliennya — kalimat pembuka
 * cerita, tanpa nama siapa pun. Yang di sini pujian bernama dan berjabatan.
 * Keduanya sengaja tidak disatukan; catatan lengkapnya ada di
 * `shared/contentMap.ts`.
 *
 * ⚠️ Sama seperti berkas `shared/` yang lain: TIDAK BOLEH mengimpor apa pun
 * dari `server/`. Isinya ikut ter-bundle ke browser.
 */

/**
 * Dua keadaan, sama seperti nilai dan crew.
 *
 * `draft` — sedang disiapkan; tidak pernah ikut ke `content.json`.
 * `live`  — ikut berputar di antara panah di dasar halaman Services.
 *
 * Tanpa `closed`: sebuah testimoni tidak pernah "ditutup" — ia dipakai atau
 * dicabut, dan yang dicabut jadi `draft` lagi dengan isinya tetap tersimpan.
 * Ini berguna khusus di sini: izin memakai kutipan dari seorang klien bisa
 * dicabut, dan menariknya dari situs tidak boleh berarti mengetik ulang
 * kalimatnya kalau izinnya kembali.
 */
export type TestimonialState = "draft" | "live";

export const TESTIMONIAL_STATES: readonly TestimonialState[] = [
  "draft",
  "live",
];

export type Testimonial = {
  id: string;
  /** Kalimat kutipannya, TANPA tanda kutik — situs yang menambahkan “ dan ”
   *  sendiri. Editor yang mengetikkannya akan menghasilkan kutip ganda. */
  quote: string;
  /** Nama orang yang berbicara. Contoh: "Ratna Wijaya". */
  name: string;
  /** Jabatan berikut tempatnya, satu baris. Contoh:
   *  "Head of IT, Dinas Komunikasi & Informatika". */
  role: string;
  state: TestimonialState;
  /** Urutan putaran. Yang ber-`sortOrder` terkecil adalah kutipan yang
   *  TERLIHAT saat halaman dibuka. */
  sortOrder: number;
};
