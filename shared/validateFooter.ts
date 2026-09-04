/**
 * Pemeriksa isi kaki halaman — dipakai server saat menyimpan DAN admin saat
 * mengisi form, dengan alasan yang sama seperti validator lain: aturan yang
 * ditulis dua kali akan berbeda suatu hari, dan yang menemukannya pengunjung.
 *
 * Pesannya berbahasa Indonesia dan tanpa istilah teknis. Yang membacanya
 * editor non-teknis.
 */
import type { FooterSocial } from "./footer";

/** Urutan pemberitahuan = urutan isian dibaca dari atas ke bawah di form. */
export const FOOTER_FIELD_ORDER = [
  "email",
  "address",
  "copyright",
  "socials",
] as const;

export type FooterField = (typeof FOOTER_FIELD_ORDER)[number];

export type FooterFieldErrors = Partial<Record<FooterField, string>>;

/**
 * Yang dikirim form ke pemeriksa.
 *
 * Kebetulan sama persis dengan `Footer` — tidak ada `id` maupun `sortOrder`
 * yang perlu dibuang, karena entitas tunggal tidak punya keduanya. Tetap
 * ditulis sebagai tipe tersendiri, bukan alias telanjang `= Footer`, dengan
 * alasan yang sama seperti `VisionInput`: yang satu bentuk yang DIKIRIM, yang
 * satu bentuk yang TAYANG, dan menyamakannya hari ini membuat penambahan kolom
 * admin besok diam-diam ikut ke `content.json`.
 */
export type FooterInput = {
  email: string;
  address: string;
  copyright: string;
  socials: FooterSocial[];
};

/**
 * Batas panjang, dan seperti entitas lain ia berasal dari TATA LETAKNYA, bukan
 * dari kolom database (`text` tidak punya batas).
 *
 * Seluruh kaki halaman dirender `text-xs` dalam dua baris `flex-wrap`, dengan
 * kiri dan kanan saling mendorong (`justify-between`). Yang dijaga di sini
 * bukan kerapian melainkan pembungkusan: satu isian yang jauh lebih panjang
 * dari tetangganya akan mendorong pasangannya turun ke baris sendiri, dan
 * kaki halaman dua baris berubah jadi empat — persis tumpukan yang dihindari
 * waktu surel dan alamat disembunyikan di HP (18 Agu).
 *
 * Angkanya kelipatan longgar dari isi yang tayang sekarang: surel 16
 * karakter, alamat 41, hak cipta 47.
 */
const MAX = {
  email: 120,
  address: 160,
  copyright: 160,
  label: 40,
  href: 400,
} as const;

/* Tidak ada batas JUMLAH tautan, sengaja — perhatikan `MAX` di atas cuma
   mengatur panjang teks. Barisnya `flex flex-wrap`, jadi tautan kesembilan
   turun ke baris berikutnya alih-alih merusak apa pun, sama seperti kartu
   deployment. Yang menahan jumlahnya kanal sosial yang benar-benar dimiliki
   perusahaan, bukan validator. */

const blank = (value: string) => value.trim().length === 0;

/**
 * Surel dijaga seadanya: harus ada tepat satu `@`, dengan sesuatu di kiri dan
 * titik di kanannya.
 *
 * Sengaja TIDAK memakai regex RFC yang panjang itu. Yang mau ditangkap di sini
 * cuma satu kesalahan yang benar-benar terjadi — editor menempelkan
 * "mailto:hello@cogniti.id" atau menulis nama tanpa domain — dan hasilnya
 * `href="mailto:..."` yang membuka aplikasi surel dengan alamat kosong. Regex
 * yang lebih ketat dari itu cuma menolak alamat sah yang bentuknya tidak
 * biasa.
 */
const SURAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Satu daftar tautan sosial.
 *
 * Aturan skema (`https://…`) ada karena tautan ini dibuka dengan
 * `target="_blank"`, sama seperti tautan crew. Alamat tanpa skema —
 * "instagram.com/cogniti" — tidak dibaca peramban sebagai alamat luar
 * melainkan sebagai halaman DI SITUS INI, jadi pengunjung yang mengkliknya
 * mendarat di halaman 404 cogniti.id. Tidak ada error di mana pun; yang
 * terjadi cuma tautan yang "kadang tidak jalan".
 *
 * Barisnya disebut lewat NOMOR, bukan lewat platform seperti di crew: di sini
 * tulisannya teks bebas dan boleh saja masih kosong, jadi "Tautan Instagram"
 * tidak selalu bisa dibentuk. "Tautan ke-2" selalu bisa.
 */
