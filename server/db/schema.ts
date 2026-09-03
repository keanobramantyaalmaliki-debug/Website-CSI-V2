/**
 * Skema database CMS — lowongan, nilai, crew, proyek, case study, layanan,
 * testimoni, visi, dan kaki halaman.
 *
 * Dibaca dua arah: `drizzle-kit` menerjemahkannya jadi migrasi SQL, dan kode
 * server memakainya sebagai tipe query. Jadi berkas ini SATU-SATUNYA tempat
 * bentuk tabel ditulis; jangan pernah mengubah tabel lewat `psql` langsung,
 * karena migrasi berikutnya akan menganggap perubahan itu tidak pernah ada.
 *
 * Dua kebiasaan yang dipegang di seluruh berkas:
 *
 * 1. HAPUS = ISI `deletedAt`, bukan `DELETE`. Editor non-teknis akan menghapus
 *    sesuatu yang penting, cepat atau lambat, dan "batalkan" hanya mungkin
 *    kalau barisnya masih ada.
 * 2. Anak yang urutannya penting punya kolom `position` eksplisit. Postgres
 *    tidak menjanjikan urutan baris apa pun tanpa `ORDER BY` — daftar skill
 *    yang "kebetulan urut" di lokal bisa acak di produksi.
 */

import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ─────────────────────────── enum ─────────────────────────── */

/** Cocok dengan `JobState` di `shared/job.ts`. Kalau salah satu berubah, yang
 *  lain WAJIB ikut — Postgres menolak nilai di luar daftar, jadi ketidakcocokan
 *  ini ketahuan saat menyimpan, bukan saat tayang. */
export const jobStateEnum = pgEnum("job_state", ["draft", "open", "closed"]);

export const langEnum = pgEnum("lang", ["en", "id"]);

/** Dua kolom bullet di poster lowongan: "WHAT YOU WILL DO" dan
 *  "YOU ARE A GREAT FIT IF YOU". */
export const bulletKindEnum = pgEnum("bullet_kind", [
  "responsibility",
  "qualification",
]);

/**
 * Dua keadaan sebuah nilai, cocok dengan `ValueState` di `shared/value.ts`.
 *
 * Tanpa `closed`: sebuah prinsip kerja tidak pernah "ditutup" — ia dipakai
 * atau dicabut. Yang dicabut jadi `draft` lagi, dan isinya tetap tersimpan.
 */
export const valueStateEnum = pgEnum("value_state", ["draft", "live"]);

/**
 * Departemen crew, cocok dengan `CrewCategory` di `shared/crew.ts`.
 *
 * Daftarnya TERTUTUP, dan itu keputusan sadar: `TheCrew.tsx` memakai daftar
 * yang sama untuk menentukan urutan tampil kolomnya. Departemen keempat yang
 * masuk lewat teks bebas akan tersimpan rapi di database lalu TIDAK dirender
 * sama sekali di situs — tanpa error, tanpa baris kosong, tanpa petunjuk.
 * Ditutup di sini, penambahannya jadi migrasi yang memaksa situsnya ikut.
 */
export const crewCategoryEnum = pgEnum("crew_category", [
  "Management",
  "Developer",
  "R & D",
]);

/** Tautan sosial yang punya ikon di situs. Tertutup karena nama platformnya
 *  dicetak apa adanya sebagai teks tautan — platform tak dikenal akan tampil
 *  sebagai tautan bernama kosong. */
export const socialPlatformEnum = pgEnum("social_platform", [
  "linkedin",
  "github",
  "x",
]);

/**
 * Dua keadaan anggota crew. Enum SENDIRI, bukan menumpang `value_state`
 * meski isinya kebetulan sama hari ini: dua entitas yang berbagi satu enum
 * membuat penambahan keadaan untuk salah satunya (misal "alumni") diam-diam
 * ikut jadi pilihan sah di form yang lain.
 */
export const crewStateEnum = pgEnum("crew_state", ["draft", "live"]);

/**
 * Dua keadaan sebuah proyek, cocok dengan `WorkProjectState` di
 * `shared/workProject.ts`.
 *
 * Enum SENDIRI lagi, dengan alasan yang persis sama seperti `crew_state`:
 * tiga entitas yang kebetulan berisi dua nilai yang sama hari ini akan
 * berpisah suatu hari (proyek mungkin butuh "arsip", crew mungkin butuh
 * "alumni"), dan enum bersama membuat penambahan untuk satu entitas diam-diam
 * jadi pilihan sah di form entitas yang lain.
 */
export const workProjectStateEnum = pgEnum("work_project_state", [
  "draft",
  "live",
]);

/**
 * Dua keadaan sebuah case study, cocok dengan `CaseStudyState` di
 * `shared/caseStudy.ts`.
 *
 * Enum SENDIRI lagi — keempat kalinya, dan alasannya tidak berubah: yang
 * kebetulan sama hari ini tidak boleh membuat penambahan untuk satu entitas
 * diam-diam jadi pilihan sah di form entitas yang lain.
 */
export const caseStudyStateEnum = pgEnum("case_study_state", ["draft", "live"]);

/**
 * Dua keadaan sebuah layanan, cocok dengan `ServiceState` di
 * `shared/service.ts`.
 *
 * Enum SENDIRI lagi — kelimanya, dan alasannya tidak berubah: yang kebetulan
 * sama hari ini tidak boleh membuat penambahan untuk satu entitas diam-diam
 * jadi pilihan sah di form entitas yang lain.
 */
export const serviceStateEnum = pgEnum("service_state", ["draft", "live"]);

/**
 * Dua keadaan sebuah testimoni, cocok dengan `TestimonialState` di
 * `shared/testimonial.ts`.
 *
 * Enum SENDIRI lagi — keenam, dan alasannya tetap tidak berubah. Di sini
 * ada satu keadaan yang benar-benar mungkin menyusul dan cuma masuk akal untuk
 * entitas ini: izin memakai kutipan seorang klien bisa dicabut sementara.
 * Kalau enumnya menumpang `value_state`, keadaan itu akan diam-diam jadi
 * pilihan sah di form nilai juga.
 */
export const testimonialStateEnum = pgEnum("testimonial_state", [
  "draft",
  "live",
]);

/**
 * Dua keadaan sebuah sektor industri, cocok dengan `IndustryState` di
 * `shared/industry.ts`.
 *
 * Enum SENDIRI lagi — ketujuh, dan alasannya masih yang itu-itu juga: yang
 * kebetulan sama hari ini tidak boleh membuat penambahan untuk satu entitas
 * diam-diam jadi pilihan sah di form entitas yang lain.
 */
export const industryStateEnum = pgEnum("industry_state", ["draft", "live"]);

/**
 * Bobot sebuah sektor, cocok dengan `IndustryTier` di `shared/industry.ts`.
 *
 * `core` mencetak label "Core Focus" di HUD, kartu fokus, dan daftar sr-only;
 * `also` mencetak "Sector". Enum dan bukan boolean `is_core` karena yang
 * dicetak memang dua kata yang berbeda, bukan ada/tidak ada label — dan kalau
 * suatu hari ada tingkat ketiga, enum tinggal ditambah sedangkan boolean harus
 * dibongkar.
 *
 * ⚠️ Ini BUKAN urutan dengan nama lain. Tiga sektor `core` hari ini kebetulan
 * juga tiga teratas; `sort_order` di bawah yang mengurus posisi, dan keduanya
 * bergerak sendiri-sendiri.
 */
