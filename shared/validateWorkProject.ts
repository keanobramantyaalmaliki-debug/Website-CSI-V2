/**
 * Pemeriksa isi proyek — dipakai server saat menyimpan DAN admin saat mengisi
 * form, dengan alasan yang sama seperti `validateJob.ts`: aturan yang ditulis
 * dua kali akan berbeda suatu hari, dan yang menemukannya pengunjung.
 *
 * Pesannya berbahasa Indonesia dan tanpa istilah teknis. Yang membacanya
 * editor non-teknis.
 */
import { WORK_PROJECT_STATES, type WorkProject } from "./workProject";

/** Urutan pemberitahuan = urutan isian dibaca dari atas ke bawah di form. */
export const WORK_PROJECT_FIELD_ORDER = [
  "title",
  "client",
  "year",
  "tags",
  "image",
  "outcome",
  "state",
] as const;

export type WorkProjectField = (typeof WORK_PROJECT_FIELD_ORDER)[number];

export type WorkProjectFieldErrors = Partial<
  Record<WorkProjectField, string>
>;

/** Yang dikirim form ke pemeriksa — sama dengan `WorkProject` tanpa hal yang
 *  diurus database sendiri (`id`, urutan). */
export type WorkProjectInput = Omit<WorkProject, "id" | "sortOrder">;

/**
 * Batas panjang, semuanya berasal dari TATA LETAKNYA, bukan dari kolom
 * database (`text` tidak punya batas).
 *
 * Isi kartu ditumpuk di atas gambarnya sendiri, di dalam kotak selebar kartu
 * terdepan (~726px di desain acuan, 85vw di ponsel). Judul `text-2xl`, klien
 * dan hasil `font-mono` sangat kecil — semuanya BOLEH membungkus ke baris
 * berikutnya, tapi tiap baris tambahan mendorong isinya naik menutupi gambar
 * yang justru jadi alasan kartu itu ada. Angkanya diambil ~2× dari isi yang
 * tayang hari ini (judul terpanjang "Cloud Infrastructure Migration" 30,
 * klien "State-Owned Infrastructure Co." 30, hasil "50+ data sources unified"
 * 24), jadi ada ruang bernapas tanpa memberi ruang untuk kalimat.
 */
const MAX = {
  title: 60,
  client: 60,
  year: 20,
  outcome: 60,
  tag: 30,
  /* Enam label sudah dua kali lipat dari yang terbanyak sekarang (tiga), dan
     di lebar kartu ponsel deretannya mulai jadi dua baris penuh sesudah itu. */
  tags: 6,
} as const;

const blank = (value: string) => value.trim().length === 0;

/**
 * Label kartu.
 *
 * Yang dijaga bukan kerapian melainkan `key={tag}` — `CaseGrid.tsx` dan
 * `CaseGridMobileStack.tsx` sama-sama memakai teks labelnya sebagai key React.
 * Dua label kembar di satu proyek membuat React memakai ulang node yang salah;
 * yang terlihat bukan error, melainkan satu label yang berkedip atau hilang.
 */
function tagsError(tags: string[]): string | null {
  if (tags.length > MAX.tags)
    return `Terlalu banyak label (maksimal ${MAX.tags}).`;

  const seen = new Set<string>();
  for (const tag of tags) {
    if (blank(tag)) return "Ada label yang masih kosong. Isi teksnya, atau hapus barisnya.";
    if (tag.length > MAX.tag)
      return `Label "${tag}" kepanjangan (maksimal ${MAX.tag} karakter).`;

    const kunci = tag.trim().toLowerCase();
    if (seen.has(kunci))
      return `Label "${tag.trim()}" ditulis dua kali, cukup satu.`;
    seen.add(kunci);
  }
  return null;
}

/**
 * Memeriksa satu proyek.
 *
 * Ketatnya IKUT STATUS, sama seperti lowongan: draf cuma perlu nama proyek,
 * supaya editor bisa menyimpan pekerjaan setengah jalan tanpa dimarahi.
 * Pemeriksaan penuh berlaku begitu statusnya `live` — yaitu tepat saat isinya
 * akan dibaca pengunjung.
 */
