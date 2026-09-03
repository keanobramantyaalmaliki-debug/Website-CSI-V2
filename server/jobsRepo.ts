/**
 * Baca-tulis lowongan — SATU-SATUNYA tempat query lowongan ditulis.
 *
 * Satu lowongan tersebar di empat tabel (`jobs`, `job_skills`, `job_copy`,
 * `job_copy_bullets`), dan menyimpan berarti menyentuh keempatnya. Kalau tiap
 * route menyusun query-nya sendiri, cepat atau lambat akan ada jalur yang lupa
 * salah satu tabel, dan lowongan-nya kehilangan skill atau setengah halaman
 * tanpa error apa pun. Route memanggil fungsi di sini, tidak menulis SQL.
 *
 * Semua penulisan dibungkus TRANSAKSI: gagal di tengah = tidak ada yang
 * berubah. Tanpa itu, koneksi yang putus saat menyimpan bisa meninggalkan
 * lowongan yang skill-nya sudah terhapus tapi yang baru belum masuk.
 */

import { and, asc, eq, isNull } from "drizzle-orm";
import type { Job, JobCopy, JobLang } from "@shared/job";
import type { JobInput } from "@shared/validateJob";

import { db, type Db } from "./db/client";

/**
 * Tipe handle di dalam `db.transaction(...)`.
 *
 * Bukan `Db`: transaksi tidak punya `$client` dan tidak boleh dipakai membuka
 * transaksi lagi. Diambil dari tanda tangan `transaction` itu sendiri supaya
 * ikut berubah kalau versi Drizzle-nya naik.
 */
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
import {
  images,
  jobCopy,
  jobCopyBullets,
  jobSkills,
  jobs,
} from "./db/schema";

/** Sama seperti `Job`, plus kolom yang hanya berguna di panel admin dan tidak
 *  pernah ikut ke `content.json`. */
export type JobRecord = Job & {
  updatedAt: string;
  publishedAt: string | null;
  /** `updatedAt > publishedAt` — inilah yang dihitung badge "belum terpublish". */
  unpublished: boolean;
};

const EMPTY_COPY = (): JobCopy => ({
  intro: "",
  responsibilities: [],
  qualifications: [],
});

/* ─────────────────────────── baca ─────────────────────────── */

type Loaded = {
  row: typeof jobs.$inferSelect;
  photoPath: string | null;
};

function assemble(
  loaded: Loaded,
  skills: string[],
  copyRows: (typeof jobCopy.$inferSelect)[],
  bulletRows: (typeof jobCopyBullets.$inferSelect)[],
): JobRecord {
  const { row, photoPath } = loaded;

  /**
   * `detail` sengaja `null` kalau TIDAK ADA satu pun baris `job_copy`.
   *
   * Bukan "objek berisi string kosong": bedanya menentukan tampilan situs —
   * `null` = baris accordion di tempat, ada isi = baris jadi tautan ke halaman
   * sendiri. Lowongan yang belum punya materi halaman harus tetap jadi
   * accordion, bukan tautan ke halaman kosong.
   */
  let detail: Job["detail"] = null;
  if (copyRows.length) {
    const build = (lang: JobLang): JobCopy => {
      const copy = EMPTY_COPY();
      copy.intro = copyRows.find((c) => c.lang === lang)?.intro ?? "";
      for (const b of bulletRows) {
        if (b.lang !== lang) continue;
        if (b.kind === "responsibility") copy.responsibilities.push(b.text);
        else copy.qualifications.push(b.text);
      }
      return copy;
    };
    detail = { en: build("en"), id: build("id") };
  }

  const publishedAt = row.publishedAt?.toISOString() ?? null;
  const updatedAt = row.updatedAt.toISOString();

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    department: row.department,
    state: row.state,
    overview: row.overview,
    photo: photoPath ?? "",
    skills,
    askGithub: row.askGithub,
    sortOrder: row.sortOrder,
    detail,
    updatedAt,
    publishedAt,
    unpublished: publishedAt === null || updatedAt > publishedAt,
  };
}

