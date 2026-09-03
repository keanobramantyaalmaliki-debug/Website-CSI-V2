/**
 * Baca-tulis layanan halaman Services — SATU-SATUNYA tempat query layanan
 * ditulis.
 *
 * Bentuknya sama dengan `workProjectsRepo.ts`: satu layanan tersebar di dua
 * tabel (`services` + `service_subs`), jadi menyimpan butuh transaksi; dan
 * urutannya bisa diubah editor, jadi ada `reorderServices`.
 *
 * Yang tidak ada di sini dan ada di sana: gambar. Layanan tidak punya foto —
 * yang tayang cuma teks — jadi tidak ada `resolvePhotoId` dan tidak ada join
 * ke `images`.
 *
 * Aturan yang sama dengan repo tetangganya: route tidak menulis SQL, dan hapus
 * berarti mengisi `deletedAt`.
 */

import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import type { Service } from "@shared/service";
import type { ServiceInput } from "@shared/validateService";

import { db, type Db } from "./db/client";
import { services, serviceSubs } from "./db/schema";

/** Handle di dalam `db.transaction(...)` — lihat catatan tipe yang sama di
 *  `jobsRepo.ts`. */
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Sama seperti `Service`, plus kolom yang hanya berguna di panel admin dan
 *  tidak pernah ikut ke `content.json`. */
export type ServiceRecord = Service & {
  updatedAt: string;
  publishedAt: string | null;
  /** `updatedAt > publishedAt` — inilah yang dihitung badge "belum terpublish". */
  unpublished: boolean;
};

/* ─────────────────────────── baca ─────────────────────────── */

function assemble(
  row: typeof services.$inferSelect,
  subRows: (typeof serviceSubs.$inferSelect)[],
): ServiceRecord {
  const publishedAt = row.publishedAt?.toISOString() ?? null;
  const updatedAt = row.updatedAt.toISOString();

  return {
    id: row.id,
    title: row.title,
    desc: row.desc,
    subs: subRows.map((s) => s.label),
    state: row.state,
    sortOrder: row.sortOrder,
    updatedAt,
    publishedAt,
    unpublished: publishedAt === null || updatedAt > publishedAt,
  };
}

/**
 * Urutannya SELALU `sortOrder`, lalu `title` sebagai pemutus seri — sama
 * seperti nilai dan proyek, dan bukan hiasan: dua baris ber-`sortOrder` sama
 * akan bertukar tempat secara acak antar query tanpa `ORDER BY` kedua, dan
 * daftar sr-only di situs ikut bertukar tiap kali dipublish.
 */
export async function listServices(opts: {
  includeDrafts: boolean;
}): Promise<ServiceRecord[]> {
  const rows = await db
    .select()
    .from(services)
    .where(isNull(services.deletedAt))
    .orderBy(asc(services.sortOrder), asc(services.title));

  const visible = opts.includeDrafts
    ? rows
    : rows.filter((r) => r.state === "live");

  if (!visible.length) return [];

  /* Satu query untuk SEMUA rincian, lalu dikelompokkan di memori — bentuk N+1
     dihindari dengan alasan yang sama seperti label proyek. */
  const subRows = await db
    .select()
    .from(serviceSubs)
    .orderBy(asc(serviceSubs.position));

  return visible.map((row) =>
    assemble(
      row,
      subRows.filter((s) => s.serviceId === row.id),
    ),
  );
}

export async function getServiceById(
  id: string,
): Promise<ServiceRecord | null> {
  const [row] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, id), isNull(services.deletedAt)));

  if (!row) return null;

  const subRows = await db
    .select()
    .from(serviceSubs)
    .where(eq(serviceSubs.serviceId, id))
    .orderBy(asc(serviceSubs.position));

  return assemble(row, subRows);
}

/* ─────────────────────────── tulis ────────────────────────── */

/** Tulis ulang seluruh rincian: hapus lalu masukkan lagi. Alasan sama dengan
 *  `writeTags` di `workProjectsRepo` — daftarnya paling panjang sepuluh baris,
 *  dan diff "pintar" untuk daftar terurut adalah sumber bug klasik. */
async function writeSubs(tx: Tx, serviceId: string, subs: string[]) {
  await tx.delete(serviceSubs).where(eq(serviceSubs.serviceId, serviceId));

  const bersih = subs.map((s) => s.trim()).filter((s) => s.length > 0);
  if (!bersih.length) return;

  await tx
    .insert(serviceSubs)
    .values(bersih.map((label, position) => ({ serviceId, position, label })));
}

