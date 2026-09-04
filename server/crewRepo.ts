/**
 * Baca-tulis crew — SATU-SATUNYA tempat query crew ditulis.
 *
 * Di antara `jobsRepo` (empat tabel) dan `valuesRepo` (satu baris): seorang
 * anggota crew tersebar di dua tabel, `crew_members` dan `crew_socials`. Jadi
 * menyimpan tetap butuh transaksi — gagal di tengah tidak boleh meninggalkan
 * orang yang tautan sosialnya sudah terhapus tapi yang baru belum masuk.
 *
 * Aturan yang sama dengan dua repo tetangganya: route tidak menulis SQL, dan
 * hapus berarti mengisi `deletedAt`.
 *
 * Yang TIDAK ada di sini, sengaja: fungsi mengurutkan. Situs mengurutkan crew
 * A–Z sendiri di dalam tiap departemen — lihat catatan panjang di
 * `server/db/schema.ts` dan `shared/crew.ts`.
 */

import { and, asc, eq, isNull } from "drizzle-orm";
import type { CrewMember, CrewSocial } from "@shared/crew";
import type { CrewInput } from "@shared/validateCrew";

import { db, type Db } from "./db/client";
import { dbNow } from "./db/now";
import { crewMembers, crewSocials, images } from "./db/schema";

/** Handle di dalam `db.transaction(...)` — lihat catatan tipe yang sama di
 *  `jobsRepo.ts`. */
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Sama seperti `CrewMember`, plus kolom yang hanya berguna di panel admin dan
 *  tidak pernah ikut ke `content.json`. */
export type CrewRecord = CrewMember & {
  updatedAt: string;
  publishedAt: string | null;
  /** `updatedAt > publishedAt` — inilah yang dihitung badge "belum terpublish". */
  unpublished: boolean;
};

/* ─────────────────────────── baca ─────────────────────────── */

type Loaded = {
  row: typeof crewMembers.$inferSelect;
  photoPath: string | null;
};

function assemble(
  { row, photoPath }: Loaded,
  socialRows: (typeof crewSocials.$inferSelect)[],
): CrewRecord {
  const publishedAt = row.publishedAt?.toISOString() ?? null;
  const updatedAt = row.updatedAt.toISOString();

  const social: CrewSocial[] = socialRows.map((s) => ({
    platform: s.platform,
    url: s.url,
  }));

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    category: row.category,
    /* String kosong, bukan `null`: `CrewMember.photo` selalu string supaya
       situs dan form admin tidak perlu menjaga dua bentuk "tidak ada foto"
       yang berbeda. Yang menentukan avatar inisial adalah string kosongnya. */
    photo: photoPath ?? "",
    social,
    state: row.state,
    updatedAt,
    publishedAt,
    unpublished: publishedAt === null || updatedAt > publishedAt,
  };
}

/**
 * Urutannya departemen dulu, lalu nama.
 *
 * `category` adalah enum Postgres, dan enum diurutkan menurut URUTAN
 * DIDEKLARASIKAN, bukan abjad — jadi Management → Developer → R & D, persis
 * urutan kolom di situs. Itu kebetulan yang menyenangkan, bukan yang
 * diandalkan: `TheCrew.tsx` tetap mengelompokkan dan mengurutkan sendiri.
 * Yang penting di sini cuma bahwa urutannya PASTI — daftar admin yang
 * bertukar-tukar baris tiap kali dimuat ulang membuat editor mengira dia
 * menekan tombol yang salah.
 */
export async function listCrew(opts: {
  includeDrafts: boolean;
}): Promise<CrewRecord[]> {
  const rows = await db
    .select({ row: crewMembers, photoPath: images.path })
    .from(crewMembers)
    .leftJoin(images, eq(images.id, crewMembers.photoId))
    .where(isNull(crewMembers.deletedAt))
    .orderBy(asc(crewMembers.category), asc(crewMembers.name));

  const visible = opts.includeDrafts
    ? rows
    : rows.filter((r) => r.row.state === "live");

  if (!visible.length) return [];

  /* Satu query untuk SEMUA tautan, lalu dikelompokkan di memori. Query per
     orang akan jadi tiga belas query untuk satu halaman daftar, dan angkanya
     naik tiap ada orang baru — bentuk N+1 yang tidak terasa di lokal dan
     terasa sekali di server. */
  const socialRows = await db
    .select()
    .from(crewSocials)
    .orderBy(asc(crewSocials.position));

  return visible.map((loaded) =>
    assemble(
      loaded,
      socialRows.filter((s) => s.memberId === loaded.row.id),
    ),
  );
}

