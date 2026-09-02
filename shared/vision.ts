/**
 * Bentuk Visi — paragraf penutup halaman depan, tepat sebelum bagian kontak.
 *
 * Satu-satunya definisi, dipakai bertiga seperti `shared/value.ts`: `server/`
 * saat menyimpan ke Postgres, `admin/` saat mengisi form, dan `src/` saat
 * membaca `content.json`.
 *
 * ‼️ ENTITAS TUNGGAL — satu-satunya di CMS ini, dan itu bukan kebetulan
 * ukuran. Enam entitas sebelumnya adalah DAFTAR: editor menambah, menghapus,
 * dan memindahkan barisnya. Visi bukan daftar dengan satu isi; ia satu blok
 * yang SELALU ada di halaman depan dan hanya pernah disunting. Tiga hal yang
 * ada di entitas lain karena itu sengaja TIDAK ada di sini:
 *
 * 1. **Tidak ada `state`.** Lihat catatan panjang di bawah — draft pada
 *    entitas tunggal berarti menghapus seksinya dari halaman depan.
 * 2. **Tidak ada `sortOrder`.** Tidak ada yang bisa diurutkan terhadap apa
 *    pun. Alasannya sama dengan crew (§`crewMembers`): tombol yang tidak
 *    mengubah apa-apa di situs adalah tombol yang berbohong ke editor.
 * 3. **Tidak ada `id`.** Barisnya cuma satu dan panel tidak pernah perlu
 *    merujuknya — `#/visi` langsung membuka formnya, tanpa daftar di depannya.
 *    Id-nya tetap ada di database sebagai kunci, tapi ia urusan Postgres, bukan
 *    sesuatu yang perlu menyeberang ke browser.
 *
 * ⚠️ KENAPA TIDAK ADA `draft`/`live` — ini yang paling gampang "diperbaiki"
 * oleh orang berikutnya, jadi alasannya ditulis lengkap.
 *
 * Seksi Visi adalah SATU-SATUNYA yang menjatah celah 80px antara plank
 * Industries dan bagian Contact di layar mobile: `Industries.tsx` tidak punya
 * `pb-*` sama sekali dan `Contact.tsx` memakai `pt-0`, jadi `pt-20 pb-20`
 * milik `Vision.tsx`-lah yang memegang keduanya (standar jarak 28 Agu). Seksi
 * ini tidak dirender = plank Industries menempel langsung ke Contact tanpa
 * celah.
 *
 * Di entitas daftar, "editor menghapus semuanya → seksinya hilang" adalah
 * perilaku yang memang diminta. Di sini perilaku itu merusak tata letak
 * halaman depan, dan yang memicunya cuma satu klik dropdown ke "draft" —
 * tanpa pesan galat, tanpa cara menebak sebabnya dari panel. Karena itu Visi
 * tidak punya status, tidak punya tombol hapus, dan `Vision.tsx` selalu
 * merender seksinya: kalau isinya belum ada, yang dipakai isi cadangan bundle.
 *
 * ⚠️ Sama seperti berkas `shared/` yang lain: TIDAK BOLEH mengimpor apa pun
 * dari `server/`. Isinya ikut ter-bundle ke browser.
 */

export type Vision = {
  /**
   * Kalimat visinya — paragraf besar bercetak tebal di puncak seksi.
   *
   * Bukan "headline" meski tampil sebagai teks terbesar di seksinya: yang
   * diketik editor adalah pernyataan visi perusahaan, dan menamainya menurut
   * ukuran fontnya akan menyesatkan begitu tata letaknya berubah.
   */
  statement: string;
  /**
   * Path foto di bawah kalimatnya. Kosong = belum ada, dan seksinya menampilkan
   * kalimatnya saja — bukan `<img src="">` yang jadi ikon gambar rusak.
   */
  photo: string;
};