function socialsError(list: FooterSocial[]): string | null {
  for (let i = 0; i < list.length; i++) {
    const nomor = i + 1;
    const label = list[i].label.trim();
    const href = list[i].href.trim();

    if (blank(label))
      return `Tautan ke-${nomor} belum ada tulisannya. Isi namanya (misalnya "Instagram"), atau hapus barisnya.`;
    if (label.length > MAX.label)
      return `Tulisan tautan ke-${nomor} kepanjangan (maksimal ${MAX.label} karakter), yang tercetak di kaki halaman cuma satu kata.`;

    if (blank(href))
      return `Alamat tautan "${label}" masih kosong. Isi alamatnya, atau hapus barisnya.`;
    if (href.length > MAX.href)
      return `Alamat tautan "${label}" kepanjangan (maksimal ${MAX.href} karakter).`;
    if (!/^https?:\/\//i.test(href))
      return `Alamat tautan "${label}" harus diawali https:// — tanpa itu tautannya mengarah ke dalam situs ini, bukan ke luar.`;
  }
  return null;
}

/**
 * Memeriksa isi kaki halaman.
 *
 * ‼️ Ketatnya TIDAK ikut status, sama seperti Visi dan karena alasan yang
 * sama: kaki halaman tidak punya status (lihat `shared/footer.ts`). Tidak ada
 * tempat untuk menyimpan pekerjaan setengah jalan, jadi pemeriksaannya selalu
 * penuh.
 *
 * Konsekuensinya sengaja diterima: editor tidak bisa menyimpan kaki halaman
 * yang separuh jadi. Yang membuatnya tidak menyakitkan sama dengan di Visi —
 * barisnya SELALU sudah terisi sejak seed dan tidak bisa dihapus, jadi
 * menyunting berarti mengganti isi yang sudah ada, bukan mengisi form kosong
 * dari nol lalu ditahan di tengah jalan.
 *
 * Kecuali daftar tautan: daftar KOSONG sah. Kaki halamannya tetap utuh tanpa
 * baris tautan, dan "perusahaan sedang tidak punya kanal sosial yang mau
 * dipajang" bukan keadaan yang berhak ditolak validator.
 */
export function validateFooter(input: FooterInput): FooterFieldErrors {
  const errors: FooterFieldErrors = {};

  const email = input.email.trim();
  if (blank(email)) errors.email = "Surel belum diisi.";
  else if (email.length > MAX.email)
    errors.email = `Surel kepanjangan (maksimal ${MAX.email} karakter).`;
  /* "mailto:" diperiksa TERPISAH, sebelum `SURAT`, karena regex di atas
     meloloskannya: "mailto:hello@cogniti.id" tetap punya tepat satu `@` dengan
     isi di kiri-kanannya. Yang tayang lalu `href="mailto:mailto:hello@…"` —
     aplikasi surel terbuka dengan alamat yang tidak bisa dikirim, tanpa galat
     di mana pun. Pesannya juga lebih berguna daripada "bukan alamat": editor
     yang menempelkannya sudah punya alamat yang benar, tinggal buang awalannya. */
  else if (/^mailto:/i.test(email))
    errors.email =
      'Buang "mailto:" di depannya. Cukup alamatnya saja, situs yang membuatnya bisa diklik.';
  else if (!SURAT.test(email))
    errors.email =
      'Surelnya belum berbentuk alamat. Tulis alamatnya saja, misalnya "hello@cogniti.id" (tanpa "mailto:").';

  if (blank(input.address)) errors.address = "Alamat belum diisi.";
  else if (input.address.length > MAX.address)
    errors.address = `Alamat kepanjangan (maksimal ${MAX.address} karakter), kaki halaman cuma menyediakan satu baris untuknya.`;

  if (blank(input.copyright)) errors.copyright = "Baris hak cipta belum diisi.";
  else if (input.copyright.length > MAX.copyright)
    errors.copyright = `Baris hak cipta kepanjangan (maksimal ${MAX.copyright} karakter).`;
  /* Tahun yang terlanjur diketik editor ditolak di sini, bukan dibersihkan
     diam-diam. Situs sudah mencetak `© {tahun berjalan}` di depan teks ini,
     jadi "2026 Cognitiva…" tayang sebagai "© 2026 2026 Cognitiva…" — dan
     membuangnya sendiri berarti menebak mana angka yang tahun dan mana yang
     bagian nama. */
  else if (/(^|\s)(19|20)\d{2}(\s|$|,|\.)/.test(input.copyright))
    errors.copyright =
      "Tahunnya jangan ikut ditulis. Situs sudah menambahkan “©” berikut tahun berjalan sendiri di depan baris ini, dan tahun yang diketik akan basi tiap 1 Januari.";
  else if (input.copyright.includes("©"))
    errors.copyright =
      "Lambang © jangan ikut ditulis. Situs sudah menambahkannya sendiri di depan baris ini.";

  const sosial = socialsError(input.socials);
  if (sosial) errors.socials = sosial;

  return errors;
}

/** Masalah PERTAMA menurut urutan baca form, atau null kalau sudah sah. */
export function firstFooterError(
  errors: FooterFieldErrors,
): { field: FooterField; message: string } | null {
  for (const field of FOOTER_FIELD_ORDER) {
    const message = errors[field];
    if (message) return { field, message };
  }
  return null;
}
