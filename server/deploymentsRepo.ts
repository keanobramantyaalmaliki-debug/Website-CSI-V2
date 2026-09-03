/**
 * Baca-tulis kartu deployment — SATU-SATUNYA tempat query deployment ditulis.
 *
 * Bentuknya kembar dengan `industriesRepo.ts`: satu kartu muat di satu baris,
 * tidak ada tabel anak, urutannya konten. Aturan yang sama juga berlaku —
 * route tidak menulis SQL, dan hapus berarti mengisi `deletedAt`.
 *
 * Dua hal yang berbeda dari tetangganya itu, keduanya disengaja:
 *
 * 1. TIDAK ADA `countLive…`. Deployment tidak punya batas jumlah tayang; grid
 *    CSS-nya tinggal menambah baris ke bawah.
 * 2. Cek kembarnya melihat DUA kolom (`deploymentPairTaken`), bukan satu.
 *    Sektor yang sama di wilayah berbeda itu sah — lihat
 *    `deployments_sector_region_alive` di `db/schema.ts`.
 */

import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import type { Deployment } from "@shared/deployment";
import type { DeploymentInput } from "@shared/validateDeployment";

import { db } from "./db/client";
import { deployments, images } from "./db/schema";

/** Sama seperti `Deployment`, plus kolom yang hanya berguna di panel admin dan
 *  tidak pernah ikut ke `content.json`. */
export type DeploymentRecord = Deployment & {
  updatedAt: string;
  publishedAt: string | null;
  /** `updatedAt > publishedAt` — inilah yang dihitung badge "belum terpublish". */
  unpublished: boolean;
};

type Loaded = {
  row: typeof deployments.$inferSelect;
  photoPath: string | null;
};

function assemble({ row, photoPath }: Loaded): DeploymentRecord {
  const publishedAt = row.publishedAt?.toISOString() ?? null;
  const updatedAt = row.updatedAt.toISOString();

  return {
    id: row.id,
    sector: row.sector,
    region: row.region,
    desc: row.desc,
    image: photoPath ?? "",
    state: row.state,
    sortOrder: row.sortOrder,
    updatedAt,
    publishedAt,
    unpublished: publishedAt === null || updatedAt > publishedAt,
  };
}

/* ─────────────────────────── baca ─────────────────────────── */

/**
 * Urutannya SELALU `sortOrder`, lalu `sector` sebagai pemutus seri — alasan
 * lengkapnya di `listValues()`. Dua kartu ber-`sortOrder` sama akan bertukar
 * tempat di grid DAN bertukar nomor cetak ("03" jadi "04") tanpa ada yang
 * mengubah apa pun.
 */
export async function listDeployments(opts: {
  includeDrafts: boolean;
}): Promise<DeploymentRecord[]> {
  const rows = await db
    .select({ row: deployments, photoPath: images.path })
    .from(deployments)
    .leftJoin(images, eq(images.id, deployments.photoId))
    .where(isNull(deployments.deletedAt))
    .orderBy(asc(deployments.sortOrder), asc(deployments.sector));

  const visible = opts.includeDrafts
    ? rows
    : rows.filter((r) => r.row.state === "live");

  return visible.map(assemble);
}

export async function getDeploymentById(
  id: string,
): Promise<DeploymentRecord | null> {
  const [loaded] = await db
    .select({ row: deployments, photoPath: images.path })
    .from(deployments)
    .leftJoin(images, eq(images.id, deployments.photoId))
    .where(and(eq(deployments.id, id), isNull(deployments.deletedAt)));

  return loaded ? assemble(loaded) : null;
}

/* ─────────────────────────── tulis ────────────────────────── */

/** Path foto → id baris `images`. Disalin dari `industriesRepo` alih-alih
 *  dipakai bersama, dengan alasan yang ditulis di `valuesRepo`.
 *
 *  Di sini `path` berupa URL Unsplash penuh, bukan `/people/foo.jpg` — dan
 *  `source: "static"` tetap yang benar: CMS tidak berhak menghapus berkas yang
 *  bahkan tidak ada di server ini. */
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

