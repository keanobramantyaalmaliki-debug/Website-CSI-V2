/**
 * Bentuk satu proyek — "Selected Work" di halaman Work.
 *
 * Satu-satunya definisi, dipakai bertiga persis seperti `shared/job.ts`:
 * `server/` saat menyimpan ke Postgres, `admin/` saat mengisi form, dan `src/`
 * saat membaca `content.json`.
 *
 * Proyek TIDAK punya slug dan tidak punya halaman sendiri — ia satu kartu di
 * kipas `CaseGrid.tsx`. Yang panjang lebar dibahas di situs adalah entitas
 * LAIN (`CaseStudySpotlight`, "Case Studies"), dan itu belum masuk CMS. Dua
 * benda berbeda di satu halaman yang sama: yang ini daftar, yang itu cerita.
 *
 * ⚠️ Sama seperti berkas `shared/` yang lain: TIDAK BOLEH mengimpor apa pun
 * dari `server/`. Isinya ikut ter-bundle ke browser, dan satu impor iseng
 * cukup untuk menyeret `DATABASE_URL` ke JavaScript yang diunduh setiap
 * pengunjung, tanpa error apa pun yang memberitahu.
 */

/**
 * Dua keadaan, bukan tiga.
 *
 * `draft` — sedang disiapkan; tidak pernah ikut ke `content.json`. Berguna
 *           untuk proyek yang klien belum mengizinkan disebut namanya.
 * `live`  — tampil sebagai satu kartu di kipas halaman Work.
 *
 * Lowongan punya `closed` karena barisnya tetap tayang dalam keadaan abu-abu.
 * Proyek tidak punya keadaan seperti itu — pekerjaan yang sudah selesai justru
 * yang paling layak dipamerkan, jadi tidak ada "proyek yang ditutup".
 *
 * Enum-nya SENDIRI di Postgres (`work_project_state`), tidak menumpang
 * `value_state`/`crew_state` yang kebetulan berisi dua nilai yang sama —
 * alasannya sama seperti yang ditulis di `shared/crew.ts`.
 */
export type WorkProjectState = "draft" | "live";

export const WORK_PROJECT_STATES: readonly WorkProjectState[] = [
  "draft",
  "live",
];

export type WorkProject = {
  id: string;
  /** Nama proyek — dan sekaligus IDENTITAS kartu di situs, lihat catatan
   *  keunikan di `validateWorkProject.ts`. */
  title: string;
  /** Nama klien, dicetak di baris kecil di atas judul. Contoh:
   *  "Regional Government". */
  client: string;
  /** Tahun pengerjaan, dicetak apa adanya di sebelah klien. Teks, bukan angka
   *  — lihat alasannya di `validateWorkProject.ts`. */
  year: string;
  /** Label kecil di bawah judul. Contoh: ["Web Platform", "Next.js"]. */
  tags: string[];
  /** Path gambar kartu. Berbeda dengan nilai dan crew, di sini gambar bukan
   *  hiasan melainkan SELURUH kartunya — lihat `validateWorkProject.ts`. */
  image: string;
  /** Satu baris hasil di kaki kartu. Contoh: "67% faster turnaround".
   *  Kosong = barisnya (berikut garis pemisahnya) tidak dirender. */
  outcome: string;
  state: WorkProjectState;
  /** Urutan kartu di kipas, dari depan ke belakang. Kecil di depan. */
  sortOrder: number;
};
