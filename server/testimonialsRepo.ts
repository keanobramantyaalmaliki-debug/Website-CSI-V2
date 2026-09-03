/**
 * Baca-tulis testimoni — SATU-SATUNYA tempat query testimoni ditulis.
 *
 * Bentuknya paling sederhana dari semua entitas CMS sejauh ini: satu testimoni
 * muat di satu baris, tanpa tabel anak DAN tanpa foto. Tidak ada `images` yang
 * perlu diselesaikan, jadi tidak ada satu pun transaksi lintas tabel di
 * berkas ini kecuali saat menyusun ulang urutan.
 *
 * Aturannya tetap sama seperti repo yang lain — route tidak menulis SQL, dan
 * hapus berarti mengisi `deletedAt`.
 *
 * URUTAN di sini adalah konten yang paling langsung terasa: yang ber-`sortOrder`
 * terkecil adalah kutipan yang TERLIHAT saat halaman Services dibuka. Sisanya
 * baru muncul kalau pengunjung menekan panah.
 */

import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import type { Testimonial } from "@shared/testimonial";
import type { TestimonialInput } from "@shared/validateTestimonial";

import { db } from "./db/client";
import { testimonials } from "./db/schema";

/** Sama seperti `Testimonial`, plus kolom yang hanya berguna di panel admin dan
 *  tidak pernah ikut ke `content.json`. */
export type TestimonialRecord = Testimonial & {
  updatedAt: string;
  publishedAt: string | null;
  /** `updatedAt > publishedAt` — inilah yang dihitung badge "belum terpublish". */
  unpublished: boolean;
};

function assemble(row: typeof testimonials.$inferSelect): TestimonialRecord {
  const publishedAt = row.publishedAt?.toISOString() ?? null;
  const updatedAt = row.updatedAt.toISOString();

  return {
    id: row.id,
    quote: row.quote,
    name: row.name,
    role: row.role,
    state: row.state,
    sortOrder: row.sortOrder,
    updatedAt,
    publishedAt,
    unpublished: publishedAt === null || updatedAt > publishedAt,
  };
}

/* ─────────────────────────── baca ─────────────────────────── */

/**
 * Urutannya SELALU `sortOrder`, lalu `name` sebagai pemutus seri — alasan yang
 * sama persis dengan nilai: dua baris ber-`sortOrder` sama akan bertukar tempat
 * secara acak antar query tanpa `ORDER BY` kedua, dan kutipan pembuka halaman
 * ikut bertukar tiap kali dipublish.
 */
export async function listTestimonials(opts: {
  includeDrafts: boolean;
}): Promise<TestimonialRecord[]> {
  const rows = await db
    .select()
    .from(testimonials)
    .where(isNull(testimonials.deletedAt))
    .orderBy(asc(testimonials.sortOrder), asc(testimonials.name));

  const visible = opts.includeDrafts
    ? rows
    : rows.filter((r) => r.state === "live");

  return visible.map(assemble);
}

export async function getTestimonialById(
  id: string,
): Promise<TestimonialRecord | null> {
  const [row] = await db
    .select()
    .from(testimonials)
    .where(and(eq(testimonials.id, id), isNull(testimonials.deletedAt)));

  return row ? assemble(row) : null;
}

/* ─────────────────────────── tulis ────────────────────────── */

export async function createTestimonial(
  input: TestimonialInput,
): Promise<TestimonialRecord> {
  /* Testimoni baru mendarat di BAWAH, sama seperti nilai: kutipan pertama
     adalah yang membuka halaman, dan menyisipkan testimoni baru di depannya
     mengganti kesan pertama halaman Services tanpa ada yang memintanya.
     Kalau memang harus di depan, tombol "Naikkan" ada di sebelahnya. */
  const [{ tertinggi }] = await db
    .select({ tertinggi: max(testimonials.sortOrder) })
    .from(testimonials)
    .where(isNull(testimonials.deletedAt));

  const [row] = await db
    .insert(testimonials)
    .values({
      quote: input.quote.trim(),
      name: input.name.trim(),
      role: input.role.trim(),
      state: input.state,
      sortOrder: (tertinggi ?? -1) + 1,
    })
    .returning({ id: testimonials.id });

  const created = await getTestimonialById(row.id);
  if (!created) throw new Error("Testimoni baru tidak terbaca kembali");
  return created;
}

