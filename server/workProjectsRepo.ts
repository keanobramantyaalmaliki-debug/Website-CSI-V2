/**
 * Baca-tulis proyek "Selected Work" — SATU-SATUNYA tempat query proyek
 * ditulis.
 *
 * Bentuknya gabungan dua repo tetangga: satu proyek tersebar di dua tabel
 * (`work_projects` + `work_project_tags`) seperti crew, jadi menyimpan butuh
 * transaksi; dan urutannya bisa diubah editor seperti nilai, jadi ada
 * `reorderWorkProjects`.
 *
 * Urutan di sini lebih terasa daripada di nilai: kartu pertama adalah yang
 * terbuka saat halaman dibuka, dan urutan yang sama dipakai putaran otomatis
 * serta deretan titik di bawah kipas.
 *
 * Aturan yang sama dengan repo tetangganya: route tidak menulis SQL, dan hapus
 * berarti mengisi `deletedAt`.
 */

import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import type { WorkProject } from "@shared/workProject";
import type { WorkProjectInput } from "@shared/validateWorkProject";

import { db, type Db } from "./db/client";
import { dbNow } from "./db/now";
import { images, workProjects, workProjectTags } from "./db/schema";

/** Handle di dalam `db.transaction(...)` — lihat catatan tipe yang sama di
 *  `jobsRepo.ts`. */
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Sama seperti `WorkProject`, plus kolom yang hanya berguna di panel admin dan
 *  tidak pernah ikut ke `content.json`. */
export type WorkProjectRecord = WorkProject & {
  updatedAt: string;
  publishedAt: string | null;
  /** `updatedAt > publishedAt` — inilah yang dihitung badge "belum terpublish". */
  unpublished: boolean;
};

/* ─────────────────────────── baca ─────────────────────────── */

type Loaded = {
  row: typeof workProjects.$inferSelect;
  photoPath: string | null;
};

function assemble(
  { row, photoPath }: Loaded,
  tagRows: (typeof workProjectTags.$inferSelect)[],
): WorkProjectRecord {
  const publishedAt = row.publishedAt?.toISOString() ?? null;
  const updatedAt = row.updatedAt.toISOString();

  return {
    id: row.id,
    title: row.title,
    client: row.client,
    year: row.year,
    tags: tagRows.map((t) => t.label),
    /* String kosong, bukan `null`, dengan alasan yang sama seperti di
       `crewRepo`: `WorkProject.image` selalu string supaya situs dan form
       admin tidak menjaga dua bentuk "tidak ada gambar" yang berbeda. Bedanya,
       di sini string kosong cuma mungkin pada draf — proyek yang `live` wajib
       punya gambar. */
    image: photoPath ?? "",
    outcome: row.outcome,
    state: row.state,
    sortOrder: row.sortOrder,
    updatedAt,
    publishedAt,
    unpublished: publishedAt === null || updatedAt > publishedAt,
  };
}

/**
 * Urutannya SELALU `sortOrder`, lalu `title` sebagai pemutus seri — sama
 * seperti nilai, dan bukan hiasan: dua baris ber-`sortOrder` sama akan
 * bertukar tempat secara acak antar query tanpa `ORDER BY` kedua, dan kipas di
 * situs ikut bertukar tiap kali dipublish.
 */
export async function listWorkProjects(opts: {
  includeDrafts: boolean;
}): Promise<WorkProjectRecord[]> {
  const rows = await db
    .select({ row: workProjects, photoPath: images.path })
    .from(workProjects)
    .leftJoin(images, eq(images.id, workProjects.photoId))
    .where(isNull(workProjects.deletedAt))
    .orderBy(asc(workProjects.sortOrder), asc(workProjects.title));

  const visible = opts.includeDrafts
    ? rows
    : rows.filter((r) => r.row.state === "live");

  if (!visible.length) return [];

  /* Satu query untuk SEMUA label, lalu dikelompokkan di memori — bentuk N+1
     dihindari dengan alasan yang sama seperti tautan sosial di `crewRepo`. */
  const tagRows = await db
    .select()
    .from(workProjectTags)
    .orderBy(asc(workProjectTags.position));

  return visible.map((loaded) =>
    assemble(
      loaded,
      tagRows.filter((t) => t.projectId === loaded.row.id),
    ),
  );
}

