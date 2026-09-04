/**
 * Baca-tulis Judul seksi — SATU-SATUNYA tempat query `section_texts` ditulis.
 *
 * Repo paling sempit di seluruh CMS: hanya `list()` dan `update()`. Yang tidak
 * ada di sini bukan kekurangan, melainkan bentuk entitasnya (lihat
 * `shared/sectionText.ts`) —
 *
 * - **Tidak ada `create`.** Sebelas barisnya lahir dari `db:seed` dan
 *   kuncinya ditutup enum `section_key`; seksi kedua belas berarti komponen
 *   baru di situs, bukan tombol di panel.
 * - **Tidak ada `softDelete`.** Kunci seksi dirujuk langsung oleh komponen.
 *   Baris yang hilang bukan seksi yang hilang, melainkan seksi berkepala
 *   kosong.
 * - **Tidak ada `reorder`.** Urutan seksi milik tata letak halaman.
 *
 * Yang tetap sama dengan repo lain: route tidak menulis SQL, dan `updatedAt`
 * dinaikkan manual supaya badge "belum terpublish" menyala.
 */

import { asc, eq, sql } from "drizzle-orm";
import {
  SECTION_TEXT_KEYS,
  type SectionText,
  type SectionTextKey,
} from "@shared/sectionText";
import {
  normalizeSectionText,
  type SectionTextInput,
} from "@shared/validateSectionText";

import { db } from "./db/client";
import { dbNow } from "./db/now";
import { sectionTexts } from "./db/schema";

/**
 * Sama seperti `SectionText`, plus kolom yang hanya berguna di panel admin dan
 * tidak pernah ikut ke `content.json`.
 *
 * `id` ikut, beda dengan `VisionRecord`: riwayat mencatat perubahan judul
 * per baris lewat `audit_log.entity_id` yang bertipe uuid, dan panel butuh
 * nilai itu untuk menautkan baris riwayat ke formnya.
 */
export type SectionTextRecord = SectionText & {
  id: string;
  updatedAt: string;
  publishedAt: string | null;
  /** `updatedAt > publishedAt` — inilah yang dihitung badge "belum terpublish". */
  unpublished: boolean;
};

function assemble(row: typeof sectionTexts.$inferSelect): SectionTextRecord {
  const publishedAt = row.publishedAt?.toISOString() ?? null;
  const updatedAt = row.updatedAt.toISOString();

  return {
    id: row.id,
    key: row.key,
    heading: row.heading,
    subheading: row.subheading,
    updatedAt,
    publishedAt,
    unpublished: publishedAt === null || updatedAt > publishedAt,
  };
}

/* ─────────────────────────── baca ─────────────────────────── */

/**
 * Semua judul seksi, urut seperti pengunjung menemuinya di situs.
 *
 * Urutannya TIDAK diambil dari database — tidak ada kolom urutan untuk
 * diurutkan, dan `order by key` cuma akan memberi urutan abjad ("careers"
 * duluan). Yang jadi patokan `SECTION_TEXT_KEYS`, satu-satunya tempat urutan
 * seksi ditulis. Baris yang belum ada di database (seed belum lengkap,
 * misalnya sesudah menambah kunci baru) dilewati, bukan dikarang: yang
 * mengurus judul yang belum tersimpan adalah cadangan bundle di situs.
 */
export async function listSectionTexts(): Promise<SectionTextRecord[]> {
  const rows = await db.select().from(sectionTexts).orderBy(asc(sectionTexts.key));
  const perKunci = new Map(rows.map((row) => [row.key, assemble(row)]));

  return SECTION_TEXT_KEYS.map((key) => perKunci.get(key)).filter(
    (row): row is SectionTextRecord => row !== undefined,
  );
}

/** Satu seksi, atau `null` kalau barisnya belum ada di database. */
export async function getSectionText(
  key: SectionTextKey,
): Promise<SectionTextRecord | null> {
  const [row] = await db.select().from(sectionTexts).where(eq(sectionTexts.key, key));
  return row ? assemble(row) : null;
}

/* ─────────────────────────── tulis ────────────────────────── */

/**
 * Simpan judul satu seksi.
 *
 * Upsert dengan alasan yang persis sama seperti `saveVision()`: dua
 * penyimpanan yang datang bersamaan ke tabel yang barisnya belum ada akan
 * sama-sama membaca "belum ada" lalu sama-sama insert, dan yang kedua
 * menabrak unique `key`. Dengan `onConflictDoUpdate`, tabrakan itu justru
 * jadi jalur normalnya — sekaligus membuat panel tetap bisa menyimpan di
 * database yang belum di-seed.
 *
 * Tidak pernah mengembalikan `null`: kalau barisnya belum ada, dibuat.
 */
export async function saveSectionText(
  key: SectionTextKey,
  input: SectionTextInput,
): Promise<SectionTextRecord> {
  const { heading, subheading } = normalizeSectionText(input);
  const now = dbNow();

  await db
    .insert(sectionTexts)
    .values({ key, heading, subheading, updatedAt: now })
    .onConflictDoUpdate({
      target: sectionTexts.key,
      set: {
        heading: sql`excluded.heading`,
        subheading: sql`excluded.subheading`,
        /* WAJIB manual: Postgres tidak menyentuh `default now()` saat UPDATE.
           Lupa baris ini = badge "belum terpublish" tidak pernah menyala. */
        updatedAt: sql`excluded.updated_at`,
      },
    });

  const saved = await getSectionText(key);
  if (!saved) throw new Error(`Judul seksi ${key} tidak terbaca kembali sesudah disimpan`);
  return saved;
}

/**
 * Simpan judul seksi yang ditunjuk uuid-nya, bukan kuncinya.
 *
 * Hanya dipakai `pemulih.ts`. Layar Riwayat memegang `audit_log.entity_id`
 * (uuid baris) dan bukan kunci seksinya, jadi pembatalan datang membawa id.
 *
 * Kuncinya dibaca dari BARIS yang ditunjuk id itu, bukan dari snapshot yang
 * ikut dikirim. Snapshot adalah teks lama yang isinya bisa saja menyebut
 * kunci lain (mis. baris audit dari skema yang lebih tua); membacanya berarti
 * pembatalan judul satu seksi bisa menimpa judul seksi tetangga. Yang di
 * database selalu lebih benar.
 */
export async function updateSectionTextById(
  id: string,
  input: SectionTextInput,
): Promise<SectionTextRecord | null> {
  const [row] = await db
    .select({ key: sectionTexts.key })
    .from(sectionTexts)
    .where(eq(sectionTexts.id, id));
  if (!row) return null;

  return saveSectionText(row.key, input);
}
