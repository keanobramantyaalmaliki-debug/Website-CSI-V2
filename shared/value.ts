/**
 * Bentuk satu nilai — "What We Stand For" di halaman People.
 *
 * Satu-satunya definisi, dipakai bertiga persis seperti `shared/job.ts`:
 * `server/` saat menyimpan ke Postgres, `admin/` saat mengisi form, dan `src/`
 * saat membaca `content.json`.
 *
 * Nilai TIDAK punya slug dan tidak punya halaman sendiri. Ia cuma satu panel
 * di tumpukan sticky `PeopleValues.tsx`, jadi yang menentukan tampilannya
 * hanya isi dan URUTANNYA — dan urutan itulah satu-satunya hal yang tidak ada
 * di lowongan: panel terakhir yang menutup tumpukan adalah yang paling
 * diingat pengunjung, jadi editor harus bisa memindahkannya.
 *
 * ⚠️ Sama seperti berkas `shared/` yang lain: TIDAK BOLEH mengimpor apa pun
 * dari `server/`. Isinya ikut ter-bundle ke browser.
 */

/**
 * Dua keadaan, bukan tiga.
 *
 * `draft` — sedang disiapkan; tidak pernah ikut ke `content.json`.
 * `live`  — tampil sebagai salah satu panel di halaman People.
 *
 * Lowongan punya `closed` karena barisnya tetap tayang dalam keadaan abu-abu;
 * nilai tidak punya keadaan seperti itu — sebuah prinsip kerja tidak pernah
 * "ditutup", ia dipakai atau dicabut.
 *
 * Namanya sengaja BUKAN "tayang". Kata itu sudah punya arti lain di panel ini
 * — sudah sampai ke pengunjung atau belum (badge "belum terpublish", tombol
 * Publish) — dan sebuah nilai bisa saja Live TAPI belum terpublish.
 */
export type ValueState = "draft" | "live";

export const VALUE_STATES: readonly ValueState[] = ["draft", "live"];

export type Value = {
  id: string;
  /** Judul besar di kolom kiri panel. Contoh: "Craft First". */
  title: string;
  /** Baris kecil huruf besar di bawah judul. Contoh: "Precision over speed". */
  tagline: string;
  /** Paragraf di kolom kanan panel. */
  description: string;
  /** Path foto di kolom tengah. Kosong = belum ada; panelnya menampilkan
   *  bingkai bertuliskan "Photo" alih-alih gambar. */
  photo: string;
  state: ValueState;
  /** Urutan panel dari atas ke bawah. Kecil di atas. */
  sortOrder: number;
};