export async function createService(
  input: ServiceInput,
): Promise<ServiceRecord> {
  const id = await db.transaction(async (tx) => {
    /**
     * Layanan baru mendarat di BELAKANG, sama seperti nilai dan proyek.
     * Sabuknya melingkar sehingga "depan" tidak sejelas di kipas Work, tapi
     * daftar sr-only dibaca lurus dari atas — menyisipkan layanan baru di
     * depan akan mengganti kalimat pembuka halaman bagi pemakai pembaca layar
     * tanpa ada yang memintanya. Kalau memang harus di depan, tombol
     * "Naikkan" ada di sebelahnya.
     */
    const [{ tertinggi }] = await tx
      .select({ tertinggi: max(services.sortOrder) })
      .from(services)
      .where(isNull(services.deletedAt));

    const [row] = await tx
      .insert(services)
      .values({
        title: input.title.trim(),
        desc: input.desc.trim(),
        state: input.state,
        sortOrder: (tertinggi ?? -1) + 1,
      })
      .returning({ id: services.id });

    await writeSubs(tx, row.id, input.subs);
    return row.id;
  });

  const created = await getServiceById(id);
  if (!created) throw new Error("Layanan baru tidak terbaca kembali");
  return created;
}

export async function updateService(
  id: string,
  input: ServiceInput,
): Promise<ServiceRecord | null> {
  const existing = await getServiceById(id);
  if (!existing) return null;

  await db.transaction(async (tx) => {
    await tx
      .update(services)
      .set({
        title: input.title.trim(),
        desc: input.desc.trim(),
        state: input.state,
        /* WAJIB manual: Postgres tidak menyentuh `default now()` saat UPDATE.
           Lupa baris ini = badge "belum terpublish" tidak pernah menyala. */
        updatedAt: new Date(),
      })
      .where(eq(services.id, id));

    await writeSubs(tx, id, input.subs);
  });

  return getServiceById(id);
}

/** Hapus = tandai. Isinya masih ada di database dan bisa dikembalikan lewat
 *  `psql`; yang hilang cuma barisnya dari panel dan dari `content.json`. */
export async function softDeleteService(
  id: string,
): Promise<ServiceRecord | null> {
  const existing = await getServiceById(id);
  if (!existing) return null;

  await db
    .update(services)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(services.id, id));

  return existing;
}

/**
 * Susun ulang urutan layanan.
 *
 * Menerima SELURUH daftar id dalam urutan barunya, bukan "pindahkan id X ke
 * posisi N" — alasan lengkapnya sudah ditulis di `reorderValues`: perintah
 * relatif dijalankan terhadap urutan yang mungkin sudah bukan urutan yang
 * dilihat pengirimnya.
 *
 * `updatedAt` ikut dinaikkan: urutan adalah konten yang tayang, jadi
 * memindahkan layanan adalah perubahan yang menunggu Publish seperti yang
 * lain.
 */
export async function reorderServices(
  ids: string[],
): Promise<ServiceRecord[] | null> {
  if (ids.length === 0) return null;
  if (new Set(ids).size !== ids.length) return null;

  const alive = await db
    .select({ id: services.id })
    .from(services)
    .where(and(isNull(services.deletedAt), inArray(services.id, ids)));

  /* Daftar yang tidak menyebut SEMUA baris hidup ditolak bulat-bulat — lihat
     alasannya di `reorderValues`. */
  const semua = await db
    .select({ id: services.id, sortOrder: services.sortOrder })
    .from(services)
    .where(isNull(services.deletedAt));

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
          .update(services)
          .set({ sortOrder: position, updatedAt: now })
          .where(eq(services.id, id));
      }
    });
  }

  return listServices({ includeDrafts: true });
}

/**
 * Apakah nama layanan sudah dipakai layanan HIDUP yang lain?
 *
 * Dibandingkan tanpa membedakan huruf besar-kecil dan tanpa spasi berlebih,
 * sama seperti judul proyek. Tanpa pemeriksaan ini editor akan menerima 500
 * dari Postgres (indeks `services_title_alive`) alih-alih kalimat yang bisa
 * dia perbaiki.
 */
export async function serviceTitleTaken(
  title: string,
  exceptId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: services.id, title: services.title })
    .from(services)
    .where(isNull(services.deletedAt));

  const target = title.trim().toLowerCase();
  return rows.some(
    (r) => r.id !== exceptId && r.title.trim().toLowerCase() === target,
  );
}
