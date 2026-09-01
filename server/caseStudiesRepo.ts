/**
 * Baca-tulis cerita "Case Studies" — SATU-SATUNYA tempat query case study
 * ditulis.
 *
 * Bentuknya kembar dengan `workProjectsRepo.ts` di sebelahnya: satu cerita
 * tersebar di dua tabel (`case_studies` + `case_study_scopes`), jadi menyimpan
 * butuh transaksi; dan urutannya bisa diubah editor, jadi ada
 * `reorderCaseStudies`.
 *
 * Kembar, tapi tetap terpisah — dengan alasan yang sudah ditulis di skema:
 * yang satu daftar kartu, yang satu bacaan, dan menyatukan dua benda yang
 * kebetulan mirip hari ini membuat perubahan untuk salah satunya diam-diam ikut
 * ke yang lain.
 *
 * Aturan yang sama dengan repo tetangganya: route tidak menulis SQL, dan hapus
 * berarti mengisi `deletedAt`.
 */

import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import type { CaseStudy } from "@shared/caseStudy";
import type { CaseStudyInput } from "@shared/validateCaseStudy";
import { normalizeDesc } from "@shared/validateCaseStudy";

import { db, type Db } from "./db/client";
import { caseStudies, caseStudyScopes, images } from "./db/schema";

/** Handle di dalam `db.transaction(...)` — lihat catatan tipe yang sama di
 *  `jobsRepo.ts`. */
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Sama seperti `CaseStudy`, plus kolom yang hanya berguna di panel admin dan
 *  tidak pernah ikut ke `content.json`. */
export type CaseStudyRecord = CaseStudy & {
  updatedAt: string;
  publishedAt: string | null;
  /** `updatedAt > publishedAt` — inilah yang dihitung badge "belum tayang". */
  unpublished: boolean;
};

/* ─────────────────────────── baca ─────────────────────────── */

type Loaded = {
  row: typeof caseStudies.$inferSelect;
  photoPath: string | null;
};

function assemble(
  { row, photoPath }: Loaded,
  scopeRows: (typeof caseStudyScopes.$inferSelect)[],
): CaseStudyRecord {
  const publishedAt = row.publishedAt?.toISOString() ?? null;
  const updatedAt = row.updatedAt.toISOString();

  return {
    id: row.id,
    title: row.title,
    client: row.client,
    year: row.year,
    industry: row.industry,
    scope: scopeRows.map((s) => s.label),
    outcome: row.outcome,
    quote: row.quote,
    desc: row.desc,
    /* String kosong, bukan `null` — sama seperti repo tetangganya, supaya situs
       dan form admin tidak menjaga dua bentuk "tidak ada gambar" yang berbeda.
       Kosong cuma mungkin pada draf: cerita yang `live` wajib punya gambar,
       karena gambarnyalah tombol pembuka ceritanya. */
    image: photoPath ?? "",
    state: row.state,
    sortOrder: row.sortOrder,
    updatedAt,
    publishedAt,
    unpublished: publishedAt === null || updatedAt > publishedAt,
  };
}

/**
 * Urutannya SELALU `sortOrder`, lalu `title` sebagai pemutus seri — dua baris
 * ber-`sortOrder` sama akan bertukar tempat secara acak antar query tanpa
 * `ORDER BY` kedua, dan blok di halaman Work ikut bertukar tiap kali dipublish.
 */
export async function listCaseStudies(opts: {
  includeDrafts: boolean;
}): Promise<CaseStudyRecord[]> {
  const rows = await db
    .select({ row: caseStudies, photoPath: images.path })
    .from(caseStudies)
    .leftJoin(images, eq(images.id, caseStudies.photoId))
    .where(isNull(caseStudies.deletedAt))
    .orderBy(asc(caseStudies.sortOrder), asc(caseStudies.title));

  const visible = opts.includeDrafts
    ? rows
    : rows.filter((r) => r.row.state === "live");

  if (!visible.length) return [];

  /* Satu query untuk SEMUA label, lalu dikelompokkan di memori — bentuk N+1
     dihindari dengan alasan yang sama seperti label proyek. */
  const scopeRows = await db
    .select()
    .from(caseStudyScopes)
    .orderBy(asc(caseStudyScopes.position));

  return visible.map((loaded) =>
    assemble(
      loaded,
      scopeRows.filter((s) => s.studyId === loaded.row.id),
    ),
  );
}

export async function getCaseStudyById(
  id: string,
): Promise<CaseStudyRecord | null> {
  const [loaded] = await db
    .select({ row: caseStudies, photoPath: images.path })
    .from(caseStudies)
    .leftJoin(images, eq(images.id, caseStudies.photoId))
    .where(and(eq(caseStudies.id, id), isNull(caseStudies.deletedAt)));

  if (!loaded) return null;

  const scopeRows = await db
    .select()
    .from(caseStudyScopes)
    .where(eq(caseStudyScopes.studyId, id))
    .orderBy(asc(caseStudyScopes.position));

  return assemble(loaded, scopeRows);
}

/* ─────────────────────────── tulis ────────────────────────── */

/** Path gambar → id baris `images`. Disalin dari repo tetangga dengan alasan
 *  yang sudah ditulis di sana: kelimanya kebetulan sama HARI INI, dan
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

/** Tulis ulang seluruh label lingkup: hapus lalu masukkan lagi. Alasan sama
 *  dengan `writeTags` di `workProjectsRepo` — daftarnya paling panjang enam
 *  baris, dan diff "pintar" untuk daftar terurut adalah sumber bug klasik. */