export async function createDeployment(
  input: DeploymentInput,
): Promise<DeploymentRecord> {
  const photoId = await resolvePhotoId(input.image);

  /* Kartu baru mendarat di BAWAH — sama seperti sektor industri: menyisipkannya
     di depan akan menggeser nomor cetak SELURUH kartu di bawahnya sekaligus.
     Tombol "Naikkan" ada di sebelahnya kalau memang harus di depan. */
  const [{ tertinggi }] = await db
    .select({ tertinggi: max(deployments.sortOrder) })
    .from(deployments)
    .where(isNull(deployments.deletedAt));

  const [row] = await db
    .insert(deployments)
    .values({
      sector: input.sector.trim(),
      region: input.region.trim(),
      desc: input.desc.trim(),
      photoId,
      state: input.state,
      sortOrder: (tertinggi ?? -1) + 1,
    })
    .returning({ id: deployments.id });

  const created = await getDeploymentById(row.id);
  if (!created) throw new Error("Deployment baru tidak terbaca kembali");
  return created;
}

export async function updateDeployment(
  id: string,
  input: DeploymentInput,
): Promise<DeploymentRecord | null> {
  const existing = await getDeploymentById(id);
  if (!existing) return null;

  const photoId = await resolvePhotoId(input.image);

  await db
    .update(deployments)
    .set({
      sector: input.sector.trim(),
      region: input.region.trim(),
      desc: input.desc.trim(),
      photoId,
      state: input.state,
      /* WAJIB manual: Postgres tidak menyentuh `default now()` saat UPDATE.
         Lupa baris ini = badge "belum terpublish" tidak pernah menyala. */
      updatedAt: new Date(),
    })
    .where(eq(deployments.id, id));

  return getDeploymentById(id);
}

/** Hapus = tandai. Isinya masih ada di database dan bisa dikembalikan lewat
 *  `psql`; yang hilang cuma barisnya dari panel dan dari `content.json`. */
export async function softDeleteDeployment(
  id: string,
): Promise<DeploymentRecord | null> {
  const existing = await getDeploymentById(id);
  if (!existing) return null;

  await db
    .update(deployments)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(deployments.id, id));

  return existing;
}

/**
 * Susun ulang urutan kartu di grid.
 *
 * Menerima SELURUH daftar id dalam urutan barunya — alasan lengkapnya di
 * `reorderValues()`. `updatedAt` ikut dinaikkan karena urutan ini benar-benar
 * tayang: ia menentukan posisi kartu di grid sekaligus nomor cetaknya.
 */
export async function reorderDeployments(
  ids: string[],
): Promise<DeploymentRecord[] | null> {
  if (ids.length === 0) return null;
  if (new Set(ids).size !== ids.length) return null;

  const alive = await db
    .select({ id: deployments.id })
    .from(deployments)
    .where(and(isNull(deployments.deletedAt), inArray(deployments.id, ids)));

  /* Daftar yang tidak menyebut SEMUA baris hidup ditolak bulat-bulat — lihat
     alasannya di `reorderValues()`. */
  const semua = await db
    .select({ id: deployments.id, sortOrder: deployments.sortOrder })
    .from(deployments)
    .where(isNull(deployments.deletedAt));

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
          .update(deployments)
          .set({ sortOrder: position, updatedAt: now })
          .where(eq(deployments.id, id));
      }
    });
  }

  return listDeployments({ includeDrafts: true });
}

/**
 * Apakah PASANGAN sektor+wilayah sudah dipakai kartu HIDUP yang lain?
 *
 * Dua kolom, bukan satu, dan itu keputusan yang ditulis lengkap di
 * `db/schema.ts`: "Logistics · Indonesia" dan "Logistics · International" itu
 * dua sistem yang berbeda, jadi menolak sektor kembar akan memaksa editor
 * mengarang nama sektor palsu. Yang ditolak cuma kartu yang benar-benar sama
 * persis.
 *
 * Dibandingkan tanpa membedakan huruf besar-kecil: "Logistics" dan "logistics"
 * adalah nama yang sama bagi pembaca, dan indeks unik di database tidak tahu
 * itu.
 */
export async function deploymentPairTaken(
  sector: string,
  region: string,
  exceptId?: string,
): Promise<boolean> {
  const rows = await db
    .select({
      id: deployments.id,
      sector: deployments.sector,
      region: deployments.region,
    })
    .from(deployments)
    .where(isNull(deployments.deletedAt));

  const s = sector.trim().toLowerCase();
  const r = region.trim().toLowerCase();
  return rows.some(
    (row) =>
      row.id !== exceptId &&
      row.sector.trim().toLowerCase() === s &&
      row.region.trim().toLowerCase() === r,
  );
}
