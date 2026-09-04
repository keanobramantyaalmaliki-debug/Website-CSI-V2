/**
 * Baca-tulis isi kaki halaman — SATU-SATUNYA tempat query footer ditulis.
 *
 * Bentuknya campuran dua pola yang sudah ada, dan bukan pola ketiga: baris
 * induknya dikelola persis seperti `visionRepo` (entitas tunggal, upsert
 * `id = 1`, tanpa create/delete/reorder), sedangkan tautan sosialnya persis
 * seperti `crewRepo.writeSocials` (tabel anak, hapus-lalu-sisip di dalam satu
 * transaksi).
 *
 * Yang tidak ada di sini, semuanya disengaja —
 *
 * - **Tidak ada `createFooter`.** Barisnya lahir dari `db:seed` dan sesudah
 *   itu selalu ada. `saveFooter()` menanganinya lewat upsert, jadi database
 *   yang belum di-seed pun tidak membuat panel gagal menyimpan.
 * - **Tidak ada `softDeleteFooter`.** Kaki halaman ikut setiap halaman situs;
 *   tidak ada keadaan "situs tanpa kaki halaman" yang boleh dicapai dari
 *   panel.
 * - **Tidak ada `reorderFooter`.** Tidak ada yang bisa diurutkan — kecuali
 *   tautan sosialnya, dan urutan itu ditentukan URUTAN KIRIM dari form, bukan
 *   endpoint tersendiri.
 *
 * Yang tetap sama dengan repo lain: route tidak menulis SQL, dan `updatedAt`
 * dinaikkan manual supaya badge "belum terpublish" menyala.
 */

import { asc, eq, sql } from "drizzle-orm";
import type { Footer, FooterSocial } from "@shared/footer";
import type { FooterInput } from "@shared/validateFooter";

import { db, type Db } from "./db/client";
import { dbNow } from "./db/now";
import { footer, footerSocials } from "./db/schema";

/** Handle di dalam `db.transaction(...)` — lihat catatan tipe yang sama di
 *  `jobsRepo.ts`. */
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Nomor baris satu-satunya. Dijaga juga di tingkat database lewat CHECK
 *  `footer_satu_baris`, jadi baris kedua bukan sesuatu yang bisa lolos lewat
 *  jalur lain (psql, migrasi, skrip) tanpa ditolak. */
const ROW_ID = 1;

/** Sama seperti `Footer`, plus kolom yang hanya berguna di panel admin dan
 *  tidak pernah ikut ke `content.json`. */
export type FooterRecord = Footer & {
  updatedAt: string;
  publishedAt: string | null;
  /** `updatedAt > publishedAt` — inilah yang dihitung badge "belum terpublish". */
  unpublished: boolean;
};

function assemble(
  row: typeof footer.$inferSelect,
  socialRows: (typeof footerSocials.$inferSelect)[],
): FooterRecord {
  const publishedAt = row.publishedAt?.toISOString() ?? null;
  const updatedAt = row.updatedAt.toISOString();

  const socials: FooterSocial[] = socialRows.map((s) => ({
    label: s.label,
    href: s.href,
  }));

  return {
    email: row.email,
    address: row.address,
    copyright: row.copyright,
    socials,
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
 * Pemanggilnya yang memutuskan apa artinya, sama seperti `getVision()`:
 * publish memperlakukannya sebagai "tidak ada isi CMS" lalu membiarkan situs
 * jatuh ke cadangan bundle, sedangkan panel admin membuka form kosong supaya
 * editor bisa mengisinya untuk pertama kali.
 */
export async function getFooter(): Promise<FooterRecord | null> {
  const [row] = await db.select().from(footer).where(eq(footer.id, ROW_ID));
  if (!row) return null;

  const socialRows = await db
    .select()
    .from(footerSocials)
    .where(eq(footerSocials.footerId, ROW_ID))
    .orderBy(asc(footerSocials.position));

  return assemble(row, socialRows);
}

/* ─────────────────────────── tulis ────────────────────────── */

/** Tulis ulang seluruh tautan sosial: hapus lalu masukkan lagi. Alasan sama
 *  dengan `writeSocials` di `crewRepo` — daftarnya sependek itu, dan diff
 *  "pintar" untuk daftar terurut adalah sumber bug klasik. */
async function writeSocials(tx: Tx, socials: FooterSocial[]) {
  await tx.delete(footerSocials).where(eq(footerSocials.footerId, ROW_ID));

  if (!socials.length) return;

  await tx.insert(footerSocials).values(
    socials.map((s, position) => ({
      footerId: ROW_ID,
      position,
      label: s.label.trim(),
      href: s.href.trim(),
    })),
  );
}

/**
 * Simpan isi kaki halaman. Satu-satunya penulis, dan tidak pernah gagal karena
 * barisnya belum ada.
 *
 * Upsert dengan alasan yang sama seperti `saveVision()`: dua penyimpanan yang
 * datang bersamaan ke database kosong akan sama-sama membaca "belum ada" lalu
 * sama-sama insert, dan yang kedua menabrak primary key. Dengan
 * `onConflictDoUpdate`, tabrakan itu justru jadi jalur normalnya.
 *
 * ‼️ Di dalam SATU transaksi bersama tautan sosialnya, dan ini yang tidak ada
 * di `saveVision()`. Baris induk yang tersimpan tapi tautannya gagal ditulis
 * akan meninggalkan kaki halaman tanpa satu pun tautan — bukan galat yang
 * terlihat, melainkan tautan yang diam-diam lenyap dari situs. Urutannya juga
 * penting: induk lebih dulu, karena `footer_socials.footer_id` menunjuk
 * kepadanya.
 */
export async function saveFooter(input: FooterInput): Promise<FooterRecord> {
  const now = dbNow();
  const email = input.email.trim();
  const address = input.address.trim();
  const copyright = input.copyright.trim();

  await db.transaction(async (tx) => {
    await tx
      .insert(footer)
      .values({ id: ROW_ID, email, address, copyright, updatedAt: now })
      .onConflictDoUpdate({
        target: footer.id,
        set: {
          email: sql`excluded.email`,
          address: sql`excluded.address`,
          copyright: sql`excluded.copyright`,
          /* WAJIB manual: Postgres tidak menyentuh `default now()` saat
             UPDATE. Lupa baris ini = badge "belum terpublish" tidak pernah
             menyala. */
          updatedAt: sql`excluded.updated_at`,
        },
      });

    await writeSocials(tx, input.socials);
  });

  const saved = await getFooter();
  if (!saved) throw new Error("Kaki halaman tidak terbaca kembali sesudah disimpan");
  return saved;
}
