/**
 * Baca-tulis sektor industri — SATU-SATUNYA tempat query sektor ditulis.
 *
 * Bentuknya kembar dengan `valuesRepo.ts`: satu sektor muat di satu baris,
 * tidak ada tabel anak, urutannya konten. Aturan yang sama juga berlaku —
 * route tidak menulis SQL, dan hapus berarti mengisi `deletedAt`.
 *
 * Satu hal yang tidak dipunyai repo mana pun sebelum ini: `countLiveIndustries`
 * di kaki berkas. Sektor punya batas jumlah tayang (`MAX_LIVE_INDUSTRIES`), dan
 * pertanyaan "sudah berapa yang hidup?" cuma bisa dijawab dari sini.
 */

import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import type { Industry } from "@shared/industry";
import type { IndustryInput } from "@shared/validateIndustry";

import { db } from "./db/client";
import { images, industries } from "./db/schema";

/** Sama seperti `Industry`, plus kolom yang hanya berguna di panel admin dan
 *  tidak pernah ikut ke `content.json`. */
export type IndustryRecord = Industry & {
  updatedAt: string;
  publishedAt: string | null;
  /** `updatedAt > publishedAt` — inilah yang dihitung badge "belum terpublish". */
  unpublished: boolean;
};

type Loaded = {
  row: typeof industries.$inferSelect;
  photoPath: string | null;
};

function assemble({ row, photoPath }: Loaded): IndustryRecord {
  const publishedAt = row.publishedAt?.toISOString() ?? null;
  const updatedAt = row.updatedAt.toISOString();

  return {
    id: row.id,
    name: row.name,
    desc: row.desc,
    tier: row.tier,
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
 * Urutannya SELALU `sortOrder`, lalu `name` sebagai pemutus seri — alasan
 * lengkapnya di `listValues()`, dan di sini akibatnya lebih terlihat lagi:
 * dua sektor ber-`sortOrder` sama akan bertukar anak tangga spiral DAN
 * bertukar nomor cetak ("07" jadi "08") tanpa ada yang mengubah apa pun.
 */
export async function listIndustries(opts: {
  includeDrafts: boolean;
}): Promise<IndustryRecord[]> {
  const rows = await db
    .select({ row: industries, photoPath: images.path })
    .from(industries)
    .leftJoin(images, eq(images.id, industries.photoId))
    .where(isNull(industries.deletedAt))
    .orderBy(asc(industries.sortOrder), asc(industries.name));

  const visible = opts.includeDrafts
    ? rows
    : rows.filter((r) => r.row.state === "live");

  return visible.map(assemble);
}

export async function getIndustryById(
  id: string,
): Promise<IndustryRecord | null> {
  const [loaded] = await db
    .select({ row: industries, photoPath: images.path })
    .from(industries)
    .leftJoin(images, eq(images.id, industries.photoId))
    .where(and(eq(industries.id, id), isNull(industries.deletedAt)));

  return loaded ? assemble(loaded) : null;
}

/* ─────────────────────────── tulis ────────────────────────── */

/** Path foto → id baris `images`. Disalin dari `valuesRepo` alih-alih dipakai
 *  bersama, dengan alasan yang ditulis di sana.
 *
 *  Di sini `path` sering berupa URL Unsplash penuh, bukan `/people/foo.jpg`.
 *  Kolomnya `text` dan yang dipakai `<img src>`/`TextureLoader` juga apa
 *  adanya, jadi keduanya sah — dan `source: "static"` tetap yang benar: CMS
 *  tidak berhak menghapus berkas yang bahkan tidak ada di server ini. */
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

export async function createIndustry(
  input: IndustryInput,
): Promise<IndustryRecord> {
  const photoId = await resolvePhotoId(input.image);

  /* Sektor baru mendarat di BAWAH — sama seperti nilai, dan di sini alasannya
     lebih keras lagi: menyisipkannya di depan akan menggeser nomor cetak
     SELURUH sektor di bawahnya sekaligus. Tombol "Naikkan" ada di sebelahnya
     kalau memang harus di puncak. */
  const [{ tertinggi }] = await db
    .select({ tertinggi: max(industries.sortOrder) })
    .from(industries)
    .where(isNull(industries.deletedAt));

  const [row] = await db
    .insert(industries)
    .values({
      name: input.name.trim(),
      desc: input.desc.trim(),
      tier: input.tier,
      photoId,
      state: input.state,
      sortOrder: (tertinggi ?? -1) + 1,
    })
    .returning({ id: industries.id });

  const created = await getIndustryById(row.id);
  if (!created) throw new Error("Sektor baru tidak terbaca kembali");
  return created;
}

export async function updateIndustry(
  id: string,
  input: IndustryInput,
): Promise<IndustryRecord | null> {
  const existing = await getIndustryById(id);
  if (!existing) return null;

  const photoId = await resolvePhotoId(input.image);

  await db
    .update(industries)
    .set({
      name: input.name.trim(),
      desc: input.desc.trim(),
      tier: input.tier,
      photoId,
      state: input.state,
      /* WAJIB manual: Postgres tidak menyentuh `default now()` saat UPDATE.
         Lupa baris ini = badge "belum terpublish" tidak pernah menyala. */
      updatedAt: new Date(),
    })
    .where(eq(industries.id, id));

  return getIndustryById(id);
}

/** Hapus = tandai. Isinya masih ada di database dan bisa dikembalikan lewat
 *  `psql`; yang hilang cuma barisnya dari panel dan dari `content.json`. */
export async function softDeleteIndustry(
  id: string,
): Promise<IndustryRecord | null> {
  const existing = await getIndustryById(id);
  if (!existing) return null;

  await db
    .update(industries)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(industries.id, id));

  return existing;
}

/**
 * Susun ulang urutan tumpukan.
 *
 * Menerima SELURUH daftar id dalam urutan barunya — alasan lengkapnya di
 * `reorderValues()`. `updatedAt` ikut dinaikkan karena urutan ini benar-benar
 * tayang: ia menentukan anak tangga spiral sekaligus nomor cetaknya.
 */
export async function reorderIndustries(
  ids: string[],
): Promise<IndustryRecord[] | null> {
  if (ids.length === 0) return null;
  if (new Set(ids).size !== ids.length) return null;

  const alive = await db
    .select({ id: industries.id })
    .from(industries)
    .where(and(isNull(industries.deletedAt), inArray(industries.id, ids)));

  /* Daftar yang tidak menyebut SEMUA baris hidup ditolak bulat-bulat — lihat
     alasannya di `reorderValues()`. */
  const semua = await db
    .select({ id: industries.id, sortOrder: industries.sortOrder })
    .from(industries)
    .where(isNull(industries.deletedAt));

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
          .update(industries)
          .set({ sortOrder: position, updatedAt: now })
          .where(eq(industries.id, id));
      }
    });
  }

  return listIndustries({ includeDrafts: true });
}

