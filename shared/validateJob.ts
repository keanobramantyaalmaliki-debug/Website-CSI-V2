/**
 * Pemeriksa isi lowongan — dipakai server saat menyimpan DAN admin saat
 * mengisi form.
 *
 * Satu berkas untuk keduanya dengan sengaja. Kalau aturannya ditulis ulang di
 * form, form itu harus tahu SEBAB tiap isian ditolak, dan aturannya jadi hidup
 * di dua tempat yang pasti berbeda suatu hari. Server tetap memeriksa ulang
 * meski admin sudah memeriksa: yang menjaga data bukan antarmuka, melainkan
 * yang paling dekat dengan tabelnya.
 *
 * Pesannya BERBAHASA INDONESIA dan tanpa istilah teknis — yang membacanya
 * editor non-teknis, bukan developer. Tidak ada kata "field", "invalid", atau
 * "required" di berkas ini.
 */
import { type Job, type JobLang, type JobState, JOB_STATES } from "./job";

/**
 * Urutan pemberitahuan = urutan isian dibaca dari atas ke bawah di form.
 * Dipakai admin untuk memilih masalah PERTAMA dan melompatkan fokus ke sana,
 * jadi editor tidak perlu mencari sendiri di form sepanjang ini.
 */
export const JOB_FIELD_ORDER = [
  "title",
  "department",
  "state",
  "overview",
  "photo",
  "skills",
  "slug",
  "detail_en",
  "detail_id",
] as const;

export type JobField = (typeof JOB_FIELD_ORDER)[number];

/** Isian yang bermasalah. Kunci yang ada = isian itu belum sah. */
export type JobFieldErrors = Partial<Record<JobField, string>>;

/** Yang dikirim form ke pemeriksa — sama dengan `Job` tanpa hal yang diurus
 *  database sendiri (`id`, urutan). */
export type JobInput = Omit<Job, "id" | "sortOrder">;

const MAX = {
  title: 120,
  department: 60,
  overview: 600,
  slug: 80,
  skill: 60,
  skills: 20,
  intro: 1200,
  bullet: 300,
  bullets: 20,
} as const;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const LANG_LABEL: Record<JobLang, string> = {
  en: "bahasa Inggris",
  id: "bahasa Indonesia",
};

const blank = (value: string) => value.trim().length === 0;

/**
 * Memeriksa satu bahasa halaman lowongan.
 *
 * Dipanggil hanya kalau `detail` diisi. Lowongan TANPA detail itu sah — ia
 * tampil sebagai accordion di tabel careers, bukan halaman sendiri.
 */
function detailError(copy: Job["detail"], lang: JobLang): string | null {
  if (!copy) return null;
  const { intro, responsibilities, qualifications } = copy[lang];
  const label = LANG_LABEL[lang];

  if (blank(intro)) return `Paragraf pembuka ${label} masih kosong.`;
  if (intro.length > MAX.intro)
    return `Paragraf pembuka ${label} kepanjangan (maksimal ${MAX.intro} karakter).`;

  const lists: [string, string[]][] = [
    ["Apa yang akan kamu kerjakan", responsibilities],
    ["Kamu cocok untuk posisi ini kalau", qualifications],
  ];
  for (const [heading, items] of lists) {
    const filled = items.filter((item) => !blank(item));
    if (filled.length === 0)
      return `Daftar "${heading}" ${label} masih kosong — isi minimal satu poin.`;
    if (filled.length > MAX.bullets)
      return `Daftar "${heading}" ${label} terlalu panjang (maksimal ${MAX.bullets} poin).`;
    const tooLong = filled.find((item) => item.length > MAX.bullet);
    if (tooLong)
      return `Ada poin di "${heading}" ${label} yang kepanjangan (maksimal ${MAX.bullet} karakter).`;
  }
  return null;
}

/**
 * Memeriksa satu lowongan.
 *
 * Ketatnya IKUT STATUS, dan itu inti gunanya draft: lowongan yang masih
 * disiapkan cuma perlu judul, sehingga editor bisa menyimpan pekerjaan
 * setengah jalan tanpa dimarahi. Pemeriksaan penuh baru berlaku begitu
 * statusnya dijadikan Tayang atau Ditutup — yaitu tepat saat isinya akan
 * dibaca pengunjung.
 */
export function validateJob(input: JobInput): JobFieldErrors {
  const errors: JobFieldErrors = {};

  if (blank(input.title)) errors.title = "Judul lowongan belum diisi.";
  else if (input.title.length > MAX.title)
    errors.title = `Judul kepanjangan (maksimal ${MAX.title} karakter).`;

  if (blank(input.slug)) errors.slug = "Alamat halaman belum terisi.";
  else if (input.slug.length > MAX.slug)
    errors.slug = `Alamat halaman kepanjangan (maksimal ${MAX.slug} karakter).`;
  else if (!SLUG_PATTERN.test(input.slug))
    errors.slug =
      "Alamat halaman hanya boleh berisi huruf kecil, angka, dan tanda hubung.";

  if (!JOB_STATES.includes(input.state))
    errors.state = "Status lowongan belum dipilih.";

  /* Sampai sini saja untuk draft. Yang di bawah ini soal layak-tidaknya
     dibaca pengunjung, dan draft memang tidak pernah sampai ke sana. */
  if (input.state === "draft") return errors;

  if (blank(input.department)) errors.department = "Departemen belum diisi.";
  else if (input.department.length > MAX.department)
    errors.department = `Departemen kepanjangan (maksimal ${MAX.department} karakter).`;

  if (blank(input.overview)) errors.overview = "Ringkasan belum diisi.";
  else if (input.overview.length > MAX.overview)
    errors.overview = `Ringkasan kepanjangan (maksimal ${MAX.overview} karakter).`;

  if (blank(input.photo))
    errors.photo = "Foto belum dipilih — lowongan yang tayang butuh foto.";

  const skills = input.skills.filter((skill) => !blank(skill));
  if (skills.length === 0) errors.skills = "Isi minimal satu keahlian.";
  else if (skills.length > MAX.skills)
    errors.skills = `Terlalu banyak keahlian (maksimal ${MAX.skills}).`;
  else if (skills.some((skill) => skill.length > MAX.skill))
    errors.skills = `Ada keahlian yang kepanjangan (maksimal ${MAX.skill} karakter).`;
  else {
    const seen = new Set(skills.map((skill) => skill.trim().toLowerCase()));
    if (seen.size !== skills.length)
      errors.skills = "Ada keahlian yang tertulis dua kali.";
  }

  /* Kedua bahasa diperiksa, bukan salah satu: halaman lowongan punya toggle
     EN/ID, jadi satu bahasa yang kosong berarti pengunjung yang menekan
     toggle mendarat di halaman kosong. Yang boleh kosong cuma KEDUANYA
     sekaligus — itu lowongan tanpa halaman sendiri, dan sah. */
  const en = detailError(input.detail, "en");
  if (en) errors.detail_en = en;
  const id = detailError(input.detail, "id");
  if (id) errors.detail_id = id;

  return errors;
}

/** Masalah PERTAMA menurut urutan baca form, atau null kalau sudah sah. */
export function firstJobError(
  errors: JobFieldErrors,
): { field: JobField; message: string } | null {
  for (const field of JOB_FIELD_ORDER) {
    const message = errors[field];
    if (message) return { field, message };
  }
  return null;
}

/** Apakah lowongan ini layak ikut ke `content.json`? */
export function isPublishable(input: JobInput): boolean {
  if (input.state === "draft") return false;
  return firstJobError(validateJob(input)) === null;
}

export type { JobState };