export const industryTierEnum = pgEnum("industry_tier", ["core", "also"]);

/**
 * Dua keadaan sebuah deployment, cocok dengan `DeploymentState` di
 * `shared/deployment.ts`.
 *
 * Enum SENDIRI lagi — kedelapan, dan alasannya masih yang itu-itu juga: yang
 * kebetulan sama hari ini tidak boleh membuat penambahan untuk satu entitas
 * diam-diam jadi pilihan sah di form entitas yang lain.
 */
export const deploymentStateEnum = pgEnum("deployment_state", [
  "draft",
  "live",
]);

/**
 * Dua keadaan sebuah langkah "Cara kerja", cocok dengan `ProcessStepState` di
 * `shared/processStep.ts`.
 *
 * Enum SENDIRI lagi — kesembilan, dan alasannya masih yang itu-itu juga: yang
 * kebetulan sama hari ini tidak boleh membuat penambahan untuk satu entitas
 * diam-diam jadi pilihan sah di form entitas yang lain.
 */
export const processStepStateEnum = pgEnum("process_step_state", [
  "draft",
  "live",
]);

/**
 * Ilustrasi garis beranimasi di kepala kartu, cocok dengan `ProcessGlyphKey`
 * di `shared/processStep.ts`.
 *
 * Enum dan bukan `text`, padahal isinya nama: yang boleh dipilih PERSIS enam
 * komponen yang digambar tangan di `src/components/motion/ProcessGlyphs.tsx`,
 * dan nama ketujuh tidak akan ketemu komponennya — kartunya lalu tampil tanpa
 * kepala, tanpa satu pun galat. Enum membuat keadaan itu mustahil tersimpan.
 *
 * Ini juga satu-satunya "gambar" di CMS yang TIDAK lewat tabel `images`, dan
 * itu disengaja: ia bukan berkas melainkan koreografi SVG dalam kode. Tidak
 * ada yang bisa diunggah, jadi tidak ada yang perlu disimpan.
 *
 * Nilainya deskriptif-fungsional ("discovery"), bukan visual ("radar") —
 * isi kolom bertahan lebih lama daripada bentuk gambarnya, dan menggambar
 * ulang `DiscoveryGlyph` suatu hari tidak boleh memaksa migrasi.
 */
export const processGlyphEnum = pgEnum("process_glyph", [
  "discovery",
  "strategy",
  "design",
  "development",
  "testing",
  "deployment",
]);

/** `static` = berkas yang sudah lama ada di `public/` (hasil grading ffmpeg
 *  manual); `upload` = diunggah lewat panel admin. Dibedakan supaya jelas mana
 *  yang tidak boleh dihapus dari disk oleh CMS. */
export const imageSourceEnum = pgEnum("image_source", ["static", "upload"]);

/* ────────────────────────── gambar ────────────────────────── */

export const images = pgTable("images", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Path saji, apa adanya dipakai di `<img src>`: `/careers/foo.jpg` atau
   *  `/uploads/foo.webp`. Bukan path filesystem. */
  path: text("path").notNull().unique(),
  source: imageSourceEnum("source").notNull().default("upload"),
  /** Nama berkas asli dari komputer editor — supaya dia bisa mengenali
   *  gambarnya lagi di daftar pilihan. */
  originalName: text("original_name"),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ───────────────────────── lowongan ───────────────────────── */

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Segmen URL `/careers/<slug>`. Unik hanya di antara baris yang HIDUP —
     *  lihat `slugAlive` di bawah. */
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    department: text("department").notNull().default(""),
    state: jobStateEnum("state").notNull().default("draft"),
    overview: text("overview").notNull().default(""),
    /** `onDelete: "set null"` dan bukan `cascade`: menghapus sebuah gambar
     *  tidak boleh ikut menghapus lowongannya. */
    photoId: uuid("photo_id").references(() => images.id, {
      onDelete: "set null",
    }),
    askGithub: boolean("ask_github").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Kapan baris ini terakhir ikut terangkut ke `content.json`.
     *  `updatedAt > publishedAt` = inilah "perubahan belum terpublish". */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    /**
     * Slug unik HANYA untuk baris hidup.
     *
     * Unique biasa akan membuat lowongan yang sudah dihapus mengunci slug-nya
     * selamanya: buat "Full Stack Engineer", hapus, buat lagi → ditolak, tanpa
     * penjelasan yang masuk akal bagi editor karena baris lamanya tak kelihatan
     * di mana pun.
     */
    uniqueIndex("jobs_slug_alive")
      .on(t.slug)
      .where(sql`${t.deletedAt} is null`),
    index("jobs_state").on(t.state),
  ],
);

export const jobSkills = pgTable(
  "job_skills",
  {
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    label: text("label").notNull(),
  },
  (t) => [primaryKey({ columns: [t.jobId, t.position] })],
);

/**
 * Isi halaman lowongan, SATU BARIS PER BAHASA.
 *
 * Bukan dua kolom `intro_en`/`intro_id` di tabel `jobs`: menambah bahasa ketiga
 * lewat baris jauh lebih murah daripada lewat migrasi kolom, dan query "bahasa
 * mana yang belum lengkap" jadi `select` biasa alih-alih deretan `is null`.
 */
export const jobCopy = pgTable(
  "job_copy",
  {
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    lang: langEnum("lang").notNull(),
    intro: text("intro").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.jobId, t.lang] })],
);

export const jobCopyBullets = pgTable(
  "job_copy_bullets",
  {
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    lang: langEnum("lang").notNull(),
    kind: bulletKindEnum("kind").notNull(),
    position: integer("position").notNull(),
    text: text("text").notNull(),
  },
  (t) => [primaryKey({ columns: [t.jobId, t.lang, t.kind, t.position] })],
);

/* ─────────────────────────── nilai ────────────────────────── */

/**
 * "What We Stand For" di halaman People — satu baris per panel.
 *
 * Namanya `people_values`, bukan `values`: VALUES adalah kata kunci SQL, dan
 * tabel bernama begitu memaksa setiap query menulis tanda kutip yang cepat
 * atau lambat akan terlupa. Awalan `people_` sekaligus menjawab pertanyaan
 * "nilai yang mana" tanpa membuka berkas ini.
 *
 * Tidak ada tabel anak. Seluruh isi satu nilai muat di satu baris, jadi
 * menyimpan tidak butuh transaksi lintas tabel seperti lowongan.
 */
export const peopleValues = pgTable(
  "people_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    /** Baris kecil huruf besar di bawah judul. */
    tagline: text("tagline").notNull().default(""),
    description: text("description").notNull().default(""),
    /** `set null` dan bukan `cascade`, sama seperti di `jobs`: menghapus
     *  sebuah gambar tidak boleh ikut menghapus nilainya. */
    photoId: uuid("photo_id").references(() => images.id, {
      onDelete: "set null",
    }),
    state: valueStateEnum("state").notNull().default("draft"),
    /**
     * Urutan panel di halaman, dan di sini ia BUKAN sekadar kenyamanan:
     * panel-panelnya bertumpuk sticky, jadi yang terakhir adalah yang menutup
     * seluruh tumpukan dan paling lama dilihat. Postgres tidak menjanjikan
     * urutan baris apa pun tanpa `ORDER BY`.
     */
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    /**
     * Judul unik HANYA untuk baris hidup — alasan yang sama dengan
     * `jobs_slug_alive`: nilai yang sudah dihapus tidak boleh mengunci
     * judulnya selamanya.
     *
     * Uniknya bukan demi kerapian. `PeopleValues.tsx` memakai judul sebagai
     * `key` React; dua panel berjudul sama membuat React memakai ulang node
     * yang salah, dan yang terlihat adalah satu panel yang isinya tercampur.
     */
    uniqueIndex("people_values_title_alive")
      .on(t.title)
      .where(sql`${t.deletedAt} is null`),
    index("people_values_order").on(t.sortOrder),
  ],
);