/** Apakah nama sudah dipakai sektor HIDUP yang lain? Dibandingkan tanpa
 *  membedakan huruf besar-kecil: "Healthcare" dan "healthcare" adalah dua nama
 *  yang sama bagi pembaca, dan indeks unik di database tidak tahu itu. */
export async function industryNameTaken(
  name: string,
  exceptId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: industries.id, name: industries.name })
    .from(industries)
    .where(isNull(industries.deletedAt));

  const target = name.trim().toLowerCase();
  return rows.some(
    (r) => r.id !== exceptId && r.name.trim().toLowerCase() === target,
  );
}

/**
 * Berapa sektor yang sedang `live`?
 *
 * Satu-satunya fungsi hitung di seluruh repo CMS ini, dan ia ada karena batas
 * `MAX_LIVE_INDUSTRIES` (lihat `shared/industry.ts`). Yang memakainya
 * `routes/industries.ts` sebelum menyimpan baris yang statusnya `live`.
 *
 * `exceptId` bukan hiasan: saat sebuah sektor yang SUDAH `live` disunting,
 * dirinya sendiri ikut terhitung, dan penyuntingan yang tidak menambah apa pun
 * akan ditolak dengan alasan "sudah 13" — padahal jumlahnya tidak berubah.
 */
export async function countLiveIndustries(exceptId?: string): Promise<number> {
  const rows = await db
    .select({ id: industries.id })
    .from(industries)
    .where(and(isNull(industries.deletedAt), eq(industries.state, "live")));

  return rows.filter((r) => r.id !== exceptId).length;
}
