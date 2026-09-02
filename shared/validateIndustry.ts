/**
 * Pemeriksa isi sektor industri — dipakai server saat menyimpan DAN admin saat
 * mengisi form, dengan alasan yang sama seperti `validateJob.ts`: aturan yang
 * ditulis dua kali akan berbeda suatu hari, dan yang menemukannya pengunjung.
 *
 * Pesannya berbahasa Indonesia dan tanpa istilah teknis. Yang membacanya
 * editor non-teknis.
 *
 * ⚠️ Dua hal yang TIDAK diperiksa di sini, keduanya karena alasan yang sama —
 * fungsi ini cuma dioper SATU sektor, jadi ia tidak akan pernah bisa
 * menjawab pertanyaan tentang daftarnya. Penjaganya duduk di
 * `routes/industries.ts`:
 *
 * 1. batas 13 sektor tayang (`MAX_LIVE_INDUSTRIES`);
 * 2. keunikan nama — dua sektor bernama sama tidak merusak apa pun secara
 *    teknis (kunci React-nya `id`, bukan nama), tapi pengunjung melihat dua
 *    plank kembar dan editor kehilangan cara membedakan barisnya di panel.
 *    Sama seperti judul layanan, cek kembarnya perlu melihat baris lain, jadi
 *    ia hidup di repo (`industryNameTaken`).
 */
import { INDUSTRY_STATES, INDUSTRY_TIERS, type Industry } from "./industry";

/** Urutan pemberitahuan = urutan isian dibaca dari atas ke bawah di form. */
export const INDUSTRY_FIELD_ORDER = [
  "name",
  "desc",
  "tier",
  "image",
  "state",
] as const;

export type IndustryField = (typeof INDUSTRY_FIELD_ORDER)[number];

export type IndustryFieldErrors = Partial<Record<IndustryField, string>>;

/** Yang dikirim form ke pemeriksa — sama dengan `Industry` tanpa hal yang
 *  diurus database sendiri (`id`, urutan). */
export type IndustryInput = Omit<Industry, "id" | "sortOrder">;

/**
 * Batas panjang, dan dua-duanya berasal dari TATA LETAKNYA, bukan dari kolom
 * database (`text` tidak punya batas).
 *
 * `name` — penahannya navigasi sentuh di dasar strip. Kolom namanya sengaja
 *   berlebar TETAP (`w-[15.5rem]`, lihat catatannya di IndustriesStack.tsx):
 *   kalau ia melar mengikuti panjang nama, kedua arrow di kiri-kanannya ikut
 *   bergeser tiap sektor berganti dan tap beruntun jadi meleset — pernah
 *   terukur 48px di probe. Kolom itu muat ±26 karakter, yaitu persis nama
 *   terpanjang yang tayang hari ini ("Government & Public Sector"). Lewat itu
 *   `truncate` menyelamatkan tampilannya dengan elipsis, jadi 40 memberi ruang
 *   tumbuh dengan potongan yang masih sepele. Yang ditolak adalah nama
 *   sepanjang kalimat — kartu fokus merendernya `text-3xl`.
 *
 * `desc` — tampil dua kali: di HUD hover dan di badan kartu fokus, keduanya
 *   dalam kotak `max-w-md`. Batasnya menjaga bentuknya tetap SATU KALIMAT;
 *   begitu editor mengetik paragraf, kartu fokus di layar sempit mendorong
 *   tombol dan foto keluar layar. 160 ≈ 2× kalimat terpanjang sekarang (79).
 */
const MAX = {
  name: 40,
  desc: 160,
} as const;

const blank = (value: string) => value.trim().length === 0;

/**
 * Memeriksa satu sektor.
 *
 * Ketatnya IKUT STATUS, sama seperti entitas lain: draft cuma perlu nama,
 * supaya editor bisa menyimpan pekerjaan setengah jalan tanpa dimarahi.
 * Pemeriksaan penuh berlaku begitu statusnya `live` — yaitu tepat saat isinya
 * akan dibaca pengunjung.
 */
export function validateIndustry(input: IndustryInput): IndustryFieldErrors {
  const errors: IndustryFieldErrors = {};

  if (blank(input.name)) errors.name = "Nama sektor belum diisi.";
  else if (input.name.length > MAX.name)
    errors.name = `Nama sektor kepanjangan (maksimal ${MAX.name} karakter) — nama sepanjang ini terpotong di navigasi versi HP.`;

  /* Bobot diperiksa bahkan untuk draft: tidak seperti isian teks, ia tidak
     punya keadaan "belum diisi" yang masuk akal — form selalu mengirim salah
     satu dari dua pilihan, jadi nilai di luar itu berarti body yang tidak
     dikirim form ini. */
  if (!INDUSTRY_TIERS.includes(input.tier))
    errors.tier = "Bobot sektor belum dipilih.";

  if (!INDUSTRY_STATES.includes(input.state))
    errors.state = "Status sektor belum dipilih.";

  /* Sampai sini saja untuk draft. */
  if (input.state === "draft") return errors;

  if (blank(input.desc)) errors.desc = "Kalimat penjelas belum diisi.";
  else if (input.desc.length > MAX.desc)
    errors.desc = `Kalimat penjelas kepanjangan (maksimal ${MAX.desc} karakter) — isinya satu kalimat, bukan paragraf.`;

  /**
   * Foto WAJIB untuk sektor yang tayang.
   *
   * Plank tanpa foto memang punya tampilan sah — putih buram seperti saat
   * belum dibuka. Tapi itu tampilan plank yang BELUM diklik; begitu pengunjung
   * mengkliknya, kartu yang terbang ke depan layar isinya kosong melompong,
   * dan tidak ada yang meneriakkannya.
   */
  if (blank(input.image))
    errors.image = "Foto belum dipilih — sektor yang tampil butuh foto.";

  return errors;
}

/** Masalah PERTAMA menurut urutan baca form, atau null kalau sudah sah. */
export function firstIndustryError(
  errors: IndustryFieldErrors,
): { field: IndustryField; message: string } | null {
  for (const field of INDUSTRY_FIELD_ORDER) {
    const message = errors[field];
    if (message) return { field, message };
  }
  return null;
}

/** Apakah sektor ini layak ikut ke `content.json`? */
export function isIndustryPublishable(input: IndustryInput): boolean {
  if (input.state === "draft") return false;
  return firstIndustryError(validateIndustry(input)) === null;
}
