/**
 * Bentuk satu anggota crew — "The Crew" di halaman People.
 *
 * Satu-satunya definisi, dipakai bertiga persis seperti `shared/job.ts`:
 * `server/` saat menyimpan ke Postgres, `admin/` saat mengisi form, dan `src/`
 * saat membaca `content.json`.
 *
 * Crew TIDAK punya slug dan tidak punya halaman sendiri — ia satu baris di
 * daftar nama plus satu kotak di dinding foto. Yang juga TIDAK ADA di sini:
 * kolom urutan. Lihat catatan di bawah, itu keputusan, bukan kelupaan.
 *
 * ⚠️ Sama seperti berkas `shared/` yang lain: TIDAK BOLEH mengimpor apa pun
 * dari `server/`. Isinya ikut ter-bundle ke browser, dan satu impor iseng
 * cukup untuk menyeret `DATABASE_URL` ke JavaScript yang diunduh setiap
 * pengunjung, tanpa error apa pun yang memberitahu.
 */

/**
 * Departemen. Union tertutup, bukan teks bebas seperti `department` di
 * lowongan — dan bedanya bukan selera: `TheCrew.tsx` memakai daftar ini
 * sebagai URUTAN TAMPIL departemen di halaman (Management dulu, lalu
 * Developer, lalu R & D). Departemen baru yang diketik editor tidak punya
 * tempat di urutan itu, jadi ia tidak akan tampil sama sekali — gagal diam,
 * persis jenis bug yang paling mahal.
 *
 * Menambah departemen karena itu tetap pekerjaan developer: satu nilai di
 * sini, satu migrasi enum Postgres, satu baris di `CATEGORIES`.
 */
export type CrewCategory = "Management" | "Developer" | "R & D";

/** Urutan di sini = urutan departemen dari atas ke bawah di halaman People. */
export const CREW_CATEGORIES: readonly CrewCategory[] = [
  "Management",
  "Developer",
  "R & D",
];

/**
 * Platform tautan sosial. Tertutup karena nama platform-nya DICETAK apa adanya
 * sebagai teks tautan di situs ("linkedin", "x") — bukan dicocokkan ke ikon,
 * bukan di-`capitalize`. Nilai bebas akan langsung terbaca pengunjung.
 */
export type SocialPlatform = "linkedin" | "github" | "x";

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  "linkedin",
  "github",
  "x",
];

/**
 * Dua keadaan, bukan tiga.
 *
 * `draft` — sedang disiapkan; tidak pernah ikut ke `content.json`. Berguna
 *           untuk orang yang sudah tanda tangan kontrak tapi belum mulai.
 * `live`  — tampil di daftar nama dan di dinding foto.
 *
 * Lowongan punya `closed` karena barisnya tetap tayang dalam keadaan abu-abu.
 * Crew tidak punya keadaan seperti itu: orang yang sudah keluar dihapus, dan
 * hapusnya lunak (`deleted_at`), jadi barisnya tetap bisa dikembalikan.
 *
 * Enum-nya SENDIRI di Postgres (`crew_state`), tidak menumpang `value_state`
 * yang kebetulan berisi dua nilai yang sama. Enum yang dipakai bersama
 * membuat satu entitas tidak bisa menambah keadaan tanpa menyeret entitas lain
 * yang tidak ada hubungannya.
 */
export type CrewState = "draft" | "live";

export const CREW_STATES: readonly CrewState[] = ["draft", "live"];

export type CrewSocial = {
  platform: SocialPlatform;
  /** Tautan penuh (`https://…`), atau `"#"` untuk "belum ada" — itu yang
   *  dipakai hampir semua baris hari ini. Lihat `validateCrew.ts`. */
  url: string;
};

export type CrewMember = {
  id: string;
  /** Nama tampil, dan sekaligus IDENTITAS baris di situs — lihat catatan
   *  keunikan di `validateCrew.ts`. */
  name: string;
  /** Jabatan di kolom tengah. Contoh: "Senior Developer". */
  role: string;
  category: CrewCategory;
  /** Path foto di dinding kanan. Kosong = belum ada, dan itu SAH: kotaknya
   *  menampilkan ikon orang abu-abu (`CrewAvatar`), bukan lubang kosong. */
  photo: string;
  social: CrewSocial[];
  state: CrewState;
};

/**
 * ‼️ TIDAK ADA `sortOrder`, dan itu disengaja.
 *
 * `TheCrew.tsx` mengurutkan sendiri: kelompokkan per departemen (urutan
 * `CREW_CATEGORIES`), lalu A–Z di dalam tiap kelompok — karena "A-Z" adalah
 * judul kolom yang tercetak di halamannya. Kolom urutan di database berarti
 * editor bisa menyeret baris ke atas di panel lalu melihat situs mengabaikannya
 * sepenuhnya, dan tidak ada pesan galat yang bisa menjelaskan itu.
 *
 * Kalau suatu hari urutan manual memang diinginkan, yang harus berubah lebih
 * dulu adalah `TheCrew.tsx`, bukan berkas ini.
 */