/* ──────────────────────────── crew ────────────────────────── */

/**
 * Anggota tim di halaman People — satu baris per orang.
 *
 * ‼️ TIDAK ADA `sortOrder`, dan ini satu-satunya entitas yang begitu.
 *
 * `TheCrew.tsx` mengurutkan sendiri A–Z di dalam tiap departemen, dan huruf
 * "A-Z" itu tercetak sebagai judul kolom di situs — jadi urutannya bukan
 * preferensi yang bisa dipindah, melainkan janji ke pembaca. Kolom urutan di
 * sini akan memberi editor tombol "Naikkan" yang tidak mengubah apa pun di
 * situs: perubahan yang tersimpan, tidak error, dan tidak pernah terlihat.
 * Kalau suatu hari urutan manual memang diinginkan, yang diubah lebih dulu
 * adalah situsnya.
 */
export const crewMembers = pgTable(
  "crew_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    role: text("role").notNull().default(""),
    category: crewCategoryEnum("category").notNull(),
    /** `set null`, bukan `cascade`, sama seperti di `jobs` dan `people_values`:
     *  menghapus sebuah gambar tidak boleh ikut menghapus orangnya. Fotonya
     *  memang boleh kosong — situs menggambar ikon orang abu-abu (`CrewAvatar`)
     *  sebagai gantinya. */
    photoId: uuid("photo_id").references(() => images.id, {
      onDelete: "set null",
    }),
    state: crewStateEnum("state").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    /**
     * Nama unik HANYA untuk baris hidup — alasannya sama dengan
     * `jobs_slug_alive`: orang yang sudah dihapus tidak boleh mengunci
     * namanya selamanya, dan orang yang kembali bergabung adalah kejadian
     * yang wajar.
     *
     * Uniknya sendiri dipakai `TheCrew.tsx` sebagai `key` React. Dua orang
     * dengan nama persis sama membuat React memakai ulang node yang salah:
     * yang terlihat bukan error, melainkan satu kartu yang foto dan perannya
     * milik orang lain.
     */
    uniqueIndex("crew_members_name_alive")
      .on(t.name)
      .where(sql`${t.deletedAt} is null`),
    index("crew_members_category").on(t.category),
  ],
);

/**
 * Tautan sosial per orang.
 *
 * Tabel anak, bukan kolom `linkedin`/`github`/`x` di `crew_members`: platform
 * keempat lewat tabel anak cuma menambah nilai enum, sedangkan lewat kolom ia
 * menambah kolom yang kosong untuk hampir semua baris.
 *
 * `position` eksplisit karena urutan ikon di kartu terlihat, dan Postgres
 * tidak menjanjikan urutan baris apa pun tanpa `ORDER BY`.
 */
export const crewSocials = pgTable(
  "crew_socials",
  {
    memberId: uuid("member_id")
      .notNull()
      .references(() => crewMembers.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    platform: socialPlatformEnum("platform").notNull(),
    url: text("url").notNull(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.position] })],
);

/* ─────────────────────────── proyek ───────────────────────── */

/**
 * "Selected Work" di halaman Work — satu baris per kartu di kipas
 * `CaseGrid.tsx`.
 *
 * Namanya `work_projects` dan bukan `projects`: "proyek" adalah kata yang
 * dipakai di mana-mana di perusahaan ini, dan tabel bernama `projects` akan
 * jadi tempat pertama yang orang tebak untuk hal-hal yang sama sekali bukan
 * ini (proyek internal, proyek yang dikerjakan, penagihan). Awalan `work_`
 * menjawab "proyek yang mana" tanpa membuka berkas ini: yang dipajang di
 * halaman Work.
 *
 * ⚠️ Ini BUKAN "Case Study". Di halaman yang sama ada entitas lain
 * (`case_studies`, di bawah) yang membahas satu pekerjaan panjang lebar. Yang
 * ini daftar; yang itu cerita.
 */
export const workProjects = pgTable(
  "work_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    /** Nama klien, dicetak di baris kecil di atas judul. */
    client: text("client").notNull().default(""),
    /**
     * Tahun sebagai TEKS, bukan `integer`.
     *
     * Ia tidak pernah dihitung, diurutkan, atau dibandingkan — cuma dicetak
     * apa adanya di sebelah nama klien. Kolom angka hanya akan melarang bentuk
     * yang sah dibaca orang, misalnya "2023–2024" untuk pekerjaan yang
     * melewati pergantian tahun.
     */
    year: text("year").notNull().default(""),
    /** `set null` dan bukan `cascade`, sama seperti tabel lain: menghapus
     *  sebuah gambar tidak boleh ikut menghapus proyeknya. Bedanya dengan crew,
     *  proyek yang tayang WAJIB punya gambar (lihat `validateWorkProject.ts`) —
     *  kolomnya boleh kosong hanya supaya draf bisa disimpan setengah jalan. */
    photoId: uuid("photo_id").references(() => images.id, {
      onDelete: "set null",
    }),
    /** Satu baris hasil di kaki kartu, misalnya "67% faster turnaround".
     *  Boleh kosong — situs menggerbangi barisnya berikut garis pemisahnya. */
    outcome: text("outcome").notNull().default(""),
    state: workProjectStateEnum("state").notNull().default("draft"),
    /**
     * Urutan kartu di kipas, dari depan ke belakang.
     *
     * Bukan kenyamanan: kartu pertama adalah yang terbuka saat halaman dibuka,
     * dan urutan yang sama dipakai putaran otomatis lima detik sekali serta
     * deretan titik di bawahnya. Postgres tidak menjanjikan urutan baris apa
     * pun tanpa `ORDER BY`.
     */
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    /**
     * Judul unik HANYA untuk baris hidup — alasan yang sama dengan
     * `jobs_slug_alive`.
     *
     * Uniknya dipakai `CaseGrid.tsx` sebagai `key` React di LIMA tempat
     * (kartu kipas, panel isi yang beranimasi, deretan titik, dan dua lagi di
     * tumpukan versi ponsel). Dua proyek berjudul sama membuat React memakai
     * ulang node yang salah; yang terlihat bukan error, melainkan kartu yang
     * gambarnya milik proyek lain saat kipasnya berputar.
     */
    uniqueIndex("work_projects_title_alive")
      .on(t.title)
      .where(sql`${t.deletedAt} is null`),
    index("work_projects_order").on(t.sortOrder),
  ],
);

/**
 * Label kecil di bawah judul kartu ("Web Platform", "Next.js", …).
 *
 * Tabel anak dengan `position` eksplisit, sama seperti `job_skills`: urutan
 * labelnya terlihat di kartu, dan Postgres tidak menjanjikan urutan baris apa
 * pun tanpa `ORDER BY`.
 */
export const workProjectTags = pgTable(
  "work_project_tags",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => workProjects.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    label: text("label").notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.position] })],
);

