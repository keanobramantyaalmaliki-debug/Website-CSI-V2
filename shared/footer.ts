/**
 * Bentuk isi kaki halaman — surel, alamat, baris hak cipta, dan tautan sosial.
 *
 * Satu-satunya definisi, dipakai bertiga seperti `shared/vision.ts`: `server/`
 * saat menyimpan ke Postgres, `admin/` saat mengisi form, dan `src/` saat
 * membaca `content.json`.
 *
 * ‼️ ENTITAS TUNGGAL, yang kedua sesudah Visi — dan alasannya sama sekali
 * berbeda. Visi tunggal karena seksinya menjatah celah 80px yang tidak boleh
 * hilang; kaki halaman tunggal karena memang cuma ada SATU kaki halaman di
 * seluruh situs. `SiteFooter.tsx` dipakai bersama oleh bagian Contact di
 * keempat halaman DAN halaman detail lowongan, justru supaya alamat kantor
 * yang pindah tidak punya dua tempat untuk diperbarui. Membuatnya jadi daftar
 * di CMS akan mengembalikan persis masalah yang komponen itu selesaikan.
 *
 * Yang ikut hilang bersama sifat tunggal itu — sama seperti Visi: tidak ada
 * `state` (kaki halaman tidak punya keadaan "draft"; ia selalu tayang), tidak
 * ada `sortOrder`, tidak ada `id` yang menyeberang ke browser, dan tidak ada
 * jalur hapus. Yang BOLEH bertambah dan berkurang cuma tautan sosialnya, dan
 * itu tabel anak — bukan baris kedua.
 *
 * ⚠️ Sama seperti berkas `shared/` yang lain: TIDAK BOLEH mengimpor apa pun
 * dari `server/`. Isinya ikut ter-bundle ke browser.
 */

/**
 * Satu tautan sosial: yang tertulis, dan ke mana ia menuju.
 *
 * ‼️ Namanya `href`, bukan `url` seperti tautan sosial crew, dan itu bukan
 * ketidakkonsistenan yang lupa dirapikan. Tautan sosial crew dipilih dari
 * daftar platform tetap (`socialPlatformEnum`) dan situs yang menentukan
 * tulisannya; yang di sini teks bebas yang dicetak APA ADANYA di kaki halaman.
 * Bentuk `{ label, href }` juga sudah jadi bentuk yang dibaca `SiteFooter.tsx`
 * dan menu HP navbar sejak sebelum ada CMS — menamainya lain berarti mengubah
 * markup dua komponen tanpa satu pun perubahan yang terlihat pengunjung.
 *
 * Teks bebas dan bukan enum karena kanal yang mungkin ditambahkan berikutnya
 * (TikTok, YouTube, WhatsApp) tidak perlu menunggu migrasi database dan
 * developer. Harganya: tidak ada yang mencegah dua "Instagram" — dan itu
 * kesalahan yang langsung terlihat editor di situsnya sendiri.
 */
export type FooterSocial = {
  /** Yang tercetak, misalnya "Instagram". */
  label: string;
  /** Alamat lengkapnya, berikut `https://`. */
  href: string;
};

export type Footer = {
  /**
   * Surel yang bisa diklik di kiri atas kaki halaman. Dirender jadi
   * `mailto:`, jadi yang diketik editor alamatnya saja — tanpa `mailto:`.
   */
  email: string;
  /** Alamat kantor, satu baris. Disembunyikan di layar HP (`hidden sm:inline`)
   *  tapi tetap ada di DOM sebagai sinyal lokasi buat crawler. */
  address: string;
  /**
   * Baris hak cipta TANPA tahun dan TANPA lambang ©.
   *
   * Situs mencetaknya sebagai `© {tahun berjalan} {teks ini}`, dan tahunnya
   * dihitung `new Date().getFullYear()` saat render. Kalau tahunnya ikut
   * diketik editor, ia jadi salah tiap 1 Januari — dan tidak ada yang
   * memberitahu siapa pun.
   */
  copyright: string;
  /** Urutannya URUTAN TAMPIL, dari kiri ke kanan. Boleh kosong: kaki
   *  halamannya tetap utuh, cuma tanpa baris tautan. */
  socials: FooterSocial[];
};
