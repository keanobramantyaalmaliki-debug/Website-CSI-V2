/**
 * Pemeriksa isi case study — dipakai server saat menyimpan DAN admin saat
 * mengisi form, dengan alasan yang sama seperti `validateJob.ts`: aturan yang
 * ditulis dua kali akan berbeda suatu hari, dan yang menemukannya pengunjung.
 *
 * Pesannya berbahasa Indonesia dan tanpa istilah teknis. Yang membacanya
 * editor non-teknis.
 */
import { CASE_STUDY_STATES, type CaseStudy } from "./caseStudy";

/** Urutan pemberitahuan = urutan isian dibaca dari atas ke bawah di form. */
export const CASE_STUDY_FIELD_ORDER = [
  "title",
  "client",
  "year",
  "industry",
  "outcome",
  "quote",
  "desc",
  "scope",
  "image",
  "state",
] as const;

export type CaseStudyField = (typeof CASE_STUDY_FIELD_ORDER)[number];

export type CaseStudyFieldErrors = Partial<Record<CaseStudyField, string>>;

/** Yang dikirim form ke pemeriksa — sama dengan `CaseStudy` tanpa hal yang
 *  diurus database sendiri (`id`, urutan). */
export type CaseStudyInput = Omit<CaseStudy, "id" | "sortOrder">;

/**
 * Batas panjang, semuanya berasal dari TATA LETAKNYA, bukan dari kolom
 * database (`text` tidak punya batas).
 *
 * Blok case study punya dua ruang yang sifatnya berbeda, dan itulah kenapa
 * angkanya berjauhan:
 *
 * 1. DI ATAS GAMBAR (meta, judul, hasil) — teks putih di atas gradien, dalam
 *    kotak setinggi gambar. Tiap baris tambahan naik menutupi gambarnya, jadi
 *    batasnya ketat: ~2× isi yang tayang hari ini.
 * 2. DI DALAM CERITA (kutipan, uraian) — panel yang tingginya memang tumbuh
 *    mengikuti isinya, di kolom `max-w-[1400px]`. Di sini yang dijaga bukan
 *    tata letak yang rusak melainkan pembaca yang menyerah: satu case study
 *    adalah satu halaman bacaan, bukan laporan.
 */
const MAX = {
  /* "Citizen Service Portal" 22 → 60, sama dengan judul kartu proyek. */
  title: 60,
  client: 60,
  year: 20,
  /* "Infrastructure" 14. Baris metanya `klien · industri · tahun` di 11px —
     ketiganya berbagi satu baris sebelum membungkus. */
  industry: 40,
  /* "67% faster turnaround" 21. Dicetak tebal, satu baris. */
  outcome: 60,
  /* Kalimat terpanjang hari ini 108. Ia dicetak `text-xl` — satu kalimat yang
     panjang masih terbaca sebagai pembuka, satu paragraf tidak. */
  quote: 240,
  /* Dua paragraf hari ini ±600 karakter. 3000 memberi ruang untuk cerita yang
     lebih lengkap tanpa berubah jadi dokumen. */
  desc: 3000,
  descParagraphs: 8,
  scopeLabel: 30,
  /* Enam label sudah dua kali lipat dari yang terbanyak sekarang (tiga), dan
     deretannya membungkus rapi sampai sekitar situ. */
  scope: 6,
} as const;

const blank = (value: string) => value.trim().length === 0;

/**
 * Rapikan uraian jadi bentuk yang dipahami situs.
 *
 * `CaseStudySpotlight.tsx` memecah paragraf dengan `desc.split("\n\n")` —
 * PERSIS dua baris baru. Yang diketik editor tidak akan sekonsisten itu:
 * textarea di Windows mengirim `\r\n`, menekan Enter tiga kali menghasilkan
 * `\n\n\n`, dan Enter sekali menghasilkan `\n` yang tidak memecah apa pun.
 * Tanpa perapian ini, dua tulisan yang terlihat sama di form tayang berbeda,
 * dan tidak ada satu pun galat yang menjelaskannya.
 *
 * Dipakai DUA sisi (form admin sebelum mengirim, server sebelum menyimpan),
 * jadi apa yang diperiksa sama persis dengan apa yang tersimpan.
 */