/* ───────────────────────── case study ─────────────────────── */

/**
 * "Case Studies" di halaman Work — satu baris per cerita di
 * `CaseStudySpotlight.tsx`.
 *
 * Tetangga `work_projects`, di halaman yang sama, dan sengaja TIDAK disatukan
 * dengannya. Keduanya memang punya judul, klien, tahun, dan satu baris hasil,
 * tapi yang satu adalah baris dalam daftar dan yang satu lagi bacaan: kutipan
 * pembuka, beberapa paragraf uraian, dan lingkup pekerjaan. Satu tabel gabungan
 * berarti setengah kolomnya selalu kosong pada separuh barisnya, dan form yang
 * memaksa editor menebak isian mana yang berlaku untuk benda yang sedang dia
 * tulis.
 */
export const caseStudies = pgTable(
  "case_studies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    /** Nama klien. Muncul dua kali di situs: baris meta di atas gambar, dan
     *  kolom "Client" di kaki cerita. */
    client: text("client").notNull().default(""),
    /** Tahun sebagai TEKS, bukan `integer` — alasan lengkapnya sudah ditulis
     *  di `work_projects` di atas. */
    year: text("year").notNull().default(""),
    /** Sektor klien, misalnya "Public Sector". */
    industry: text("industry").notNull().default(""),
    /** Satu baris hasil, dicetak tebal di atas gambar. Berbeda dengan
     *  `work_projects.outcome`, yang ini wajib untuk cerita yang tayang —
     *  lihat `validateCaseStudy.ts`. */
    outcome: text("outcome").notNull().default(""),
    /** Kalimat pembuka di dalam tanda kutip. Kutipan MASALAHNYA, bukan pujian
     *  klien; testimoni bernama tinggal di halaman Services. */
    quote: text("quote").notNull().default(""),
    /**
     * Isi cerita — BEBERAPA PARAGRAF dalam satu kolom, dipisah baris kosong.
     *
     * Bukan tabel anak seperti `work_project_tags`, dan itu keputusan sadar:
     * paragraf tidak pernah diurutkan ulang, ditambah satu per satu, atau
     * dibaca terpisah dari tetangganya — ia satu tulisan yang kebetulan
     * punya jeda. Yang menjaga bentuknya `normalizeDesc()` di
     * `shared/validateCaseStudy.ts`, dipakai form dan server sekaligus.
     */
    desc: text("desc").notNull().default(""),
    /** `set null` dan bukan `cascade`, sama seperti tabel lain. Cerita yang
     *  tayang WAJIB punya gambar (gambarnya sekaligus tombol pembuka); kolomnya
     *  boleh kosong hanya supaya draf bisa disimpan setengah jalan. */
    photoId: uuid("photo_id").references(() => images.id, {
      onDelete: "set null",
    }),
    state: caseStudyStateEnum("state").notNull().default("draft"),
    /** Urutan blok di halaman, dari atas ke bawah. Tidak sedramatis kipas
     *  proyek — semua blok terlihat sekaligus — tapi tetap urutan baca, dan
     *  Postgres tidak menjanjikan urutan apa pun tanpa `ORDER BY`. */
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    /** Judul unik HANYA untuk baris hidup — alasan yang sama dengan
     *  `work_projects_title_alive`, dan pemakainya juga sama: judul inilah
     *  `key` React tiap blok (`key={s.title}`). */
    uniqueIndex("case_studies_title_alive")
      .on(t.title)
      .where(sql`${t.deletedAt} is null`),
    index("case_studies_order").on(t.sortOrder),
  ],
);

/**
 * Lingkup pekerjaan — label kecil di kaki cerita ("Web Platform", "Staff
 * Training", …).
 *
 * Tabel anak dengan `position` eksplisit, sama seperti `work_project_tags`:
 * urutan labelnya terlihat, dan Postgres tidak menjanjikan urutan baris apa pun
 * tanpa `ORDER BY`.
 */
export const caseStudyScopes = pgTable(
  "case_study_scopes",
  {
    studyId: uuid("study_id")
      .notNull()
      .references(() => caseStudies.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    label: text("label").notNull(),
  },
  (t) => [primaryKey({ columns: [t.studyId, t.position] })],
);

/* ───────────────────────── testimoni ──────────────────────── */

/* ─────────────────────────── layanan ──────────────────────── */

/**
 * Daftar layanan di halaman Services — satu baris per judul yang lewat di
 * sabuk teks 3D `ServicesTicker.tsx`.
 *
 * Baris yang sama tayang DUA KALI dalam bentuk berbeda: sebagai judul
 * oversized di sabuk (yang `aria-hidden`, jadi tidak terbaca mesin apa pun),
 * dan sebagai satu `<li>` di daftar `sr-only` di bawahnya. Yang kedua itulah
 * satu-satunya halaman Services yang sampai ke pembaca layar dan mesin
 * pencari — sebabnya `desc` wajib untuk baris yang tayang, lihat
 * `shared/validateService.ts`.
 *
 * TIDAK ADA kolom nomor, dan itu bukan kelupaan. Kode lama menyimpan "01"–"09"
 * di sebelah judulnya, tapi nomor itu tidak pernah dicetak ke layar — ia cuma
 * jadi `key` React. Menyimpannya berarti dua sumber kebenaran untuk satu hal
 * (nomor dan `sort_order`) yang pasti melenceng begitu editor memindahkan satu
 * baris. Kalau suatu hari nomornya memang mau ditampilkan, ia diturunkan dari
 * posisi baris, bukan diketik ulang.
 */
export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    /** Satu kalimat penjelas, khusus daftar `sr-only`. Boleh kosong hanya
     *  supaya draf bisa disimpan setengah jalan. */
    desc: text("desc").notNull().default(""),
    state: serviceStateEnum("state").notNull().default("draft"),
    /**
     * Urutan layanan di sabuk, searah putaran.
     *
     * Bukan kenyamanan: sabuknya melingkar tanpa awal yang terlihat, tapi
     * daftar `sr-only` dibaca lurus dari atas ke bawah — jadi urutan inilah
     * yang didengar pemakai pembaca layar, dan yang dibaca mesin pencari.
     * Postgres tidak menjanjikan urutan baris apa pun tanpa `ORDER BY`.
     */
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    /** Judul unik HANYA untuk baris hidup — alasan yang sama dengan
     *  `jobs_slug_alive`. Judulnya dipakai sebagai `key` React di dua tempat
     *  (item sabuk dan `<li>` sr-only) sejak nomornya tidak lagi disimpan. */
    uniqueIndex("services_title_alive")
      .on(t.title)
      .where(sql`${t.deletedAt} is null`),
    index("services_order").on(t.sortOrder),
  ],
);

/**
 * Rincian sebuah layanan ("Jenna.ai", "Knowledge Assistants", …).
 *
 * Tabel anak dengan `position` eksplisit, sama seperti `work_project_tags`:
 * rinciannya dirangkai berurutan ke dalam satu baris `sr-only`, dan Postgres
 * tidak menjanjikan urutan baris apa pun tanpa `ORDER BY`.
 */
export const serviceSubs = pgTable(
  "service_subs",
  {
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    label: text("label").notNull(),
  },
  (t) => [primaryKey({ columns: [t.serviceId, t.position] })],
);

