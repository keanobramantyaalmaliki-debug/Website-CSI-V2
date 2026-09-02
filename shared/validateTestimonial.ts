/**
 * Pemeriksa isi testimoni — dipakai server saat menyimpan DAN admin saat
 * mengisi form, dengan alasan yang sama seperti `validateValue.ts`: aturan
 * yang ditulis dua kali akan berbeda suatu hari, dan yang menemukannya
 * pengunjung.
 *
 * Pesannya berbahasa Indonesia dan tanpa istilah teknis. Yang membacanya
 * editor non-teknis.
 */
import { TESTIMONIAL_STATES, type Testimonial } from "./testimonial";

/** Urutan pemberitahuan = urutan isian dibaca dari atas ke bawah di form. */
export const TESTIMONIAL_FIELD_ORDER = [
  "quote",
  "name",
  "role",
  "state",
] as const;

export type TestimonialField = (typeof TESTIMONIAL_FIELD_ORDER)[number];

export type TestimonialFieldErrors = Partial<
  Record<TestimonialField, string>
>;

/** Yang dikirim form ke pemeriksa — sama dengan `Testimonial` tanpa hal yang
 *  diurus database sendiri (`id`, urutan). */
export type TestimonialInput = Omit<Testimonial, "id" | "sortOrder">;

/**
 * Batas panjang, dan semuanya berasal dari TATA LETAKNYA, bukan dari kolom
 * database (`text` tidak punya batas).
 *
 * Kutipannya yang paling perlu dijaga, dan bukan karena satu kutipan panjang
 * jelek sendirian: `TestimonialSpotlight.tsx` mengunci tinggi bloknya dengan
 * merender SEMUA entri di sizer tak terlihat, jadi tinggi yang berlaku selalu
 * tinggi entri TERPANJANG. Satu kutipan sepanjang paragraf akan menambah
 * ruang kosong di bawah dua kutipan lain yang pendek, dan penyebabnya tidak
 * akan terlihat dari entri yang sedang tampil. Ditambah font-nya `text-5xl` di
 * layar lebar. Angkanya ~2× isi terpanjang yang ada sekarang (kutipan 135,
 * nama 12, jabatan 43), jadi ada ruang bernapas tanpa memberi ruang untuk
 * esai.
 */
const MAX = {
  quote: 280,
  name: 60,
  role: 100,
} as const;

const blank = (value: string) => value.trim().length === 0;

/**
 * Memeriksa satu testimoni.
 *
 * Ketatnya IKUT STATUS, sama seperti nilai: draft cuma perlu nama, supaya
 * editor bisa menyimpan pekerjaan setengah jalan — mengetik nama klien lalu
 * menunggu kalimat kutipannya disetujui adalah alur yang wajar di sini.
 * Pemeriksaan penuh berlaku begitu statusnya `live`, yaitu tepat saat isinya
 * akan dibaca pengunjung.
 *
 * NAMA-lah yang jadi syarat minimum, bukan kutipannya, dan itu bukan urutan
 * asal: nama adalah kunci baris ini di mana-mana — indeks unik di database,
 * `key` React di sizer, dan judul barisnya di panel admin. Draft tanpa nama
 * adalah baris yang tidak bisa dirujuk apa pun.
 */
export function validateTestimonial(
  input: TestimonialInput,
): TestimonialFieldErrors {
  const errors: TestimonialFieldErrors = {};

  if (blank(input.name)) errors.name = "Nama yang memberi testimoni belum diisi.";
  else if (input.name.length > MAX.name)
    errors.name = `Nama kepanjangan (maksimal ${MAX.name} karakter).`;

  if (!TESTIMONIAL_STATES.includes(input.state))
    errors.state = "Status testimoni belum dipilih.";

  /* Sampai sini saja untuk draft. */
  if (input.state === "draft") return errors;

  if (blank(input.quote)) errors.quote = "Kutipannya belum diisi.";
  else if (input.quote.length > MAX.quote)
    errors.quote = `Kutipan kepanjangan (maksimal ${MAX.quote} karakter) — kutipan terpanjang menentukan tinggi blok untuk semua testimoni, termasuk yang pendek.`;

  /**
   * Jabatan WAJIB untuk yang tayang.
   *
   * Tanpa jabatan, yang tayang adalah nama orang asing di bawah sebuah pujian
   * — dan yang membuat testimoni berarti justru "siapa yang bilang". Situs
   * tetap merender barisnya (tidak digerbangi), jadi yang muncul kalau ini
   * dibiarkan lolos adalah baris kosong di bawah nama, bukan tata letak yang
   * merapat.
   */
  if (blank(input.role))
    errors.role = "Jabatan belum diisi — nama tanpa jabatan membuat testimoninya kehilangan bobot.";
  else if (input.role.length > MAX.role)
    errors.role = `Jabatan kepanjangan (maksimal ${MAX.role} karakter).`;

  return errors;
}

/** Masalah PERTAMA menurut urutan baca form, atau null kalau sudah sah. */
export function firstTestimonialError(
  errors: TestimonialFieldErrors,
): { field: TestimonialField; message: string } | null {
  for (const field of TESTIMONIAL_FIELD_ORDER) {
    const message = errors[field];
    if (message) return { field, message };
  }
  return null;
}

/** Apakah testimoni ini layak ikut ke `content.json`? */
export function isTestimonialPublishable(input: TestimonialInput): boolean {
  if (input.state === "draft") return false;
  return firstTestimonialError(validateTestimonial(input)) === null;
}