export async function getCrewById(id: string): Promise<CrewRecord | null> {
  const [loaded] = await db
    .select({ row: crewMembers, photoPath: images.path })
    .from(crewMembers)
    .leftJoin(images, eq(images.id, crewMembers.photoId))
    .where(and(eq(crewMembers.id, id), isNull(crewMembers.deletedAt)));

  if (!loaded) return null;

  const socialRows = await db
    .select()
    .from(crewSocials)
    .where(eq(crewSocials.memberId, id))
    .orderBy(asc(crewSocials.position));

  return assemble(loaded, socialRows);
}

/* ─────────────────────────── tulis ────────────────────────── */

/** Path foto → id baris `images`. Disalin dari `jobsRepo` dengan alasan yang
 *  sama seperti di `valuesRepo`: ketiganya kebetulan sama HARI INI, dan
 *  menyatukan tiga fungsi yang kebetulan sama membuat perubahan untuk salah
 *  satunya diam-diam ikut ke dua yang lain. */
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

/** Tulis ulang seluruh tautan sosial: hapus lalu masukkan lagi. Alasan sama
 *  dengan `writeChildren` di `jobsRepo` — daftarnya paling panjang tiga baris,
 *  dan diff "pintar" untuk daftar terurut adalah sumber bug klasik. */
async function writeSocials(tx: Tx, memberId: string, social: CrewSocial[]) {
  await tx.delete(crewSocials).where(eq(crewSocials.memberId, memberId));

  if (!social.length) return;

  await tx.insert(crewSocials).values(
    social.map((s, position) => ({
      memberId,
      position,
      platform: s.platform,
      url: s.url.trim(),
    })),
  );
}

export async function createCrew(input: CrewInput): Promise<CrewRecord> {
  const id = await db.transaction(async (tx) => {
    const photoId = await resolvePhotoId(tx, input.photo);

    const [row] = await tx
      .insert(crewMembers)
      .values({
        name: input.name.trim(),
        role: input.role.trim(),
        category: input.category,
        photoId,
        state: input.state,
      })
      .returning({ id: crewMembers.id });

    await writeSocials(tx, row.id, input.social);
    return row.id;
  });

  const created = await getCrewById(id);
  if (!created) throw new Error("Anggota crew baru tidak terbaca kembali");
  return created;
}

export async function updateCrew(
  id: string,
  input: CrewInput,
): Promise<CrewRecord | null> {
  const existing = await getCrewById(id);
  if (!existing) return null;

  await db.transaction(async (tx) => {
    const photoId = await resolvePhotoId(tx, input.photo);

    await tx
      .update(crewMembers)
      .set({
        name: input.name.trim(),
        role: input.role.trim(),
        category: input.category,
        photoId,
        state: input.state,
        /* WAJIB manual: Postgres tidak menyentuh `default now()` saat UPDATE.
           Lupa baris ini = badge "belum terpublish" tidak pernah menyala. */
        updatedAt: dbNow(),
      })
      .where(eq(crewMembers.id, id));

    await writeSocials(tx, id, input.social);
  });

  return getCrewById(id);
}

/** Hapus = tandai. Isinya masih ada di database dan bisa dikembalikan lewat
 *  `psql`; yang hilang cuma barisnya dari panel dan dari `content.json`. */
export async function softDeleteCrew(id: string): Promise<CrewRecord | null> {
  const existing = await getCrewById(id);
  if (!existing) return null;

  await db
    .update(crewMembers)
    .set({ deletedAt: dbNow(), updatedAt: dbNow() })
    .where(eq(crewMembers.id, id));

  return existing;
}

/**
 * Apakah nama sudah dipakai anggota HIDUP yang lain?
 *
 * Dibandingkan tanpa membedakan huruf besar-kecil dan tanpa spasi berlebih:
 * "Jun" dan "jun " adalah orang yang sama bagi pembaca, dan indeks unik di
 * database tidak tahu itu. Tanpa pemeriksaan ini editor akan menerima 500
 * dari Postgres alih-alih kalimat yang bisa dia perbaiki.
 */
export async function crewNameTaken(
  name: string,
  exceptId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: crewMembers.id, name: crewMembers.name })
    .from(crewMembers)
    .where(isNull(crewMembers.deletedAt));

  const target = name.trim().toLowerCase();
  return rows.some(
    (r) => r.id !== exceptId && r.name.trim().toLowerCase() === target,
  );
}