export function validateWorkProject(
  input: WorkProjectInput,
): WorkProjectFieldErrors {
  const errors: WorkProjectFieldErrors = {};

  if (blank(input.title)) errors.title = "Nama proyek belum diisi.";
  else if (input.title.length > MAX.title)
    errors.title = `Nama proyek kepanjangan (maksimal ${MAX.title} karakter).`;

  if (!WORK_PROJECT_STATES.includes(input.state))
    errors.state = "Status proyek belum dipilih.";

  /* Sampai sini saja untuk draf. Yang di bawah soal layak-tidaknya dibaca
     pengunjung, dan draf memang tidak pernah sampai ke sana. */
  if (input.state === "draft") return errors;

  if (blank(input.client)) errors.client = "Nama klien belum diisi.";
  else if (input.client.length > MAX.client)
    errors.client = `Nama klien kepanjangan (maksimal ${MAX.client} karakter).`;

  /**
   * Tahun disimpan sebagai TEKS, bukan angka.
   *
   * Ia dicetak apa adanya di sebelah nama klien dan tidak pernah dihitung,
   * diurutkan, atau dibandingkan — jadi kolom angka cuma akan melarang bentuk
   * yang sah dibaca orang ("2023–2024" untuk pekerjaan yang melewati tahun).
   * Yang benar-benar dijaga cuma satu: harus ADA tahun empat angka di
   * dalamnya, supaya "tahun lalu" atau isian setengah tidak lolos ke situs.
   */
  if (blank(input.year)) errors.year = "Tahun belum diisi.";
  else if (input.year.length > MAX.year)
    errors.year = `Tahun kepanjangan (maksimal ${MAX.year} karakter).`;
  else if (!/\d{4}/.test(input.year))
    errors.year = "Tahun harus memuat angka empat digit. Contoh: 2024, atau 2023–2024.";

  const label = tagsError(input.tags);
  if (label) errors.tags = label;

  /**
   * Gambar WAJIB untuk proyek yang tampil, dan ini lebih keras daripada foto
   * nilai maupun crew.
   *
   * Sebabnya bukan selera: kartu proyek TIDAK punya tampilan tanpa gambar.
   * Crew punya `CrewAvatar` (ikon orang abu-abu) dan nilai punya bingkai
   * bertuliskan "Photo"; kartu di `CaseGrid.tsx` cuma `<img>` yang memenuhi
   * seluruh kotaknya. Tanpa gambar yang tayang bukan kartu polos melainkan
   * ikon "gambar rusak" bawaan peramban, di kartu terdepan halaman Work.
   */
  if (blank(input.image))
    errors.image = "Gambar belum dipilih. Kartu proyek seluruhnya gambar, jadi tanpa itu tidak ada yang bisa ditampilkan.";

  /* `outcome` SENGAJA tidak wajib. `CaseGrid.tsx` sudah menggerbanginya
     (`{activeProject.outcome && …}`), berikut garis pemisah di atasnya, jadi
     kartu tanpa baris hasil adalah tampilan yang memang dirancang — bukan
     lubang. Tidak semua pekerjaan punya satu angka yang pantas dipamerkan. */
  if (input.outcome.length > MAX.outcome)
    errors.outcome = `Baris hasil kepanjangan (maksimal ${MAX.outcome} karakter).`;

  return errors;
}

/** Masalah PERTAMA menurut urutan baca form, atau null kalau sudah sah. */
export function firstWorkProjectError(
  errors: WorkProjectFieldErrors,
): { field: WorkProjectField; message: string } | null {
  for (const field of WORK_PROJECT_FIELD_ORDER) {
    const message = errors[field];
    if (message) return { field, message };
  }
  return null;
}

/** Apakah proyek ini layak ikut ke `content.json`? */
export function isWorkProjectPublishable(input: WorkProjectInput): boolean {
  if (input.state === "draft") return false;
  return firstWorkProjectError(validateWorkProject(input)) === null;
}
