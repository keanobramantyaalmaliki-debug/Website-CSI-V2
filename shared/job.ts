/**
 * Bentuk satu lowongan — satu-satunya definisi, dipakai bertiga.
 *
 * `server/` memakainya saat menyimpan ke Postgres, `admin/` saat mengisi form,
 * dan `src/` saat membaca `content.json`. Ditulis sekali di sini justru karena
 * ketiganya: tipe yang disalin ke tiga tempat akan berbeda diam-diam, dan yang
 * ketahuan duluan biasanya pengunjung, bukan test.
 *
 * ⚠️ Modul ini TIDAK BOLEH mengimpor apa pun dari `server/` — `shared/` ikut
 * ter-bundle ke browser, dan satu impor iseng cukup untuk menyeret
 * `DATABASE_URL` ke JavaScript yang diunduh setiap pengunjung, tanpa error apa
 * pun yang memberitahu. Isinya tipe dan fungsi murni saja.
 */

export type JobLang = "en" | "id";

/**
 * Tiga keadaan yang DIMENGERTI EDITOR, bukan tiga keadaan teknis.
 *
 * `draft`  — sedang disiapkan; tidak ikut ke `content.json` sama sekali.
 * `open`   — tayang dan menerima lamaran.
 * `closed` — tayang tapi ditutup: barisnya abu-abu dan mati di tabel careers.
 *
 * `draft` inilah yang membuat tombol Publish aman ditekan kapan saja:
 * mempublish lowongan A tidak ikut menayangkan lowongan B yang masih separuh
 * jadi, karena B tidak pernah ikut terangkut.
 */
export type JobState = "draft" | "open" | "closed";

export const JOB_STATES: readonly JobState[] = ["draft", "open", "closed"];

/** Isi halaman lowongan untuk SATU bahasa. Bentuknya mengikuti poster
 *  rekrutmen: satu paragraf pembuka lalu dua kolom bullet. */
export type JobCopy = {
  /** Paragraf pembuka — "Join PT Cognitiva Solusi Indonesia and be part of…" */
  intro: string;
  /** Kolom kiri poster: "WHAT YOU WILL DO". */
  responsibilities: string[];
  /** Kolom kanan poster: "YOU ARE A GREAT FIT IF YOU". */
  qualifications: string[];
};

export type Job = {
  id: string;
  /** Segmen URL `/careers/<slug>`. Dibuat otomatis dari judul; editor tidak
   *  perlu mengetiknya. */
  slug: string;
  title: string;
  /** Kolom "Type" di tabel careers — departemen saja ("Engineering"). Lokasi
   *  sengaja tidak ikut, jadi jangan digabung jadi satu string meta. */
  department: string;
  state: JobState;
  /** Ringkasan satu-dua kalimat di baris tabel careers. */
  overview: string;
  /** Path foto header & preview hover. Kosong = belum ada. */
  photo: string;
  /** Centang "Skills" di form lamaran, sekaligus daftar di accordion. */
  skills: string[];
  /**
   * Tanyakan tautan GitHub di form lamaran? PER LOWONGAN dengan sengaja:
   * mencentang GitHub di lamaran Accountant tidak memberi tahu siapa pun apa
   * pun. Nyalakan hanya di lowongan engineering.
   */
  askGithub: boolean;
  /** Urutan tampil di tabel careers. Kecil di atas. */
  sortOrder: number;
  /**
   * Isi halaman lowongan dalam dua bahasa, atau `null` kalau materinya belum
   * lengkap.
   *
   * ADA detail  → barisnya jadi tautan ke `/careers/<slug>`.
   * TANPA detail → perilaku lama: accordion di tempat.
   *
   * Dua bentuk itu memang hidup berdampingan; lihat `CareersRoles.tsx`.
   */
  detail: Record<JobLang, JobCopy> | null;
};


/** Slug dari judul: huruf kecil, tanpa aksen, dipisah tanda hubung. */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
