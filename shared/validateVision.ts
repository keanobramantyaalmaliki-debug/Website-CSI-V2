/**
 * Pemeriksa isi Visi — dipakai server saat menyimpan DAN admin saat mengisi
 * form, dengan alasan yang sama seperti `validateValue.ts`: aturan yang
 * ditulis dua kali akan berbeda suatu hari, dan yang menemukannya pengunjung.
 *
 * Pesannya berbahasa Indonesia dan tanpa istilah teknis. Yang membacanya
 * editor non-teknis.
 */
import type { Vision } from "./vision";

/** Urutan pemberitahuan = urutan isian dibaca dari atas ke bawah di form. */
export const VISION_FIELD_ORDER = ["statement", "photo"] as const;

export type VisionField = (typeof VISION_FIELD_ORDER)[number];

export type VisionFieldErrors = Partial<Record<VisionField, string>>;

/**
 * Yang dikirim form ke pemeriksa.
 *
 * Kebetulan sama persis dengan `Vision` — tidak ada `id` maupun `sortOrder`
 * yang perlu dibuang seperti di entitas lain, karena entitas tunggal tidak
 * punya keduanya. Tetap ditulis sebagai tipe tersendiri, bukan alias telanjang
 * `= Vision`: yang satu bentuk yang DIKIRIM, yang satu bentuk yang TAYANG, dan
 * menyamakannya hari ini membuat penambahan kolom admin besok diam-diam ikut
 * ke `content.json`.
 */
export type VisionInput = {
  statement: string;
  photo: string;
};

/**
 * Batas panjang, dan seperti entitas lain ia berasal dari TATA LETAKNYA, bukan
 * dari kolom database (`text` tidak punya batas).
 *
 * Kalimatnya dirender `text-3xl` di mobile dan `text-5xl` di layar lebar,
 * tebal, dengan `leading-[1.1]` — jadi tiap tambahan karakter di sini berbiaya
 * jauh lebih besar daripada di uraian nilai yang berukuran normal. Yang
 * dijaga bukan kerapian: kalimat sepanjang esai akan mendorong fotonya
 * (`sm:h-[90vh]`) keluar viewport sepenuhnya, dan yang tersisa di layar
 * pertama seksi ini cuma dinding teks.
 *
 * 400 ≈ 2,3× kalimat yang tayang sekarang (175 karakter) — cukup untuk
 * menulis ulang visinya dengan lega, tidak cukup untuk menempelkan profil
 * perusahaan.
 */
const MAX = {
  statement: 400,
} as const;

const blank = (value: string) => value.trim().length === 0;

/**
 * Memeriksa isi Visi.
 *
 * ‼️ Ketatnya TIDAK ikut status, dan ini satu-satunya entitas yang begitu —
 * karena ia satu-satunya yang tidak punya status (lihat `shared/vision.ts`).
 * Di entitas lain, draft adalah tempat menyimpan pekerjaan setengah jalan;
 * di sini tidak ada tempat seperti itu, jadi pemeriksaannya selalu penuh.
 *
 * Konsekuensinya sengaja diterima: editor tidak bisa menyimpan Visi yang
 * separuh jadi. Yang membuatnya tidak menyakitkan adalah barisnya SELALU
 * sudah terisi — ia lahir dari seed dan tidak bisa dihapus, jadi menyunting
 * berarti mengganti kalimat yang sudah ada, bukan mengisi form kosong dari
 * nol lalu ditahan di tengah jalan.
 */
export function validateVision(input: VisionInput): VisionFieldErrors {
  const errors: VisionFieldErrors = {};

  if (blank(input.statement)) errors.statement = "Kalimat visinya belum diisi.";
  else if (input.statement.length > MAX.statement)
    errors.statement = `Kalimat visi kepanjangan (maksimal ${MAX.statement} karakter) — kalimat ini dirender sangat besar, dan yang panjang mendorong fotonya keluar layar.`;

  /**
   * Foto WAJIB, alasannya sama dengan foto nilai.
   *
   * Seksi ini punya keadaan tanpa foto — `Vision.tsx` menggerbanginya supaya
   * yang muncul kalimatnya saja, bukan ikon gambar rusak — tapi itu jaring
   * pengaman untuk `content.json` yang ditulis versi server lain, bukan
   * tampilan yang boleh dipilih editor. Membiarkannya lolos berarti penutup
   * halaman depan tayang sebagai satu paragraf menggantung di atas bagian
   * kontak.
   */
  if (blank(input.photo))
    errors.photo = "Foto belum dipilih — seksi Visi butuh foto di bawah kalimatnya.";

  return errors;
}

/** Masalah PERTAMA menurut urutan baca form, atau null kalau sudah sah. */
export function firstVisionError(
  errors: VisionFieldErrors,
): { field: VisionField; message: string } | null {
  for (const field of VISION_FIELD_ORDER) {
    const message = errors[field];
    if (message) return { field, message };
  }
  return null;
}