async function writeScopes(tx: Tx, studyId: string, scope: string[]) {
  await tx.delete(caseStudyScopes).where(eq(caseStudyScopes.studyId, studyId));

  const bersih = scope.map((s) => s.trim()).filter((s) => s.length > 0);
  if (!bersih.length) return;

  await tx.insert(caseStudyScopes).values(
    bersih.map((label, position) => ({ studyId, position, label })),
  );
}

export async function createCaseStudy(
  input: CaseStudyInput,
): Promise<CaseStudyRecord> {
  const id = await db.transaction(async (tx) => {
    const photoId = await resolvePhotoId(tx, input.image);

    /* Cerita baru mendarat di BELAKANG, sama seperti proyek: menyisipkannya di
       depan akan mengganti bacaan pembuka seksi tanpa ada yang memintanya. */
    const [{ tertinggi }] = await tx
      .select({ tertinggi: max(caseStudies.sortOrder) })
      .from(caseStudies)
      .where(isNull(caseStudies.deletedAt));

    const [row] = await tx
      .insert(caseStudies)
      .values({
        title: input.title.trim(),
        client: input.client.trim(),
        year: input.year.trim(),
        industry: input.industry.trim(),
        outcome: input.outcome.trim(),
        quote: input.quote.trim(),
        /* Dirapikan SEKALI di sini, dengan fungsi yang sama yang dipakai
           validasi, supaya yang tersimpan persis yang divalidasi — dan supaya
           situs boleh percaya `split("\\n\\n")` apa adanya. */
        desc: normalizeDesc(input.desc),
        photoId,
        state: input.state,
        sortOrder: (tertinggi ?? -1) + 1,
      })
      .returning({ id: caseStudies.id });

    await writeScopes(tx, row.id, input.scope);
    return row.id;
  });

  const created = await getCaseStudyById(id);
  if (!created) throw new Error("Case study baru tidak terbaca kembali");
  return created;
}

export async function updateCaseStudy(
  id: string,
  input: CaseStudyInput,
): Promise<CaseStudyRecord | null> {
  const existing = await getCaseStudyById(id);
  if (!existing) return null;

  await db.transaction(async (tx) => {
    const photoId = await resolvePhotoId(tx, input.image);

    await tx
      .update(caseStudies)
      .set({
        title: input.title.trim(),
        client: input.client.trim(),
        year: input.year.trim(),
        industry: input.industry.trim(),
        outcome: input.outcome.trim(),
        quote: input.quote.trim(),
        desc: normalizeDesc(input.desc),
        photoId,
        state: input.state,
        /* WAJIB manual: Postgres tidak menyentuh `default now()` saat UPDATE.
           Lupa baris ini = badge "belum tayang" tidak pernah menyala. */
        updatedAt: new Date(),
      })
      .where(eq(caseStudies.id, id));

    await writeScopes(tx, id, input.scope);
  });

  return getCaseStudyById(id);
}

/** Hapus = tandai. Isinya masih ada di database dan bisa dikembalikan lewat
 *  `psql`; yang hilang cuma barisnya dari panel dan dari `content.json`. */
export async function softDeleteCaseStudy(
  id: string,
): Promise<CaseStudyRecord | null> {
  const existing = await getCaseStudyById(id);
  if (!existing) return null;

  await db
    .update(caseStudies)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(caseStudies.id, id));

  return existing;
}

/**
 * Susun ulang urutan blok.
 *
 * Menerima SELURUH daftar id dalam urutan barunya, bukan "pindahkan id X ke
 * posisi N" — alasan lengkapnya sudah ditulis di `reorderValues`: perintah
 * relatif dijalankan terhadap urutan yang mungkin sudah bukan urutan yang
 * dilihat pengirimnya.
 *
 * `updatedAt` ikut dinaikkan: urutan adalah konten yang tayang, jadi
 * memindahkan cerita adalah perubahan yang menunggu Publish seperti yang lain.
 */
export async function reorderCaseStudies(
  ids: string[],
): Promise<CaseStudyRecord[] | null> {
  if (ids.length === 0) return null;
  if (new Set(ids).size !== ids.length) return null;

  const alive = await db
    .select({ id: caseStudies.id })
    .from(caseStudies)
    .where(and(isNull(caseStudies.deletedAt), inArray(caseStudies.id, ids)));

  /* Daftar yang tidak menyebut SEMUA baris hidup ditolak bulat-bulat — lihat
     alasannya di `reorderValues`. */
  const semua = await db
    .select({ id: caseStudies.id })
    .from(caseStudies)
    .where(isNull(caseStudies.deletedAt));

  if (alive.length !== ids.length || semua.length !== ids.length) return null;

  const now = new Date();
  await db.transaction(async (tx) => {
    for (const [position, id] of ids.entries()) {
      await tx
        .update(caseStudies)
        .set({ sortOrder: position, updatedAt: now })
        .where(eq(caseStudies.id, id));
    }
  });

  return listCaseStudies({ includeDrafts: true });
}

/**
 * Apakah judul sudah dipakai cerita HIDUP yang lain?
 *
 * Dibandingkan tanpa membedakan huruf besar-kecil dan tanpa spasi berlebih,
 * sama seperti judul proyek. Tanpa pemeriksaan ini editor akan menerima 500
 * dari Postgres (indeks `case_studies_title_alive`) alih-alih kalimat yang bisa
 * dia perbaiki.
 */
export async function caseStudyTitleTaken(
  title: string,
  exceptId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: caseStudies.id, title: caseStudies.title })
    .from(caseStudies)
    .where(isNull(caseStudies.deletedAt));

  const target = title.trim().toLowerCase();
  return rows.some(
    (r) => r.id !== exceptId && r.title.trim().toLowerCase() === target,
  );
}
