/**
 * Bentuk satu layanan — daftar "Where Software Becomes Intelligence" di
 * halaman Services.
 *
 * Satu-satunya definisi, dipakai bertiga persis seperti `shared/job.ts`:
 * `server/` saat menyimpan ke Postgres, `admin/` saat mengisi form, dan `src/`
 * saat membaca `content.json`.
 *
 * Layanan TIDAK punya slug dan tidak punya halaman sendiri — ia satu judul
 * yang lewat di sabuk teks 3D (`ServicesTicker.tsx`) plus satu baris di daftar
 * `sr-only` yang dibaca pembaca layar dan mesin pencari. Dua tampilan, satu
 * baris data: yang terlihat cuma judulnya, yang terbaca judul + rincian.
 *
 * ⚠️ Sama seperti berkas `shared/` yang lain: TIDAK BOLEH mengimpor apa pun
 * dari `server/`. Isinya ikut ter-bundle ke browser, dan satu impor iseng
 * cukup untuk menyeret `DATABASE_URL` ke JavaScript yang diunduh setiap
 * pengunjung, tanpa error apa pun yang memberitahu.
 */

/**
 * Dua keadaan, bukan tiga.
 *
 * `draft` — sedang disiapkan; tidak pernah ikut ke `content.json`.
 * `live`  — ikut lewat di sabuk halaman Services.
 *
 * Lowongan punya `closed` karena barisnya tetap tayang dalam keadaan abu-abu.
 * Layanan tidak punya keadaan seperti itu: layanan yang tidak lagi ditawarkan
 * bukan "ditutup" melainkan dicabut dari daftar.
 *
 * Enum-nya SENDIRI di Postgres (`service_state`), tidak menumpang
 * `value_state`/`crew_state`/`work_project_state` yang kebetulan berisi dua
 * nilai yang sama — alasannya sama seperti yang ditulis di `shared/crew.ts`.
 */
export type ServiceState = "draft" | "live";

export const SERVICE_STATES: readonly ServiceState[] = ["draft", "live"];

export type Service = {
  id: string;
  /** Judul besar yang lewat di sabuk. Contoh: "Custom Software Development".
   *  Sekaligus IDENTITAS layanan — lihat catatan keunikan di
   *  `validateService.ts`. */
  title: string;
  /** Satu kalimat penjelas. TIDAK pernah terlihat mata: ia hidup di daftar
   *  `sr-only` Office.tsx, yang justru satu-satunya bentuk halaman ini yang
   *  bisa dibaca pembaca layar dan mesin pencari. */
  desc: string;
  /** Rincian di bawah kalimat penjelas, ikut ke baris `sr-only` yang sama
   *  (dirangkai dalam kurung, dipisah koma). Contoh untuk layanan AI:
   *  ["Jenna.ai", "Knowledge Assistants", …]. Boleh kosong — sebagian besar
   *  layanan memang tidak punya rincian. */
  subs: string[];
  state: ServiceState;
  /** Urutan layanan di sabuk, searah putaran. Kecil di depan.
   *
   *  Nomor "01"–"09" yang ada di kode lama SENGAJA tidak disimpan: ia tidak
   *  pernah dicetak ke layar (cuma jadi key React), dan menyimpannya berarti
   *  membuka peluang nomornya melenceng dari urutan sebenarnya. Kalau suatu
   *  hari nomornya mau ditampilkan, turunkan saja dari posisi ini. */
  sortOrder: number;
};