/**
 * Ambil banyak lowongan sekaligus.
 *
 * Anak-anaknya diambil dalam TIGA query, bukan tiga query PER lowongan: dengan
 * tujuh lowongan bedanya tidak terasa, tapi pola N+1 yang ditanam sekarang akan
 * tetap ada saat sembilan entitas lain menyusul dengan pola yang sama.
 */
export async function listJobs(opts: { includeDrafts: boolean }): Promise<JobRecord[]> {
  const where = opts.includeDrafts
    ? isNull(jobs.deletedAt)
    : and(isNull(jobs.deletedAt), eq(jobs.state, "open"));

  const rows = await db
    .select({ row: jobs, photoPath: images.path })
    .from(jobs)
    .leftJoin(images, eq(images.id, jobs.photoId))
    .where(opts.includeDrafts ? where : isNull(jobs.deletedAt))
    .orderBy(asc(jobs.sortOrder), asc(jobs.title));

  const visible = opts.includeDrafts
    ? rows
    : rows.filter((r) => r.row.state !== "draft");

  if (!visible.length) return [];

  const [skillRows, copyRows, bulletRows] = await Promise.all([
    db.select().from(jobSkills).orderBy(asc(jobSkills.position)),
    db.select().from(jobCopy),
    db.select().from(jobCopyBullets).orderBy(asc(jobCopyBullets.position)),
  ]);

  const byJob = <T extends { jobId: string }>(list: T[], id: string) =>
    list.filter((r) => r.jobId === id);

  return visible.map((loaded) =>
    assemble(
      loaded,
      byJob(skillRows, loaded.row.id).map((s) => s.label),
      byJob(copyRows, loaded.row.id),
      byJob(bulletRows, loaded.row.id),
    ),
  );
}

export async function getJobById(id: string): Promise<JobRecord | null> {
  const [loaded] = await db
    .select({ row: jobs, photoPath: images.path })
    .from(jobs)
    .leftJoin(images, eq(images.id, jobs.photoId))
    .where(and(eq(jobs.id, id), isNull(jobs.deletedAt)));

  if (!loaded) return null;

  const [skillRows, copyRows, bulletRows] = await Promise.all([
    db.select().from(jobSkills).where(eq(jobSkills.jobId, id)).orderBy(asc(jobSkills.position)),
    db.select().from(jobCopy).where(eq(jobCopy.jobId, id)),
    db.select().from(jobCopyBullets).where(eq(jobCopyBullets.jobId, id)).orderBy(asc(jobCopyBullets.position)),
  ]);

  return assemble(loaded, skillRows.map((s) => s.label), copyRows, bulletRows);
}

/* ─────────────────────────── tulis ────────────────────────── */

/** Path foto → id baris `images`. Foto yang belum terdaftar (mis. path lama
 *  yang diketik manual) didaftarkan sebagai `static` alih-alih ditolak. */
async function resolvePhotoId(tx: Tx, path: string): Promise<string | null> {
  const clean = path.trim();
  if (!clean) return null;

  const [found] = await tx
    .select({ id: images.id })
    .from(images)
    .where(eq(images.path, clean));
  if (found) return found.id;

  const [created] = await tx
    .insert(images)
    .values({ path: clean, source: "static" })
    .returning({ id: images.id });
  return created.id;
}

/** Tulis ulang seluruh anak sebuah lowongan: hapus lalu masukkan lagi.
 *
 *  Sengaja tidak mencoba menyelisihkan mana yang berubah — daftarnya pendek
 *  (puluhan baris) dan penulisan-ulang tidak punya kasus tepi. Diff yang
 *  "pintar" untuk daftar terurut adalah sumber bug klasik: satu baris disisipkan
 *  di tengah membuat seluruh `position` sesudahnya bergeser. */
