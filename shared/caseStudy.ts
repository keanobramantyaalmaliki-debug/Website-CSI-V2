/**
 * Bentuk satu case study — "Case Studies" di halaman Work.
 *
 * Satu-satunya definisi, dipakai bertiga persis seperti `shared/job.ts`:
 * `server/` saat menyimpan ke Postgres, `admin/` saat mengisi form, dan `src/`
 * saat membaca `content.json`.
 *
 * Bedanya dengan `WorkProject` — tetangganya di halaman yang sama — bukan
 * ukuran isian melainkan JENIS bendanya. `WorkProject` adalah satu kartu dalam
 * daftar: nama, klien, tahun, satu baris hasil. Yang ini CERITA: kutipan
 * pembuka soal masalahnya, dua paragraf tentang apa yang dikerjakan, dan
 * rincian lingkup pekerjaannya. Karena itu ia punya `quote` dan `desc` yang
 * tidak ada di sana, dan karena itu pula keduanya tidak dijadikan satu entitas
 * dengan kolom yang setengahnya selalu kosong.
 *
 * ⚠️ Sama seperti berkas `shared/` yang lain: TIDAK BOLEH mengimpor apa pun
 * dari `server/`. Isinya ikut ter-bundle ke browser, dan satu impor iseng
 * cukup untuk menyeret `DATABASE_URL` ke JavaScript yang diunduh setiap
 * pengunjung, tanpa error apa pun yang memberitahu.
 */

/**
 * Dua keadaan, sama seperti proyek.
 *
 * `draft` — sedang disiapkan; tidak pernah ikut ke `content.json`. Berguna
 *           justru di sini: menulis satu cerita utuh butuh beberapa kali duduk,
 *           dan setengahnya tidak boleh tayang di antaranya.
 * `live`  — tampil sebagai satu blok di halaman Work.
 *
 * Enum-nya SENDIRI di Postgres (`case_study_state`), tidak menumpang
 * `work_project_state` yang kebetulan berisi dua nilai yang sama — alasannya
 * sama seperti yang ditulis di `shared/crew.ts`.
 */
export type CaseStudyState = "draft" | "live";

export const CASE_STUDY_STATES: readonly CaseStudyState[] = ["draft", "live"];

export type CaseStudy = {
  id: string;
  /** Nama pekerjaannya — judul besar di atas gambar, dan sekaligus IDENTITAS
   *  blok di situs (`key={s.title}`). Lihat catatan keunikan di
   *  `validateCaseStudy.ts`. */
  title: string;
  /** Nama klien. Muncul dua kali: di baris meta atas gambar dan di kolom
   *  "Client" saat ceritanya dibuka. */
  client: string;
  /** Tahun pengerjaan, dicetak apa adanya. Teks, bukan angka — alasan yang
   *  sama seperti di `workProject.ts`. */
  year: string;
  /** Sektor klien. Contoh: "Public Sector". Muncul di baris meta dan di kolom
   *  "Industry". */
  industry: string;
  /** Lingkup pekerjaan — label kecil di kaki cerita. Contoh:
   *  ["Web Platform", "SIPD Integration"]. */
  scope: string[];
  /** Satu baris hasil, dicetak tebal di atas gambar. Contoh:
   *  "67% faster turnaround". */
  outcome: string;
  /** Kalimat pembuka cerita, dicetak besar di dalam tanda kutip.
   *
   *  ⚠️ Ini kutipan MASALAH-nya, bukan pujian dari klien: tidak ada nama dan
   *  jabatan siapa pun di sini. Testimoni klien yang sungguhan tinggal di
   *  halaman Services, dan peta konten pernah keliru menaruhnya di Work —
   *  lihat catatan panjangnya di `shared/contentMap.ts`. */
  quote: string;
  /** Isi ceritanya. BEBERAPA PARAGRAF dalam satu teks, dipisah baris kosong
   *  (`\n\n`) — situs memecahnya sendiri. Lihat `normalizeDesc()` di
   *  `validateCaseStudy.ts` untuk apa yang dilakukan pada bentuk lain. */
  desc: string;
  /** Path gambar besar. Seperti kartu proyek, blok ini TIDAK punya tampilan
   *  tanpa gambar — lihat `validateCaseStudy.ts`. */
  image: string;
  state: CaseStudyState;
  /** Urutan blok di halaman, dari atas ke bawah. Kecil di atas. */
  sortOrder: number;
};