export async function getWorkProjectById(
  id: string,
): Promise<WorkProjectRecord | null> {
  const [loaded] = await db
    .select({ row: workProjects, photoPath: images.path })
    .from(workProjects)
    .leftJoin(images, eq(images.id, workProjects.photoId))
    .where(and(eq(workProjects.id, id), isNull(workProjects.deletedAt)));

  if (!loaded) return null;

  const tagRows = await db
    .select()
    .from(workProjectTags)
    .where(eq(workProjectTags.projectId, id))
    .orderBy(asc(workProjectTags.position));

  return assemble(loaded, tagRows);
}

/* ─────────────────────────── tulis ────────────────────────── */

/** Path gambar → id baris `images`. Disalin dari repo tetangga dengan alasan
 *  yang sudah ditulis di sana: keempatnya kebetulan sama HARI INI, dan
 *  menyatukan fungsi yang kebetulan sama membuat perubahan untuk salah satunya
 *  diam-diam ikut ke yang lain. */
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

/** Tulis ulang seluruh label: hapus lalu masukkan lagi. Alasan sama dengan
 *  `writeSocials` di `crewRepo` — daftarnya paling panjang enam baris, dan
 *  diff "pintar" untuk daftar terurut adalah sumber bug klasik. */
async function writeTags(tx: Tx, projectId: string, tags: string[]) {
  await tx.delete(workProjectTags).where(eq(workProjectTags.projectId, projectId));

  const bersih = tags.map((t) => t.trim()).filter((t) => t.length > 0);
  if (!bersih.length) return;

  await tx.insert(workProjectTags).values(
    bersih.map((label, position) => ({ projectId, position, label })),
  );
}

export async function createWorkProject(
  input: WorkProjectInput,
): Promise<WorkProjectRecord> {
  const id = await db.transaction(async (tx) => {
    const photoId = await resolvePhotoId(tx, input.image);

    /**
     * Proyek baru mendarat di BELAKANG, sama seperti nilai dan dengan alasan
     * yang lebih kuat: kartu pertama adalah yang terbuka saat halaman Work
     * dibuka. Menyisipkan proyek baru di depan akan mengganti kartu pembuka
     * halaman tanpa ada yang memintanya. Kalau memang harus di depan, tombol
     * "Naikkan" ada di sebelahnya.
     */
    const [{ tertinggi }] = await tx
      .select({ tertinggi: max(workProjects.sortOrder) })
      .from(workProjects)
      .where(isNull(workProjects.deletedAt));

    const [row] = await tx
      .insert(workProjects)
      .values({
        title: input.title.trim(),
        client: input.client.trim(),
        year: input.year.trim(),
        outcome: input.outcome.trim(),
        photoId,
        state: input.state,
        sortOrder: (tertinggi ?? -1) + 1,
      })
      .returning({ id: workProjects.id });

    await writeTags(tx, row.id, input.tags);
    return row.id;
  });

  const created = await getWorkProjectById(id);
  if (!created) throw new Error("Proyek baru tidak terbaca kembali");
  return created;
}

export async function updateWorkProject(
  id: string,
  input: WorkProjectInput,
): Promise<WorkProjectRecord | null> {
  const existing = await getWorkProjectById(id);
  if (!existing) return null;

  await db.transaction(async (tx) => {
    const photoId = await resolvePhotoId(tx, input.image);

    await tx
      .update(workProjects)
      .set({
        title: input.title.trim(),
        client: input.client.trim(),
        year: input.year.trim(),
        outcome: input.outcome.trim(),
        photoId,
        state: input.state,
        /* WAJIB manual: Postgres tidak menyentuh `default now()` saat UPDATE.
           Lupa baris ini = badge "belum terpublish" tidak pernah menyala. */
        updatedAt: dbNow(),
      })
      .where(eq(workProjects.id, id));

    await writeTags(tx, id, input.tags);
  });

  return getWorkProjectById(id);
}