/**
 * Kutipan klien di dasar halaman Services — satu baris per kutipan di
 * `TestimonialSpotlight.tsx`.
 *
 * ⚠️ JANGAN disatukan dengan `case_studies.quote`. Keduanya sama-sama kalimat
 * di dalam tanda kutip, dan di situlah kemiripannya berhenti: yang di case
 * study adalah kutipan MASALAH kliennya, kalimat pembuka cerita tanpa nama
 * siapa pun; yang di sini pujian bernama dan berjabatan yang butuh izin orang
 * sungguhan sebelum terpublish. Menyatukannya berarti satu tabel yang separuh
 * barisnya selalu tanpa nama.
 *
 * TIDAK ADA kolom foto, dan itu bukan kelupaan. Situs menggambar ikon orang
 * abu-abu (`UserRound`) untuk SEMUA testimoni — tidak ada satu pun `<img>` di
 * komponennya. Kolom foto di sini akan tersimpan rapi lalu tidak pernah
 * dirender, persis jebakan yang dijelaskan panjang lebar di `crew_members`
 * soal kolom urutan. Kalau suatu hari wajah klien memang mau ditampilkan,
 * yang diubah lebih dulu adalah situsnya.
 */
export const testimonials = pgTable(
  "testimonials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Kalimat kutipannya, tanpa tanda kutip — situs yang menambahkannya. */
    quote: text("quote").notNull().default(""),
    name: text("name").notNull(),
    /** Jabatan berikut tempatnya, satu baris. */
    role: text("role").notNull().default(""),
    state: testimonialStateEnum("state").notNull().default("draft"),
    /**
     * Urutan putaran kutipan.
     *
     * Yang paling atas BUKAN sekadar yang pertama di daftar: ia satu-satunya
     * yang terlihat saat halaman dibuka, karena sisanya baru muncul kalau
     * pengunjung menekan panah. Postgres tidak menjanjikan urutan baris apa
     * pun tanpa `ORDER BY`.
     */
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    /**
     * Nama unik HANYA untuk baris hidup — alasan yang sama dengan
     * `crew_members_name_alive`, dan pemakainya juga sama: nama inilah `key`
     * React tiap entri di sizer tak terlihat (`key={e.name}`). Dua testimoni
     * atas nama orang yang sama membuat React memakai ulang node yang salah,
     * dan yang terlihat bukan error melainkan tinggi blok yang salah ukur.
     *
     * Klien yang sama memberi testimoni kedua adalah kejadian yang wajar —
     * yang lama diubah, atau namanya dibedakan dengan konteksnya.
     */
    uniqueIndex("testimonials_name_alive")
      .on(t.name)
      .where(sql`${t.deletedAt} is null`),
    index("testimonials_order").on(t.sortOrder),
  ],
);

/* ─────────────────────────── industri ─────────────────────── */

/**
 * Sektor industri — strip "Built Across Sectors" di halaman depan.
 *
 * Satu baris = satu lempeng (plank) di tumpukan spiral 3D
 * `IndustriesStack.tsx`, sekaligus satu `<li>` di daftar `sr-only` di
 * bawahnya. Tumpukannya `aria-hidden`, jadi daftar itulah satu-satunya bentuk
 * strip ini yang sampai ke pembaca layar dan mesin pencari — sebabnya `desc`
 * wajib untuk baris yang tayang (lihat `shared/validateIndustry.ts`).
 *
 * ‼️ TABEL DENGAN BATAS JUMLAH, satu-satunya di CMS ini: maksimal
 * `MAX_LIVE_INDUSTRIES` (13) baris boleh `live` bersamaan. Alasannya geometri
 * dan ditulis lengkap di `shared/industry.ts`; ringkasnya, framing kamera dan
 * animasi plank-ke-kartu-fokus dikalibrasi untuk busur sepanjang 13 plank, dan
 * plank ke-14 memanjat keluar bingkai.
 *
 * Batas itu SENGAJA tidak dipaksakan lewat `check` seperti baris tunggal di
 * `vision`. Bedanya nyata: "cuma boleh satu" bisa ditulis sebagai aturan satu
 * baris, sedangkan "paling banyak 13 baris hidup" butuh menghitung baris lain
 * — di Postgres itu berarti trigger, dan sebuah trigger yang menolak simpan
 * akan sampai ke editor sebagai galat database mentah tanpa kalimat yang bisa
 * dibaca. Penjaganya ada di `routes/industries.ts`, yang menjawab 422 berikut
 * kalimat penjelas.
 *
 * TIDAK ADA kolom nomor — "01"–"13" yang tercetak di HUD, navigasi sentuh, dan
 * kepala kartu fokus diturunkan dari posisi baris, dengan alasan yang sama
 * persis seperti `services`.
 *
 * TIDAK ADA kolom teks alternatif foto, dan itu juga bukan kelupaan. Data lama
 * menyimpannya untuk ketiga belas sektor, tapi tidak ada satu pun `<img>` di
 * sini yang bisa memakainya: fotonya tekstur WebGL di dalam pembungkus
 * `aria-hidden`. Kolomnya akan tersimpan rapi lalu tidak pernah dibaca siapa
 * pun, sekaligus meminta editor menulis kalimat yang tidak sampai ke telinga
 * mana pun.
 */
export const industries = pgTable(
  "industries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** Satu kalimat penjelas, tampil di HUD hover, di badan kartu fokus, dan
     *  di daftar `sr-only`. Boleh kosong hanya supaya draf bisa disimpan
     *  setengah jalan. */
    desc: text("desc").notNull().default(""),
    tier: industryTierEnum("tier").notNull().default("also"),
    /** `set null` dan bukan `cascade`, sama seperti tabel lain: menghapus
     *  sebuah gambar tidak boleh ikut menghapus sektornya. Sektor yang tayang
     *  WAJIB punya foto (lihat `validateIndustry.ts`) — kolomnya boleh kosong
     *  hanya supaya draf bisa disimpan setengah jalan. */
    photoId: uuid("photo_id").references(() => images.id, {
      onDelete: "set null",
    }),
    state: industryStateEnum("state").notNull().default("draft"),
    /**
     * Urutan sektor di tumpukan, dari puncak ke dasar.
     *
     * Bukan kenyamanan panel: urutan ini menentukan DUA hal yang tayang
     * sekaligus — anak tangga spiral mana yang ditempati sebuah sektor, dan
     * nomor "01"–"13" yang tercetak di tiga tempat. Postgres tidak menjanjikan
     * urutan baris apa pun tanpa `ORDER BY`.
     */
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    /**
     * Nama unik HANYA untuk baris hidup — alasan yang sama dengan
     * `jobs_slug_alive`.
     *
     * Bedanya dengan `services_title_alive`: di sini nama BUKAN `key` React
     * (plank-nya berkunci `id`), jadi yang dijaga bukan React melainkan
     * orangnya. Dua plank bernama "Healthcare" tidak bisa dibedakan pengunjung
     * di navigasi sentuh, dan tidak bisa dibedakan editor di daftar panel.
     */
    uniqueIndex("industries_name_alive")
      .on(t.name)
      .where(sql`${t.deletedAt} is null`),
    index("industries_order").on(t.sortOrder),
  ],
);

/* ────────────────────────── deployment ────────────────────── */

