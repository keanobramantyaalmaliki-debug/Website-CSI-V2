/**
 * Baca-tulis seksi Visi — SATU-SATUNYA tempat query visi ditulis.
 *
 * Yang paling pendek dari semua repo di sini, dan bukan karena disederhanakan:
 * visi memang satu baris tanpa tabel anak, tanpa keadaan draft/live, dan tanpa
 * urutan. Yang hilang bersamanya ada tiga, semuanya disengaja —
 *
 * - **Tidak ada `createVision`.** Barisnya lahir dari `db:seed` dan sesudah itu
 *   selalu ada. `saveVision()` yang menanganinya lewat upsert, jadi database
 *   yang belum di-seed pun tidak membuat panel gagal menyimpan.
 * - **Tidak ada `softDeleteVision`.** Seksi Visi tidak boleh menghilang:
 *   `pt-20 pb-20` miliknya satu-satunya yang menjatah celah 80px antara plank
 *   Industries (tanpa `pb`) dan Contact (`pt-0`) di mobile. Menghapusnya akan
 *   merusak tata letak halaman depan, bukan sekadar menghilangkan satu blok.
 * - **Tidak ada `reorderVision`.** Tidak ada yang bisa diurutkan.
 *
 * Yang tetap sama dengan repo lain: route tidak menulis SQL, dan `updatedAt`
 * dinaikkan manual supaya badge "belum terpublish" menyala.
 */

import { eq, sql } from "drizzle-orm";
import type { Vision } from "@shared/vision";
import type { VisionInput } from "@shared/validateVision";

import { db } from "./db/client";
import { images, vision } from "./db/schema";

/** Nomor baris satu-satunya. Dijaga juga di tingkat database lewat CHECK
 *  `vision_satu_baris`, jadi baris kedua bukan sesuatu yang bisa lolos lewat
 *  jalur lain (psql, migrasi, skrip) tanpa ditolak. */
const ROW_ID = 1;

/** Sama seperti `Vision`, plus kolom yang hanya berguna di panel admin dan
 *  tidak pernah ikut ke `content.json`. */
export type VisionRecord = Vision & {
  updatedAt: string;
  publishedAt: string | null;
  /** `updatedAt > publishedAt` — inilah yang dihitung badge "belum terpublish". */
  unpublished: boolean;
};

function assemble(row: typeof vision.$inferSelect, photoPath: string | null): VisionRecord {
  const publishedAt = row.publishedAt?.toISOString() ?? null;
  const updatedAt = row.updatedAt.toISOString();

  return {
    statement: row.statement,
    photo: photoPath ?? "",
    updatedAt,
    publishedAt,
    unpublished: publishedAt === null || updatedAt > publishedAt,
  };
}

/* ─────────────────────────── baca ─────────────────────────── */

/**
 * Mengembalikan `null` kalau barisnya belum ada — database yang belum
 * di-seed.
 *
 * Pemanggilnya yang memutuskan apa artinya, dan jawabannya berbeda-beda:
 * publish memperlakukannya sebagai "tidak ada isi CMS" lalu membiarkan situs
 * jatuh ke cadangan bundle, sedangkan panel admin membuka form kosong supaya
 * editor bisa mengisinya untuk pertama kali. Melempar error di sini akan
 * menutup kedua jalan itu.
 */
export async function getVision(): Promise<VisionRecord | null> {
  const [loaded] = await db
    .select({ row: vision, photoPath: images.path })
    .from(vision)
    .leftJoin(images, eq(images.id, vision.photoId))
    .where(eq(vision.id, ROW_ID));

  return loaded ? assemble(loaded.row, loaded.photoPath) : null;
}

/* ─────────────────────────── tulis ────────────────────────── */

/** Path foto → id baris `images`. Sengaja disalin dari `valuesRepo` alih-alih
 *  dipakai bersama, alasan yang sama seperti di sana: keduanya kebetulan sama
 *  HARI INI, dan menyatukan dua fungsi yang kebetulan sama membuat perubahan
 *  untuk salah satunya diam-diam ikut ke yang lain. */
async function resolvePhotoId(path: string): Promise<string | null> {
  const clean = path.trim();
  if (!clean) return null;

  const [found] = await db
    .select({ id: images.id })
    .from(images)
    .where(eq(images.path, clean));
  if (found) return found.id;

  const [created] = await db
    .insert(images)
    .values({ path: clean, source: "static" })
    .returning({ id: images.id });
  return created.id;
}

/**
 * Simpan isi visi. Satu-satunya penulis, dan tidak pernah gagal karena
 * barisnya belum ada.
 *
 * Upsert, bukan "baca dulu lalu insert atau update": dua penyimpanan yang
 * datang bersamaan ke database kosong akan sama-sama membaca "belum ada" lalu
 * sama-sama insert, dan yang kedua menabrak primary key. Dengan
 * `onConflictDoUpdate`, tabrakan itu justru jadi jalur normalnya.
 *
 * Tidak mengembalikan `null` seperti `updateValue`: di sana `null` berarti
 * "baris yang mau diubah tidak ada", dan di sini keadaan itu tidak bisa
 * terjadi — kalau belum ada, dibuat.
 */
export async function saveVision(input: VisionInput): Promise<VisionRecord> {
  const photoId = await resolvePhotoId(input.photo);
  const statement = input.statement.trim();
  const now = new Date();

  await db
    .insert(vision)
    .values({ id: ROW_ID, statement, photoId, updatedAt: now })
    .onConflictDoUpdate({
      target: vision.id,
      set: {
        statement: sql`excluded.statement`,
        photoId: sql`excluded.photo_id`,
        /* WAJIB manual: Postgres tidak menyentuh `default now()` saat UPDATE.
           Lupa baris ini = badge "belum terpublish" tidak pernah menyala. */
        updatedAt: sql`excluded.updated_at`,
      },
    });

  const saved = await getVision();
  if (!saved) throw new Error("Visi tidak terbaca kembali sesudah disimpan");
  return saved;
}