/** Hapus = tandai. Isinya masih ada di database dan bisa dikembalikan lewat
 *  `psql`; yang hilang cuma barisnya dari panel dan dari `content.json`. */
export async function softDeleteWorkProject(
  id: string,
): Promise<WorkProjectRecord | null> {
  const existing = await getWorkProjectById(id);
  if (!existing) return null;

  await db
    .update(workProjects)
    .set({ deletedAt: dbNow(), updatedAt: dbNow() })
    .where(eq(workProjects.id, id));

  return existing;
}

/**
 * Susun ulang urutan kartu.
 *
 * Menerima SELURUH daftar id dalam urutan barunya, bukan "pindahkan id X ke
 * posisi N" — alasan lengkapnya sudah ditulis di `reorderValues`: perintah
 * relatif dijalankan terhadap urutan yang mungkin sudah bukan urutan yang
 * dilihat pengirimnya.
 *
 * `updatedAt` ikut dinaikkan: urutan adalah konten yang tayang, jadi
 * memindahkan kartu adalah perubahan yang menunggu Publish seperti yang lain.
 */
export async function reorderWorkProjects(
  ids: string[],
): Promise<WorkProjectRecord[] | null> {
  if (ids.length === 0) return null;
  if (new Set(ids).size !== ids.length) return null;

  const alive = await db
    .select({ id: workProjects.id })
    .from(workProjects)
    .where(and(isNull(workProjects.deletedAt), inArray(workProjects.id, ids)));

  /* Daftar yang tidak menyebut SEMUA baris hidup ditolak bulat-bulat — lihat
     alasannya di `reorderValues`. */
  const semua = await db
    .select({ id: workProjects.id, sortOrder: workProjects.sortOrder })
    .from(workProjects)
    .where(isNull(workProjects.deletedAt));

  if (alive.length !== ids.length || semua.length !== ids.length) return null;

  /* Yang dinaikkan `updatedAt`-nya HANYA baris yang posisinya benar-benar
     bergeser. Panel mengirim SELURUH daftar id tiap kali panah ditekan, jadi
     menyetel cap waktu ke semuanya membuat satu ketukan panah terbaca sebagai
     "5 perubahan belum terpublish" padahal yang pindah cuma dua. Angka di bar
     publish adalah satu-satunya isyarat bahwa ada yang perlu ditayangkan;
     angka yang rutin melebih-lebihkan berhenti dibaca, dan editor lalu
     melewatkan perubahan yang sungguhan.

     Keadaan akhir tabelnya sama persis dengan versi yang menulis semua baris:
     yang dilewati memang sudah memegang `sortOrder` yang dituju. */
  const posisiSekarang = new Map(semua.map((r) => [r.id, r.sortOrder]));
  const bergeser = [...ids.entries()].filter(
    ([position, id]) => posisiSekarang.get(id) !== position,
  );

  if (bergeser.length > 0) {
    const now = dbNow();
    await db.transaction(async (tx) => {
      for (const [position, id] of bergeser) {
        await tx
          .update(workProjects)
          .set({ sortOrder: position, updatedAt: now })
          .where(eq(workProjects.id, id));
      }
    });
  }

  return listWorkProjects({ includeDrafts: true });
}

/**
 * Apakah judul sudah dipakai proyek HIDUP yang lain?
 *
 * Dibandingkan tanpa membedakan huruf besar-kecil dan tanpa spasi berlebih,
 * sama seperti nama crew. Tanpa pemeriksaan ini editor akan menerima 500 dari
 * Postgres (indeks `work_projects_title_alive`) alih-alih kalimat yang bisa
 * dia perbaiki.
 */
export async function workProjectTitleTaken(
  title: string,
  exceptId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: workProjects.id, title: workProjects.title })
    .from(workProjects)
    .where(isNull(workProjects.deletedAt));

  const target = title.trim().toLowerCase();
  return rows.some(
    (r) => r.id !== exceptId && r.title.trim().toLowerCase() === target,
  );
}