/**
 * Deployment — kartu di strip "Built for real-world environments where
 * decisions matter." di halaman depan, tepat di bawah hero.
 *
 * Satu baris = satu `<article>` di grid `Deployments.tsx`. Tidak ada halaman
 * sendiri dan tidak ada slug: kartunya tidak bisa diklik, ia berhenti di situ.
 *
 * TIDAK ADA batas jumlah seperti `industries`. Bedanya nyata dan bukan
 * kelalaian: batas 13 di sana lahir dari geometri tumpukan 3D, sedangkan yang
 * ini `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` yang tinggal menambah baris
 * ke bawah. Kartu ke-empat belas tidak merusak apa pun.
 *
 * TIDAK ADA kolom nomor — "01"–"05" yang tercetak di baris meta tiap kartu
 * diturunkan dari posisi baris, dengan alasan yang sama persis seperti
 * `services` dan `industries`.
 *
 * ADA kolom `photo_id`, dan itu perbaikan bug diam-diam sekaligus. Sebelum
 * CMS, foto kartu dicari lewat peta `SECTOR_IMAGE` di `DeploymentCard.tsx`
 * yang BERKUNCI NAMA SEKTOR. Peta seperti itu masih bisa hidup selama kelima
 * namanya ditulis developer di berkas yang sama; begitu namanya bisa diketik
 * editor, mengganti "Hospitality" jadi "Hotels & Resorts" akan menjatuhkan
 * kartunya diam-diam ke foto Public Services tanpa satu pun error.
 */
export const deployments = pgTable(
  "deployments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Judul kartu (`<h3>`). Contoh: "Public Services". */
    sector: text("sector").notNull(),
    /** Wilayah, tercetak sebaris dengan nomornya: "03 · International". Boleh
     *  kosong hanya supaya draf bisa disimpan setengah jalan. */
    region: text("region").notNull().default(""),
    /** Satu-dua kalimat isi kartu. Boleh kosong hanya untuk draf. */
    desc: text("desc").notNull().default(""),
    /** `set null` dan bukan `cascade`, sama seperti tabel lain: menghapus
     *  sebuah gambar tidak boleh ikut menghapus kartunya. Kartu yang tayang
     *  WAJIB punya foto (lihat `validateDeployment.ts`). */
    photoId: uuid("photo_id").references(() => images.id, {
      onDelete: "set null",
    }),
    state: deploymentStateEnum("state").notNull().default("draft"),
    /**
     * Urutan kartu di grid, dibaca kiri ke kanan lalu turun.
     *
     * Bukan kenyamanan panel: grid CSS merender persis urutan larik yang
     * dioperkan, dan urutan itu sekaligus menentukan nomor "01"–"05" yang
     * tercetak di tiap kartu. Postgres tidak menjanjikan urutan baris apa pun
     * tanpa `ORDER BY`.
     */
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    /**
     * Yang unik PASANGANNYA, bukan sektornya — satu-satunya indeks unik
     * dua-kolom di CMS ini, dan bedanya dengan `industries_name_alive`
     * disengaja.
     *
     * Di sana nama sektor memang identitas: dua plank "Healthcare" tidak bisa
     * dibedakan pengunjung maupun editor. Di sini kartunya membawa wilayah di
     * baris pertamanya, jadi "Logistics · Indonesia" dan "Logistics ·
     * International" terbaca sebagai dua sistem yang berbeda — karena memang
     * begitu. Menolak yang kedua berarti memaksa editor mengarang nama sektor
     * palsu supaya bisa mencatat kenyataan.
     *
     * Yang tetap dijaga adalah kartu yang benar-benar kembar: sektor DAN
     * wilayah sama persis. Itu tidak pernah disengaja, dan hasilnya dua kartu
     * identik bersebelahan di grid yang sama.
     *
     * Hanya untuk baris hidup — alasan yang sama dengan `jobs_slug_alive` —
     * DAN hanya untuk baris yang wilayahnya sudah terisi.
     *
     * Syarat kedua itu bukan kelonggaran, melainkan supaya indeks ini menjaga
     * persis hal yang perlu dijaga dan tidak sekalian mengarang aturan lain.
     * Wilayah kosong tidak mungkin tayang (`validateDeployment` mewajibkannya
     * untuk `live`), jadi baris berwilayah kosong SELALU draf — dan dua draf
     * yang sama-sama baru diketik sektornya bukan "kartu kembar", mereka belum
     * kartu apa pun. Tanpa `region <> ''` di sini, editor yang menyiapkan dua
     * kartu Logistics sekaligus akan ditolak database dengan 500, karena
     * penjaga di `routes/deployments.ts` memang sengaja melewatkan pasangan
     * yang separuhnya kosong. Dua penjaga yang tidak sepakat lebih buruk
     * daripada satu penjaga yang longgar.
     */
    uniqueIndex("deployments_sector_region_alive")
      .on(t.sector, t.region)
      .where(sql`${t.deletedAt} is null and ${t.region} <> ''`),
    index("deployments_order").on(t.sortOrder),
  ],
);

/* ───────────────────────── cara kerja ─────────────────────── */

/**
 * Langkah "Cara kerja" — kartu putih di seksi "How We Work" halaman depan.
 *
 * Satu baris = satu kartu yang ditembus "tali" SVG yang menjalar mengikuti
 * scroll di `Process.tsx`. Tidak ada halaman sendiri dan tidak ada slug:
 * kartunya tidak bisa diklik.
 *
 * ‼️ ADA batas jumlah: enam langkah tayang, `MAX_LIVE_PROCESS_STEPS` di
 * `shared/processStep.ts`. Sama seperti batas 13 di `industries`, batasnya
 * TIDAK bisa ditulis sebagai `check` — ia aturan tingkat daftar, sementara
 * `check` cuma melihat satu baris. Penjaganya `routes/processSteps.ts`, yang
 * menjawab 422 berikut kalimat penjelas.
 *
 * Watak batasnya beda dengan `industries`, dan bedanya perlu diingat kalau
 * suatu hari angkanya digugat: 13 di sana lahir dari geometri (plank ke-14
 * memanjat keluar bingkai kamera), sedangkan tali di sini digambar ulang dari
 * posisi kartu hasil ukur dan akan melayani tujuh kartu dengan rapi. Yang
 * dijaga enam adalah panjang halaman — enam slot `min-h-[55svh]` plus landasan
 * ekor `45svh` sudah membuat seksi ini bagian terpanjang di halaman depan.
 *
 * TIDAK ADA kolom nomor — "01"–"06" yang tercetak di pojok tiap kartu
 * diturunkan dari posisi baris, dengan alasan yang sama persis seperti
 * `services`, `industries`, dan `deployments`.
 *
 * TIDAK ADA `photo_id`, dan ini satu-satunya tabel konten bergambar yang
 * begitu: "gambar"-nya `glyph` di bawah — SVG beranimasi dalam kode, bukan
 * berkas yang bisa diunggah.
 */