export async function updateTestimonial(
  id: string,
  input: TestimonialInput,
): Promise<TestimonialRecord | null> {
  const existing = await getTestimonialById(id);
  if (!existing) return null;

  await db
    .update(testimonials)
    .set({
      quote: input.quote.trim(),
      name: input.name.trim(),
      role: input.role.trim(),
      state: input.state,
      /* WAJIB manual: Postgres tidak menyentuh `default now()` saat UPDATE.
         Lupa baris ini = badge "belum terpublish" tidak pernah menyala. */
      updatedAt: new Date(),
    })
    .where(eq(testimonials.id, id));

  return getTestimonialById(id);
}

/** Hapus = tandai. Isinya masih ada di database dan bisa dikembalikan lewat
 *  `psql`; yang hilang cuma barisnya dari panel dan dari `content.json`. */
export async function softDeleteTestimonial(
  id: string,
): Promise<TestimonialRecord | null> {
  const existing = await getTestimonialById(id);
  if (!existing) return null;

  await db
    .update(testimonials)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(testimonials.id, id));

  return existing;
}

/**
 * Susun ulang urutan kutipan.
 *
 * Menerima SELURUH daftar id dalam urutan barunya, bukan "pindahkan id X ke
 * posisi N" — alasannya sama dengan `reorderValues`: perintah relatif
 * dijalankan terhadap urutan yang mungkin sudah bukan urutan yang dilihat
 * pengirimnya, sedangkan daftar penuh menyatakan hasil akhir yang dia maksud.
 *
 * `updatedAt` ikut dinaikkan: urutan adalah konten yang tayang, jadi
 * memindahkan kutipan adalah perubahan yang menunggu Publish seperti yang lain.
 */
export async function reorderTestimonials(
  ids: string[],
): Promise<TestimonialRecord[] | null> {
  if (ids.length === 0) return null;
  if (new Set(ids).size !== ids.length) return null;

  const alive = await db
    .select({ id: testimonials.id })
    .from(testimonials)
    .where(and(isNull(testimonials.deletedAt), inArray(testimonials.id, ids)));

  /* Daftar yang tidak menyebut SEMUA baris hidup ditolak bulat-bulat — yang
     tidak disebut akan tertinggal di `sortOrder` lamanya dan bertabrakan
     dengan yang baru. */
  const semua = await db
    .select({ id: testimonials.id, sortOrder: testimonials.sortOrder })
    .from(testimonials)
    .where(isNull(testimonials.deletedAt));

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
    const now = new Date();
    await db.transaction(async (tx) => {
      for (const [position, id] of bergeser) {
        await tx
          .update(testimonials)
          .set({ sortOrder: position, updatedAt: now })
          .where(eq(testimonials.id, id));
      }
    });
  }

  return listTestimonials({ includeDrafts: true });
}

/** Apakah nama sudah dipakai testimoni HIDUP yang lain? Dibandingkan tanpa
 *  membedakan huruf besar-kecil: "Ratna Wijaya" dan "ratna wijaya" adalah dua
 *  nama yang sama bagi pembaca, dan indeks unik di database tidak tahu itu. */
export async function testimonialNameTaken(
  name: string,
  exceptId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: testimonials.id, name: testimonials.name })
    .from(testimonials)
    .where(isNull(testimonials.deletedAt));

  const target = name.trim().toLowerCase();
  return rows.some(
    (r) => r.id !== exceptId && r.name.trim().toLowerCase() === target,
  );
}
