/**
 * Skema database CMS — lowongan, nilai, dan crew.
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
     *  `updatedAt > publishedAt` = inilah "perubahan belum tayang". */
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

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
