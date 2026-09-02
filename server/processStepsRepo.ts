/**
 * Baca-tulis langkah "Cara kerja" — SATU-SATUNYA tempat query langkah ditulis.
 *
 * Bentuknya sesederhana testimoni: satu langkah muat di satu baris, tanpa
 * tabel anak DAN tanpa foto. Ilustrasinya cuma satu kolom enum yang menyebut
 * nama komponen SVG di kode, jadi tidak ada `images` yang perlu diselesaikan
 * dan tidak ada satu pun transaksi lintas tabel di berkas ini kecuali saat
 * menyusun ulang urutan.
 *
 * Aturannya tetap sama seperti repo yang lain — route tidak menulis SQL, dan
 * hapus berarti mengisi `deletedAt`.
 *
 * URUTAN di sini bukan tata letak melainkan ISI: "Discovery" sebelum "Design"
 * sebelum "Deployment" adalah kalimat yang disampaikan seksi ini. Urutan yang
 * tertukar bukan kartu yang salah tempat, melainkan cerita yang salah.
 */

import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import type { ProcessStep } from "@shared/processStep";
import type { ProcessStepInput } from "@shared/validateProcessStep";

import { db } from "./db/client";
import { processSteps } from "./db/schema";

/** Sama seperti `ProcessStep`, plus kolom yang hanya berguna di panel admin dan
 *  tidak pernah ikut ke `content.json`. */
export type ProcessStepRecord = ProcessStep & {
  updatedAt: string;
  publishedAt: string | null;
  /** `updatedAt > publishedAt` — inilah yang dihitung badge "belum tayang". */
  unpublished: boolean;
};

function assemble(row: typeof processSteps.$inferSelect): ProcessStepRecord {
  const publishedAt = row.publishedAt?.toISOString() ?? null;
  const updatedAt = row.updatedAt.toISOString();

  return {
    id: row.id,
    title: row.title,
    kicker: row.kicker,
    desc: row.desc,
    glyph: row.glyph,
    state: row.state,
    sortOrder: row.sortOrder,
    updatedAt,
    publishedAt,
    unpublished: publishedAt === null || updatedAt > publishedAt,
  };
}

/* ─────────────────────────── baca ─────────────────────────── */

/**
 * Urutannya SELALU `sortOrder`, lalu `title` sebagai pemutus seri — alasan yang
 * sama persis dengan entitas berurut lainnya: dua baris ber-`sortOrder` sama
 * akan bertukar tempat secara acak antar query tanpa `ORDER BY` kedua. Di sini
 * akibatnya lebih parah daripada di tempat lain, karena yang bertukar bukan
 * posisi kartu melainkan urutan alur kerja yang dibaca pengunjung.
 */
export async function listProcessSteps(opts: {
  includeDrafts: boolean;
}): Promise<ProcessStepRecord[]> {
  const rows = await db
    .select()
    .from(processSteps)
    .where(isNull(processSteps.deletedAt))
    .orderBy(asc(processSteps.sortOrder), asc(processSteps.title));

  const visible = opts.includeDrafts
    ? rows
    : rows.filter((r) => r.state === "live");

  return visible.map(assemble);
}

export async function getProcessStepById(
  id: string,
): Promise<ProcessStepRecord | null> {
  const [row] = await db
    .select()
    .from(processSteps)
    .where(and(eq(processSteps.id, id), isNull(processSteps.deletedAt)));

  return row ? assemble(row) : null;
}

/* ─────────────────────────── tulis ────────────────────────── */

export async function createProcessStep(
  input: ProcessStepInput,
): Promise<ProcessStepRecord> {
  /* Langkah baru mendarat di BAWAH, dan di entitas ini itu kebetulan juga
     tempat yang paling sering benar: alur kerja tumbuh di ujungnya, bukan di
     depan. Kalau memang harus disisipkan di tengah, tombol "Naikkan" ada di
     sebelahnya. */
  const [{ tertinggi }] = await db
    .select({ tertinggi: max(processSteps.sortOrder) })
    .from(processSteps)
    .where(isNull(processSteps.deletedAt));

  const [row] = await db
    .insert(processSteps)
    .values({
      title: input.title.trim(),
      kicker: input.kicker.trim(),
      desc: input.desc.trim(),
      glyph: input.glyph,
      state: input.state,
      sortOrder: (tertinggi ?? -1) + 1,
    })
    .returning({ id: processSteps.id });

  const created = await getProcessStepById(row.id);
  if (!created) throw new Error("Langkah baru tidak terbaca kembali");
  return created;
}

