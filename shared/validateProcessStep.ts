import {
  MAX_LIVE_PROCESS_STEPS,
  PROCESS_GLYPH_KEYS,
  PROCESS_STEP_STATES,
  type ProcessGlyphKey,
  type ProcessStep,
  type ProcessStepState,
} from "./processStep";

/**
 * Aturan isi satu langkah "Cara kerja", ditulis sekali di sini lalu dipakai
 * dua kali: `admin/` menjalankannya sebelum mengirim (supaya galat muncul
 * seketika, tanpa perlu bolak-balik ke server) dan `server/` menjalankannya
 * lagi sebelum menyimpan (karena permintaan HTTP bisa datang dari mana saja,
 * bukan cuma dari form kita).
 *
 * Yang TIDAK bisa diperiksa di sini: batas enam langkah tayang dan keunikan
 * judul. Keduanya butuh melihat baris LAIN, sementara fungsi ini cuma
 * dititipi satu langkah. Penjaganya `server/routes/processSteps.ts`.
 */

export const PROCESS_STEP_FIELD_ORDER = [
  "title",
  "kicker",
  "desc",
  "glyph",
  "state",
] as const;

export type ProcessStepField = (typeof PROCESS_STEP_FIELD_ORDER)[number];

export type ProcessStepFieldErrors = Partial<Record<ProcessStepField, string>>;

/** Yang dikirim form: seluruh langkah tanpa `id` (dibuat database) dan tanpa
 *  `sortOrder` (ditentukan posisi di daftar, bukan diketik). */
export type ProcessStepInput = Omit<ProcessStep, "id" | "sortOrder">;

/**
 * Batas panjang, semuanya lahir dari kartu tempat teksnya mendarat — kartu
 * putih selebar `min(20rem, 68vw)`, jadi tidak ada satu pun dari angka ini
 * yang dipilih karena "kelihatannya cukup".
 *
 * - `title` 40 — `h3` `text-lg`. Judul terpanjang hari ini "Deployment &
 *   Support" (20). Empat puluh memberi ruang dua kata lagi sebelum judul
 *   mulai membungkus ke baris ketiga dan mendorong penjelasan keluar kartu.
 * - `kicker` 18 — dicetak `text-xs` KAPITAL dengan `tracking-widest`, jadi
 *   satu huruf memakan tempat jauh lebih banyak daripada kelihatannya.
 *   Terpanjang hari ini "UNDERSTAND" (10). Lewat 18 ia membungkus, dan
 *   kicker dua baris merusak ritme kepala kartu.
 * - `desc` 180 — dua kalimat pendek. Terpanjang hari ini 89 karakter; 180
 *   kira-kira dua kali lipatnya, masih di dalam slot `min-h-[55svh]` yang
 *   dipakai tali untuk mengukur posisi kartu.
 */
const MAX = {
  title: 40,
  kicker: 18,
  desc: 180,
} as const;

const blank = (value: string) => value.trim().length === 0;

export function validateProcessStep(
  input: ProcessStepInput,
): ProcessStepFieldErrors {
  const errors: ProcessStepFieldErrors = {};

  // Judul dijaga bahkan untuk draf. Ia satu-satunya cara membedakan baris di
  // panel: daftar tujuh baris "(tanpa judul)" tidak bisa diurutkan oleh siapa
  // pun, apalagi dihapus dengan yakin.
  if (blank(input.title)) errors.title = "Judul langkah wajib diisi.";
  else if (input.title.trim().length > MAX.title)
    errors.title = `Judul langkah maksimal ${MAX.title} karakter.`;

  // Dua pilihan di bawah diperiksa juga untuk draf, dan alasannya beda dengan
  // teks: enum tidak punya keadaan "belum diisi" yang masuk akal. Nilai di
  // luar daftar bukan pekerjaan yang belum selesai, melainkan data rusak —
  // dan yang rusak jangan sampai mendarat di tabel lebih dulu.
  if (!PROCESS_GLYPH_KEYS.includes(input.glyph as ProcessGlyphKey))
    errors.glyph = "Pilih salah satu ilustrasi.";

  if (!PROCESS_STEP_STATES.includes(input.state as ProcessStepState))
    errors.state = "Status langkah tidak dikenal.";

  // Sampai sini saja untuk draf. Draf memang tempat menaruh pekerjaan
  // setengah jadi; memaksanya lengkap sama dengan meniadakan gunanya.
  if (input.state === "draft") return errors;

  // Di bawah ini cuma berlaku untuk yang TAYANG — sekali `live`, isinya
  // dibaca pengunjung, dan kartu tanpa penjelasan adalah kartu setengah
  // kosong di tengah alur.
  if (blank(input.kicker)) errors.kicker = "Kicker wajib diisi.";
  else if (input.kicker.trim().length > MAX.kicker)
    errors.kicker = `Kicker maksimal ${MAX.kicker} karakter.`;

  if (blank(input.desc)) errors.desc = "Penjelasan wajib diisi.";
  else if (input.desc.trim().length > MAX.desc)
    errors.desc = `Penjelasan maksimal ${MAX.desc} karakter.`;

  return errors;
}

/**
 * Galat pertama menurut urutan isian di form, bukan menurut urutan properti
 * objek — supaya fokus melompat ke isian paling atas yang bermasalah, bukan
 * ke isian acak di tengah.
 */
export function firstProcessStepError(
  errors: ProcessStepFieldErrors,
): { field: ProcessStepField; message: string } | null {
  for (const field of PROCESS_STEP_FIELD_ORDER) {
    const message = errors[field];
    if (message) return { field, message };
  }
  return null;
}

/** Layak tampil di situs? Draf tidak pernah, seketat apa pun isinya. */
export function isProcessStepPublishable(input: ProcessStepInput): boolean {
  if (input.state === "draft") return false;
  return firstProcessStepError(validateProcessStep(input)) === null;
}

/**
 * Pesan yang dilihat editor saat mencoba menayangkan langkah ketujuh.
 *
 * Ditaruh di sini, bukan di `routes/`, karena panel perlu mengucapkan
 * kalimat yang sama saat mematikan tombol "+ Tambah" — dua tempat, satu
 * kalimat, tidak ada versi yang tertinggal saat angkanya suatu hari diubah.
 */
export const PESAN_BATAS_PROSES =
  `Sudah ada ${MAX_LIVE_PROCESS_STEPS} langkah yang tampil, dan itu batasnya — ` +
  `seksi "How We Work" sudah jadi bagian terpanjang di halaman depan. ` +
  `Turunkan dulu satu langkah jadi draf, atau hapus yang sudah tidak dipakai.`;