export function normalizeDesc(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    /* Tiga baris baru atau lebih = satu jeda paragraf. Yang mengetik Enter
       empat kali memaksudkan satu jeda, bukan dua paragraf kosong. */
    .replace(/\n{3,}/g, "\n\n")
    /* Spasi di ujung baris tidak terlihat di form tapi ikut tersimpan, dan
       `"\n \n"` bukan pemisah paragraf bagi `split("\n\n")`. */
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/** Paragraf-paragraf yang akan dirender situs. Satu fungsi supaya form,
 *  pemeriksa, dan situs sepakat soal apa itu "paragraf". */
export function descParagraphs(desc: string): string[] {
  return normalizeDesc(desc)
    .split("\n\n")
    .filter((p) => p.trim().length > 0);
}

/**
 * Lingkup pekerjaan.
 *
 * Yang dijaga bukan kerapian melainkan `key={t}` — `CaseStudySpotlight.tsx`
 * memakai teks labelnya sebagai key React. Dua label kembar di satu cerita
 * membuat React memakai ulang node yang salah; yang terlihat bukan error,
 * melainkan satu label yang berkedip atau hilang.
 */
function scopeError(scope: string[]): string | null {
  if (scope.length > MAX.scope)
    return `Terlalu banyak lingkup (maksimal ${MAX.scope}).`;

  const seen = new Set<string>();
  for (const label of scope) {
    if (blank(label))
      return "Ada lingkup yang masih kosong. Isi teksnya, atau hapus barisnya.";
    if (label.length > MAX.scopeLabel)
      return `Lingkup "${label}" kepanjangan (maksimal ${MAX.scopeLabel} karakter).`;

    const kunci = label.trim().toLowerCase();
    if (seen.has(kunci))
      return `Lingkup "${label.trim()}" ditulis dua kali, cukup satu.`;
    seen.add(kunci);
  }
  return null;
}

/**
 * Memeriksa satu case study.
 *
 * Ketatnya IKUT STATUS, sama seperti entitas lain: draf cuma perlu judul,
 * supaya editor bisa menyimpan pekerjaan setengah jalan tanpa dimarahi —
 * dan di sini itu bukan kemewahan, karena isi satu cerita memang tidak
 * selesai dalam satu kali duduk. Pemeriksaan penuh berlaku begitu statusnya
 * `live`, yaitu tepat saat isinya akan dibaca pengunjung.
 */
export function validateCaseStudy(input: CaseStudyInput): CaseStudyFieldErrors {
  const errors: CaseStudyFieldErrors = {};

  if (blank(input.title)) errors.title = "Judul case study belum diisi.";
  else if (input.title.length > MAX.title)
    errors.title = `Judul kepanjangan (maksimal ${MAX.title} karakter).`;

  if (!CASE_STUDY_STATES.includes(input.state))
    errors.state = "Status case study belum dipilih.";

  /* Sampai sini saja untuk draf. Yang di bawah soal layak-tidaknya dibaca
     pengunjung, dan draf memang tidak pernah sampai ke sana. */
  if (input.state === "draft") return errors;

  if (blank(input.client)) errors.client = "Nama klien belum diisi.";
  else if (input.client.length > MAX.client)
    errors.client = `Nama klien kepanjangan (maksimal ${MAX.client} karakter).`;

  /* Tahun sebagai teks, dengan alasan yang sudah ditulis lengkap di
     `validateWorkProject.ts`: ia cuma dicetak, tidak pernah dihitung. Yang
     dijaga cuma harus ADA tahun empat angka di dalamnya. */
  if (blank(input.year)) errors.year = "Tahun belum diisi.";
  else if (input.year.length > MAX.year)
    errors.year = `Tahun kepanjangan (maksimal ${MAX.year} karakter).`;
  else if (!/\d{4}/.test(input.year))
    errors.year =
      "Tahun harus memuat angka empat digit. Contoh: 2024, atau 2023–2024.";

  if (blank(input.industry)) errors.industry = "Sektor belum diisi.";
  else if (input.industry.length > MAX.industry)
    errors.industry = `Sektor kepanjangan (maksimal ${MAX.industry} karakter).`;

  /**
   * Hasil WAJIB di sini, padahal di kartu "Selected work" ia opsional.
   *
   * Bedanya bukan selera melainkan tata letaknya: `CaseGrid.tsx` menggerbangi
   * baris hasilnya (`{outcome && …}`), sedangkan blok ini mencetaknya lurus di
   * antara judul dan ajakan "Read the full story". Kosong berarti satu baris
   * hampa di tengah tumpukan teks di atas gambar — bukan tampilan yang
   * dirancang, cuma lubang. Situsnya kini ikut menjaga (lihat gerbang di
   * `CaseStudySpotlight.tsx`), tapi aturannya tetap ditegakkan di sini supaya
   * yang tayang memang cerita yang lengkap.
   */
  if (blank(input.outcome)) errors.outcome = "Baris hasil belum diisi.";
  else if (input.outcome.length > MAX.outcome)
    errors.outcome = `Baris hasil kepanjangan (maksimal ${MAX.outcome} karakter).`;

  if (blank(input.quote)) errors.quote = "Kalimat pembuka belum diisi.";
  else if (input.quote.length > MAX.quote)
    errors.quote = `Kalimat pembuka kepanjangan (maksimal ${MAX.quote} karakter).`;

  const paragraf = descParagraphs(input.desc);
  if (paragraf.length === 0) errors.desc = "Uraian ceritanya belum diisi.";
  else if (normalizeDesc(input.desc).length > MAX.desc)
    errors.desc = `Uraian kepanjangan (maksimal ${MAX.desc} karakter).`;
  else if (paragraf.length > MAX.descParagraphs)
    errors.desc = `Terlalu banyak paragraf (maksimal ${MAX.descParagraphs}).`;

  /* Lingkup WAJIB minimal satu: kaki ceritanya mencetak judul kolom "Scope"
     lurus tanpa gerbang, jadi daftar kosong tayang sebagai satu kata yang
     tidak menerangkan apa pun. */
  if (input.scope.length === 0) {
    errors.scope = "Lingkup pekerjaan belum diisi, tulis minimal satu.";
  } else {
    const masalah = scopeError(input.scope);
    if (masalah) errors.scope = masalah;
  }

  /**
   * Gambar WAJIB untuk cerita yang tayang, sama kerasnya dengan kartu proyek.
   *
   * Sebabnya sama: gambarnya BUKAN hiasan melainkan tombolnya sendiri. Seluruh
   * pembuka blok ini adalah `<img>` yang diklik untuk membuka ceritanya, dengan
   * judul dan hasilnya ditumpuk di atasnya. Tanpa gambar yang tayang bukan blok
   * polos melainkan ikon "gambar rusak" bawaan peramban, dengan teks putih di
   * atasnya.
   */
  if (blank(input.image))
    errors.image =
      "Gambar belum dipilih. Gambarnya sekaligus tombol untuk membuka cerita, jadi tanpa itu tidak ada yang bisa ditampilkan.";

  return errors;
}

/** Masalah PERTAMA menurut urutan baca form, atau null kalau sudah sah. */
export function firstCaseStudyError(
  errors: CaseStudyFieldErrors,
): { field: CaseStudyField; message: string } | null {
  for (const field of CASE_STUDY_FIELD_ORDER) {
    const message = errors[field];
    if (message) return { field, message };
  }
  return null;
}

/** Apakah case study ini layak ikut ke `content.json`? */
export function isCaseStudyPublishable(input: CaseStudyInput): boolean {
  if (input.state === "draft") return false;
  return firstCaseStudyError(validateCaseStudy(input)) === null;
}