async function writeChildren(tx: Tx, jobId: string, input: JobInput) {
  await tx.delete(jobSkills).where(eq(jobSkills.jobId, jobId));
  await tx.delete(jobCopy).where(eq(jobCopy.jobId, jobId));
  await tx.delete(jobCopyBullets).where(eq(jobCopyBullets.jobId, jobId));

  const skills = input.skills.map((s) => s.trim()).filter(Boolean);
  if (skills.length) {
    await tx.insert(jobSkills).values(
      skills.map((label, position) => ({ jobId, position, label })),
    );
  }

  if (!input.detail) return;

  for (const lang of ["en", "id"] as const) {
    const copy = input.detail[lang];
    await tx.insert(jobCopy).values({ jobId, lang, intro: copy.intro.trim() });

    const bullets = [
      ...copy.responsibilities.map((text, position) => ({
        kind: "responsibility" as const,
        position,
        text: text.trim(),
      })),
      ...copy.qualifications.map((text, position) => ({
        kind: "qualification" as const,
        position,
        text: text.trim(),
      })),
    ].filter((b) => b.text);

    if (bullets.length) {
      await tx.insert(jobCopyBullets).values(
        bullets.map((b) => ({ jobId, lang, ...b })),
      );
    }
  }
}

export async function createJob(input: JobInput): Promise<JobRecord> {
  const id = await db.transaction(async (tx) => {
    const photoId = await resolvePhotoId(tx, input.photo);

    /* Lowongan baru muncul di ATAS daftar. Editor baru saja mengetiknya; kalau
       mendarat di baris ketujuh dia akan mengira simpannya gagal. */
    const [{ min }] = await tx
      .select({ min: jobs.sortOrder })
      .from(jobs)
      .orderBy(asc(jobs.sortOrder))
      .limit(1)
      .then((r) => (r.length ? r : [{ min: 0 }]));

    const [row] = await tx
      .insert(jobs)
      .values({
        slug: input.slug,
        title: input.title.trim(),
        department: input.department.trim(),
        state: input.state,
        overview: input.overview.trim(),
        photoId,
        askGithub: input.askGithub,
        sortOrder: (min ?? 0) - 1,
      })
      .returning({ id: jobs.id });

    await writeChildren(tx, row.id, input);
    return row.id;
  });

  const created = await getJobById(id);
  if (!created) throw new Error("Lowongan baru tidak terbaca kembali");
  return created;
}

export async function updateJob(
  id: string,
  input: JobInput,
): Promise<JobRecord | null> {
  const existing = await getJobById(id);
  if (!existing) return null;

  await db.transaction(async (tx) => {
    const photoId = await resolvePhotoId(tx, input.photo);
    await tx
      .update(jobs)
      .set({
        slug: input.slug,
        title: input.title.trim(),
        department: input.department.trim(),
        state: input.state,
        overview: input.overview.trim(),
        photoId,
        askGithub: input.askGithub,
        /* WAJIB diisi manual — Postgres tidak menyentuh `default now()` saat
           UPDATE, hanya saat INSERT. Lupa baris ini = badge "belum terpublish"
           tidak pernah menyala dan editor mengira perubahannya sudah tayang. */
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id));

    await writeChildren(tx, id, input);
  });

  return getJobById(id);
}

/** Hapus = tandai. Barisnya hilang dari admin dan dari `content.json`, tapi
 *  isinya masih ada di database dan bisa dikembalikan lewat `psql`. */
export async function softDeleteJob(id: string): Promise<JobRecord | null> {
  const existing = await getJobById(id);
  if (!existing) return null;

  await db
    .update(jobs)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(jobs.id, id));

  return existing;
}

/** Apakah slug sudah dipakai lowongan HIDUP yang lain? */
export async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.slug, slug), isNull(jobs.deletedAt)));
  return rows.some((r) => r.id !== exceptId);
}