export async function updateProcessStep(
  id: string,
  input: ProcessStepInput,
): Promise<ProcessStepRecord | null> {
  const existing = await getProcessStepById(id);
  if (!existing) return null;

  await db
    .update(processSteps)
    .set({
      title: input.title.trim(),
      kicker: input.kicker.trim(),
      desc: input.desc.trim(),
      glyph: input.glyph,
      state: input.state,
      /* WAJIB manual: Postgres tidak menyentuh `default now()` saat UPDATE.
         Lupa baris ini = badge "belum tayang" tidak pernah menyala. */
      updatedAt: new Date(),
    })
    .where(eq(processSteps.id, id));

  return getProcessStepById(id);
}

/** Hapus = tandai. Isinya masih ada di database dan bisa dikembalikan lewat
 *  `psql`; yang hilang cuma barisnya dari panel dan dari `content.json`. */
export async function softDeleteProcessStep(
  id: string,
): Promise<ProcessStepRecord | null> {
  const existing = await getProcessStepById(id);
  if (!existing) return null;

  await db
    .update(processSteps)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(processSteps.id, id));

  return existing;
}

/**
 * Susun ulang urutan langkah.
 *
 * Menerima SELURUH daftar id dalam urutan barunya, bukan "pindahkan id X ke
 * posisi N" — alasannya sama dengan entitas berurut yang lain: perintah
 * relatif dijalankan terhadap urutan yang mungkin sudah bukan urutan yang
 * dilihat pengirimnya, sedangkan daftar penuh menyatakan hasil akhir yang dia
 * maksud.
 *
 * `updatedAt` ikut dinaikkan: urutan adalah konten yang tayang, jadi
 * memindahkan langkah adalah perubahan yang menunggu Publish seperti yang lain.
 */
export async function reorderProcessSteps(
  ids: string[],
): Promise<ProcessStepRecord[] | null> {
  if (ids.length === 0) return null;
  if (new Set(ids).size !== ids.length) return null;

  const alive = await db
    .select({ id: processSteps.id })
    .from(processSteps)
    .where(and(isNull(processSteps.deletedAt), inArray(processSteps.id, ids)));

  /* Daftar yang tidak menyebut SEMUA baris hidup ditolak bulat-bulat — yang
     tidak disebut akan tertinggal di `sortOrder` lamanya dan bertabrakan
     dengan yang baru. */
  const semua = await db
    .select({ id: processSteps.id })
    .from(processSteps)
    .where(isNull(processSteps.deletedAt));

  if (alive.length !== ids.length || semua.length !== ids.length) return null;

  const now = new Date();
  await db.transaction(async (tx) => {
    for (const [position, id] of ids.entries()) {
      await tx
        .update(processSteps)
        .set({ sortOrder: position, updatedAt: now })
        .where(eq(processSteps.id, id));
    }
  });

  return listProcessSteps({ includeDrafts: true });
}

/** Apakah judul sudah dipakai langkah HIDUP yang lain? Dibandingkan tanpa
 *  membedakan huruf besar-kecil: "Design" dan "design" adalah dua judul yang
 *  sama bagi pembaca, dan indeks unik di database tidak tahu itu. */
export async function processStepTitleTaken(
  title: string,
  exceptId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: processSteps.id, title: processSteps.title })
    .from(processSteps)
    .where(isNull(processSteps.deletedAt));

  const target = title.trim().toLowerCase();
  return rows.some(
    (r) => r.id !== exceptId && r.title.trim().toLowerCase() === target,
  );
}

/**
 * Berapa langkah yang sedang `live`?
 *
 * Kembaran `countLiveIndustries`, dan ada untuk alasan yang sama: batas
 * `MAX_LIVE_PROCESS_STEPS` (lihat `shared/processStep.ts`) adalah aturan
 * tingkat daftar yang tidak bisa dilihat pemeriksa per-baris. Yang memakainya
 * `routes/processSteps.ts` sebelum menyimpan baris yang statusnya `live`.
 *
 * `exceptId` bukan hiasan: saat sebuah langkah yang SUDAH `live` disunting,
 * dirinya sendiri ikut terhitung, dan penyuntingan yang tidak menambah apa pun
 * akan ditolak dengan alasan "sudah 6" — padahal jumlahnya tidak berubah.
 */
export async function countLiveProcessSteps(
  exceptId?: string,
): Promise<number> {
  const rows = await db
    .select({ id: processSteps.id })
    .from(processSteps)
    .where(and(isNull(processSteps.deletedAt), eq(processSteps.state, "live")));

  return rows.filter((r) => r.id !== exceptId).length;
}
