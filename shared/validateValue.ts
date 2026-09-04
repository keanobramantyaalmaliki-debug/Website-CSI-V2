/**
 * Pemeriksa isi nilai — dipakai server saat menyimpan DAN admin saat mengisi
 * form, dengan alasan yang sama seperti `validateJob.ts`: aturan yang ditulis
 * dua kali akan berbeda suatu hari, dan yang menemukannya pengunjung.
 *
 * Pesannya berbahasa Indonesia dan tanpa istilah teknis. Yang membacanya
 * editor non-teknis.
 */
import { VALUE_STATES, type Value } from "./value";

/** Urutan pemberitahuan = urutan isian dibaca dari atas ke bawah di form. */
export const VALUE_FIELD_ORDER = [
  "title",
  "tagline",
  "description",
  "photo",
  "state",
] as const;

export type ValueField = (typeof VALUE_FIELD_ORDER)[number];

export type ValueFieldErrors = Partial<Record<ValueField, string>>;

/** Yang dikirim form ke pemeriksa — sama dengan `Value` tanpa hal yang diurus
 *  database sendiri (`id`, urutan). */
export type ValueInput = Omit<Value, "id" | "sortOrder">;

/**
 * Batas panjang, dan semuanya berasal dari TATA LETAKNYA, bukan dari kolom
 * database (`text` tidak punya batas).
 *
 * Judul dirender `text-6xl` di layar lebar dan berbagi satu baris panel dengan
 * foto serta uraian; judul sepanjang kalimat akan mendorong panelnya lebih
 * tinggi dari viewport, dan begitu itu terjadi tumpukan sticky-nya terasa
 * macet — persis masalah yang dijelaskan panjang lebar di `PeopleValues.tsx`.
 * Angkanya diambil dengan kelonggaran ~2,5× dari isi yang ada sekarang
 * ("Long-Term Thinking" 18, "Built to outlast the brief" 26, uraian terpanjang
 * 187), jadi ada ruang bernapas tanpa memberi ruang untuk esai.
 */
const MAX = {
  title: 48,
  tagline: 80,
  description: 500,
} as const;

const blank = (value: string) => value.trim().length === 0;

/**
 * Memeriksa satu nilai.
 *
 * Ketatnya IKUT STATUS, sama seperti lowongan: draft cuma perlu judul, supaya
 * editor bisa menyimpan pekerjaan setengah jalan tanpa dimarahi. Pemeriksaan
 * penuh berlaku begitu statusnya `live` — yaitu tepat saat isinya akan dibaca
 * pengunjung.
 */
export function validateValue(input: ValueInput): ValueFieldErrors {
  const errors: ValueFieldErrors = {};

  if (blank(input.title)) errors.title = "Judul nilai belum diisi.";
  else if (input.title.length > MAX.title)
    errors.title = `Judul kepanjangan (maksimal ${MAX.title} karakter), di layar lebar judul ini dirender sangat besar.`;

  if (!VALUE_STATES.includes(input.state))
    errors.state = "Status nilai belum dipilih.";

  /* Sampai sini saja untuk draft. */
  if (input.state === "draft") return errors;

  if (blank(input.tagline)) errors.tagline = "Baris pendek di bawah judul belum diisi.";
  else if (input.tagline.length > MAX.tagline)
    errors.tagline = `Baris pendek kepanjangan (maksimal ${MAX.tagline} karakter).`;

  if (blank(input.description)) errors.description = "Uraian belum diisi.";
  else if (input.description.length > MAX.description)
    errors.description = `Uraian kepanjangan (maksimal ${MAX.description} karakter).`;

  /**
   * Foto WAJIB untuk nilai yang tampil.
   *
   * Panelnya memang punya keadaan tanpa foto — bingkai kosong bertuliskan
   * "Photo" — tapi itu tempat penampung untuk masa isinya belum ada, bukan
   * tampilan yang boleh dilihat pengunjung. Membiarkannya lolos berarti kotak
   * kosong bertuliskan PHOTO tayang di produksi, dan tidak ada yang
   * meneriakkannya.
   */
  if (blank(input.photo))
    errors.photo = "Foto belum dipilih, nilai yang tampil butuh foto.";

  return errors;
}

/** Masalah PERTAMA menurut urutan baca form, atau null kalau sudah sah. */
export function firstValueError(
  errors: ValueFieldErrors,
): { field: ValueField; message: string } | null {
  for (const field of VALUE_FIELD_ORDER) {
    const message = errors[field];
    if (message) return { field, message };
  }
  return null;
}

/** Apakah nilai ini layak ikut ke `content.json`? */
export function isValuePublishable(input: ValueInput): boolean {
  if (input.state === "draft") return false;
  return firstValueError(validateValue(input)) === null;
}