export const processSteps = pgTable(
  "process_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Judul langkah (`<h3>`). Contoh: "Discovery". */
    title: text("title").notNull(),
    /** Satu kata di atas judul, dicetak KAPITAL oranye renggang oleh situs.
     *  Yang tersimpan apa adanya seperti diketik editor — yang mengapitalkan
     *  CSS, bukan data. Boleh kosong hanya supaya draf bisa disimpan setengah
     *  jalan. */
    kicker: text("kicker").notNull().default(""),
    /** Satu-dua kalimat penjelas. Boleh kosong hanya untuk draf. */
    desc: text("desc").notNull().default(""),
    /**
     * Ilustrasi kepala kartu.
     *
     * Disimpan sebagai kolom, dan itu perbaikan bug diam-diam sekaligus.
     * Sebelum CMS, gambar dipasangkan menurut POSISI larik (`PROCESS_GLYPHS[i]`
     * di `Process.tsx`). Peta seperti itu masih bisa hidup selama keenam
     * urutannya ditulis developer di berkas yang sama; begitu editor boleh
     * menghapus atau memindahkan langkah, "Design" naik satu baris dan
     * tiba-tiba bergambar radar — tanpa seorang pun mengubah gambar apa pun,
     * dan tanpa satu pun galat. Persis bug `SECTOR_IMAGE` di `deployments`,
     * dengan posisi sebagai kunci alih-alih nama.
     *
     * Defaultnya `discovery` supaya migrasi punya nilai; yang menentukan
     * pilihan sungguhannya form, dan di sana ia wajib dipilih.
     */
    glyph: processGlyphEnum("glyph").notNull().default("discovery"),
    state: processStepStateEnum("state").notNull().default("draft"),
    /**
     * Urutan langkah, dari atas ke bawah.
     *
     * Bukan kenyamanan panel, dan bukan pula sekadar tata letak seperti di
     * tabel lain: ini ALUR KERJA. "Discovery" sebelum "Design" sebelum
     * "Deployment" adalah isi yang disampaikan seksi ini; urutan yang keliru
     * bukan kartu yang salah tempat melainkan kalimat yang salah.
     *
     * Ia menentukan tiga hal tayang sekaligus — posisi kartu di sepanjang
     * tali, nomor "01"–"06" di pojoknya, dan sisi kiri/kanan berselang-seling
     * yang membuat talinya terbaca zig-zag. Postgres tidak menjanjikan urutan
     * baris apa pun tanpa `ORDER BY`.
     */
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    /**
     * Judul unik HANYA untuk baris hidup — alasan yang sama dengan
     * `jobs_slug_alive`.
     *
     * Yang dijaga di sini orangnya, bukan React (kartunya berkunci `id`): dua
     * baris "Design" di panel tidak bisa dibedakan editor saat mengurutkan
     * atau menghapus, dan enam langkah yang harus dibaca berurutan justru
     * paling gampang tertukar.
     *
     * Ilustrasi SENGAJA tidak ikut dijaga unik, padahal jumlahnya kebetulan
     * persis sama dengan batas langkah. Menegakkannya akan membuat aksi paling
     * lumrah — menukar gambar dua langkah — mustahil dilakukan tanpa lebih
     * dulu memarkir salah satunya di gambar ketiga.
     */
    uniqueIndex("process_steps_title_alive")
      .on(t.title)
      .where(sql`${t.deletedAt} is null`),
    index("process_steps_order").on(t.sortOrder),
  ],
);

/* ──────────────────────────── visi ────────────────────────── */

/**
 * Visi — paragraf penutup halaman depan, tepat sebelum bagian kontak.
 *
 * ‼️ TABEL SATU BARIS, dan itu dipaksakan di database lewat `check` di bawah,
 * bukan sekadar disepakati di kode. Ini satu-satunya tabel konten yang begitu.
 *
 * Kenapa dipaksakan dan tidak dipercayakan ke repo: kalau baris kedua pernah
 * lolos masuk, `getVision()` akan memilih salah satunya secara acak antar
 * query — halaman depan lalu berganti-ganti kalimat tiap kali dipublish,
 * tanpa satu pun galat yang bisa dilacak. `check` membuat keadaan itu mustahil
 * ada, bukan sekadar tidak diharapkan.
 *
 * Tiga kolom yang ada di SEMUA tabel konten lain sengaja tidak ada di sini.
 * Alasan lengkapnya di `shared/vision.ts`; ringkasnya:
 *
 * - **`state`** — draft pada entitas tunggal berarti seksinya hilang dari
 *   halaman depan, dan seksi inilah satu-satunya yang menjatah celah 80px
 *   antara plank Industries (tanpa `pb`) dan Contact (`pt-0`) di mobile.
 * - **`sortOrder`** — tidak ada yang bisa diurutkan terhadap apa pun.
 * - **`deletedAt`** — visi tidak bisa dihapus, cuma diganti kalimatnya. Tanpa
 *   tombol hapus, kolomnya tidak akan pernah terisi; kolom yang selalu `null`
 *   cuma memberi kesan ada jalur hapus yang sebenarnya tidak ada.
 *
 * `publishedAt` TETAP ada: badge "belum terpublish" bekerja dari perbandingan cap
 * waktu dan tidak peduli entitasnya tunggal atau daftar.
 */
export const vision = pgTable(
  "vision",
  {
    /**
     * Selalu 1. Bukan `uuid` seperti tabel lain, dan bukan gaya yang tidak
     * konsisten: id acak pada tabel satu baris membuat "baris yang mana"
     * berubah tiap kali database dibangun ulang, sehingga repo terpaksa
     * mencarinya lewat `limit 1` alih-alih menyebutnya. Angka tetap membuat
     * baris itu bisa DISEBUT — `where id = 1` — dan itulah yang memungkinkan
     * upsert satu perintah tanpa membaca dulu.
     */
    id: integer("id").primaryKey().default(1),
    /** Kalimat visinya. Boleh kosong HANYA di tingkat database, supaya seed
     *  dan migrasi tidak butuh nilai; yang menjaga isinya `validateVision.ts`,
     *  dan di sana ia wajib. */
    statement: text("statement").notNull().default(""),
    /** `set null` dan bukan `cascade`, sama seperti di `jobs` dan
     *  `people_values`: menghapus sebuah gambar tidak boleh ikut menghapus
     *  satu-satunya baris visi — yang tersisa nanti bukan foto yang hilang,
     *  melainkan seluruh seksinya. */
    photoId: uuid("photo_id").references(() => images.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    /* Inilah yang membuat tabel ini tidak akan pernah punya baris kedua —
       termasuk lewat `psql` langsung, di mana kode server tidak ikut campur. */
    check("vision_satu_baris", sql`${t.id} = 1`),
  ],
);

/* ──────────────────────── kaki halaman ────────────────────── */

/**
 * Isi kaki halaman — surel, alamat, baris hak cipta.
 *
 * ‼️ TABEL SATU BARIS, dipaksakan lewat `check` seperti `vision`. Yang kedua
 * dan sejauh ini yang terakhir. Alasan tekniknya identik: kalau baris kedua
 * pernah lolos masuk, `getFooter()` akan memilih salah satunya secara acak
 * antar query dan alamat kantor berganti-ganti tiap publish tanpa satu pun
 * galat yang bisa dilacak.
 *
 * Alasan KONSEPTUALNYA berbeda dan lebih sederhana daripada visi: cuma ada
 * satu kaki halaman di situs ini. `SiteFooter.tsx` sengaja dipakai bersama
 * bagian Contact di keempat halaman DAN halaman detail lowongan, supaya alamat
 * kantor yang pindah tidak punya dua tempat untuk diperbarui — tabel berdaftar
 * di sini akan mengembalikan persis masalah itu lewat pintu belakang.
 *
 * Tiga kolom yang ada di tabel konten berdaftar sengaja tidak ada, sama
 * seperti `vision`: `state` (kaki halaman tidak punya keadaan draft — ia ikut
 * setiap halaman), `sortOrder` (tidak ada yang bisa diurutkan terhadap apa
 * pun), dan `deletedAt` (tidak ada tombol hapus, jadi kolomnya akan selalu
 * `null` dan cuma memberi kesan ada jalur hapus yang tidak ada).
 */
export const footer = pgTable(
  "footer",
  {
    /** Selalu 1, alasan lengkapnya di `vision.id`: angka tetap membuat
     *  barisnya bisa DISEBUT (`where id = 1`), dan itu yang memungkinkan
     *  upsert satu perintah tanpa membaca dulu. */
    id: integer("id").primaryKey().default(1),
    /** Alamat surel saja, tanpa `mailto:` — situs yang menambahkannya. */
    email: text("email").notNull().default(""),
    /** Alamat kantor, satu baris. */
    address: text("address").notNull().default(""),
    /**
     * Baris hak cipta TANPA tahun dan TANPA lambang ©.
     *
     * Situs mencetak `© {new Date().getFullYear()}` di depannya saat render.
     * Menyimpan tahunnya di sini berarti kaki halaman jadi salah tiap 1
     * Januari sampai ada yang ingat menyuntingnya — dan tidak ada yang
     * memberitahu siapa pun. `validateFooter.ts` yang menolaknya di depan.
     */
    copyright: text("copyright").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [check("footer_satu_baris", sql`${t.id} = 1`)],
);

/**
 * Tautan sosial di kaki halaman — satu baris per tautan.
 *
 * Tabel anak dengan `position` eksplisit, pola yang sama dengan
 * `service_subs`: urutannya URUTAN TAMPIL dari kiri ke kanan, dan Postgres
 * tidak menjanjikan urutan baris apa pun tanpa `ORDER BY`. Ditulis
 * hapus-lalu-sisip di dalam satu transaksi, sama seperti `crew_socials`.
 *
 * ⚠️ BUKAN salinan `crew_socials`, meski namanya bersaudara. Yang di sana
 * memakai `socialPlatformEnum` karena situs yang menentukan tulisan dan
 * ikonnya; yang di sini `label` teks bebas karena kaki halaman mencetaknya apa
 * adanya. Menyatukan keduanya berarti kanal baru (TikTok, YouTube) butuh
 * migrasi database sebelum editor bisa menambahkannya.
 *
 * ‼️ Daftar ini SATU-SATUNYA daftar sosial situs: menu HP di navbar
 * membacanya juga (`src/data/footer.ts`). Dulu ia literal di
 * `src/data/socials.ts` yang dipakai bersama kedua komponen, dan sifat itu
 * dipertahankan justru supaya keduanya tidak bisa berbeda.
 */
export const footerSocials = pgTable(
  "footer_socials",
  {
    footerId: integer("footer_id")
      .notNull()
      .references(() => footer.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    /** Yang tercetak, misalnya "Instagram". */
    label: text("label").notNull(),
    /** Alamat lengkapnya berikut `https://` — dijaga `validateFooter.ts`,
     *  karena tautan tanpa skema mendarat di 404 cogniti.id sendiri. */
    href: text("href").notNull(),
  },
  (t) => [primaryKey({ columns: [t.footerId, t.position] })],
);

/* ──────────────────────── akun & sesi ─────────────────────── */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Disimpan huruf kecil semua; login menormalkan input sebelum mencari,
   *  supaya "Budi@..." dan "budi@..." bukan dua akun berbeda. */
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sessions_user").on(t.userId)],
);

/* ────────────────────────── audit log ─────────────────────── */

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** `set null`, bukan `cascade`: menghapus akun tidak boleh menghapus jejak
     *  apa yang pernah dia ubah. Itu justru saat catatannya paling dibutuhkan. */
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Nama pelaku disalin apa adanya supaya baris ini tetap terbaca
     *  ("Diubah oleh Budi") meski akunnya sudah tidak ada. */
    userName: text("user_name"),
    entity: text("entity").notNull(),
    entityId: uuid("entity_id"),
    action: text("action").notNull(),
    /**
     * Isi lengkap baris SESUDAH perubahan, dalam bentuk yang dibaca situs.
     *
     * `jsonb` dan bukan tabel berkolom karena bentuk sembilan entitas lain
     * berbeda-beda, dan kolom ini tidak pernah di-join — hanya ditampilkan.
     */
    snapshot: jsonb("snapshot"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_entity").on(t.entity, t.entityId)],
);

/* ───────────────────── relasi (untuk query) ───────────────── */

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  photo: one(images, { fields: [jobs.photoId], references: [images.id] }),
  skills: many(jobSkills),
  copy: many(jobCopy),
  bullets: many(jobCopyBullets),
}));

export const peopleValuesRelations = relations(peopleValues, ({ one }) => ({
  photo: one(images, { fields: [peopleValues.photoId], references: [images.id] }),
}));

export const jobSkillsRelations = relations(jobSkills, ({ one }) => ({
  job: one(jobs, { fields: [jobSkills.jobId], references: [jobs.id] }),
}));

export const jobCopyRelations = relations(jobCopy, ({ one }) => ({
  job: one(jobs, { fields: [jobCopy.jobId], references: [jobs.id] }),
}));

export const jobCopyBulletsRelations = relations(jobCopyBullets, ({ one }) => ({
  job: one(jobs, { fields: [jobCopyBullets.jobId], references: [jobs.id] }),
}));

export const crewMembersRelations = relations(crewMembers, ({ one, many }) => ({
  photo: one(images, { fields: [crewMembers.photoId], references: [images.id] }),
  socials: many(crewSocials),
}));

export const crewSocialsRelations = relations(crewSocials, ({ one }) => ({
  member: one(crewMembers, {
    fields: [crewSocials.memberId],
    references: [crewMembers.id],
  }),
}));

export const workProjectsRelations = relations(
  workProjects,
  ({ one, many }) => ({
    photo: one(images, {
      fields: [workProjects.photoId],
      references: [images.id],
    }),
    tags: many(workProjectTags),
  }),
);

export const workProjectTagsRelations = relations(workProjectTags, ({ one }) => ({
  project: one(workProjects, {
    fields: [workProjectTags.projectId],
    references: [workProjects.id],
  }),
}));

export const caseStudiesRelations = relations(caseStudies, ({ one, many }) => ({
  photo: one(images, {
    fields: [caseStudies.photoId],
    references: [images.id],
  }),
  scopes: many(caseStudyScopes),
}));

export const caseStudyScopesRelations = relations(caseStudyScopes, ({ one }) => ({
  study: one(caseStudies, {
    fields: [caseStudyScopes.studyId],
    references: [caseStudies.id],
  }),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  subs: many(serviceSubs),
}));

export const serviceSubsRelations = relations(serviceSubs, ({ one }) => ({
  service: one(services, {
    fields: [serviceSubs.serviceId],
    references: [services.id],
  }),
}));

export const deploymentsRelations = relations(deployments, ({ one }) => ({
  photo: one(images, { fields: [deployments.photoId], references: [images.id] }),
}));

export const industriesRelations = relations(industries, ({ one }) => ({
  photo: one(images, { fields: [industries.photoId], references: [images.id] }),
}));

export const footerRelations = relations(footer, ({ many }) => ({
  socials: many(footerSocials),
}));

export const footerSocialsRelations = relations(footerSocials, ({ one }) => ({
  footer: one(footer, {
    fields: [footerSocials.footerId],
    references: [footer.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
