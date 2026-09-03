/**
 * Baca-tulis nilai — SATU-SATUNYA tempat query nilai ditulis.
 *
 * Jauh lebih pendek dari `jobsRepo.ts` karena satu nilai muat di satu baris:
 * tidak ada tabel anak, jadi tidak ada transaksi lintas tabel untuk menyimpan.
 * Yang tetap sama adalah aturannya — route tidak menulis SQL, dan hapus berarti
 * mengisi `deletedAt`.
 *
 * Satu hal yang tidak ada di lowongan: URUTAN bisa diubah editor. Urutan itu
 * konten, bukan preferensi tampilan panel — panel nilai bertumpuk sticky di
 * situs, dan yang terakhir adalah yang menutup tumpukan.
 */

import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import type { Value } from "@shared/value";
import type { ValueInput } from "@shared/validateValue";

import { db } from "./db/client";
import { images, peopleValues } from "./db/schema";

/** Sama seperti `Value`, plus kolom yang hanya berguna di panel admin dan
 *  tidak pernah ikut ke `content.json`. */
export type ValueRecord = Value & {
  updatedAt: string;
  publishedAt: string | null;
  /** `updatedAt > publishedAt` — inilah yang dihitung badge "belum terpublish". */
  unpublished: boolean;
};

type Loaded = {
  row: typeof peopleValues.$inferSelect;
  photoPath: string | null;
};

function assemble({ row, photoPath }: Loaded): ValueRecord {
  const publishedAt = row.publishedAt?.toISOString() ?? null;
  const updatedAt = row.updatedAt.toISOString();

  return {
    id: row.id,
    title: row.title,
    tagline: row.tagline,
    description: row.description,
    photo: photoPath ?? "",
    state: row.state,
    sortOrder: row.sortOrder,
    updatedAt,
    publishedAt,
    unpublished: publishedAt === null || updatedAt > publishedAt,
  };
}

/* ─────────────────────────── baca ─────────────────────────── */

/**
 * Urutannya SELALU `sortOrder`, lalu `title` sebagai pemutus seri.
 *
 * Pemutus seri itu bukan hiasan: dua baris ber-`sortOrder` sama akan bertukar
 * tempat secara acak antar query tanpa `ORDER BY` kedua, dan panel di situs
 * ikut bertukar tiap kali dipublish — perubahan yang tidak pernah diminta
 * siapa pun dan tidak bisa dijelaskan ke editor.
 */
export async function listValues(opts: {
  includeDrafts: boolean;
}): Promise<ValueRecord[]> {
  const rows = await db
    .select({ row: peopleValues, photoPath: images.path })
    .from(peopleValues)
    .leftJoin(images, eq(images.id, peopleValues.photoId))
    .where(isNull(peopleValues.deletedAt))
    .orderBy(asc(peopleValues.sortOrder), asc(peopleValues.title));

  const visible = opts.includeDrafts
    ? rows
    : rows.filter((r) => r.row.state === "live");

  return visible.map(assemble);
}

export async function getValueById(id: string): Promise<ValueRecord | null> {
  const [loaded] = await db
    .select({ row: peopleValues, photoPath: images.path })
    .from(peopleValues)
    .leftJoin(images, eq(images.id, peopleValues.photoId))
    .where(and(eq(peopleValues.id, id), isNull(peopleValues.deletedAt)));

  return loaded ? assemble(loaded) : null;
}

/* ─────────────────────────── tulis ────────────────────────── */

/** Path foto → id baris `images`. Sengaja disalin dari `jobsRepo` alih-alih
 *  dipakai bersama: keduanya kebetulan sama HARI INI, dan menyatukan dua
 *  fungsi yang kebetulan sama membuat perubahan untuk salah satunya diam-diam
 *  ikut ke yang lain. */
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

export async function createValue(input: ValueInput): Promise<ValueRecord> {
  const photoId = await resolvePhotoId(input.photo);

  /**
   * Nilai baru mendarat di BAWAH, kebalikan dari lowongan.
   *
   * Di lowongan "yang baru di atas" masuk akal karena urutan barisnya cuma
   * urutan daftar. Di sini urutan itu tampilan situs: menyisipkan nilai baru
   * di depan "Craft First" akan mengubah panel pembuka halaman People tanpa
   * ada yang memintanya. Daftarnya pendek — nilai baru tetap kelihatan — dan
   * kalau memang harus di depan, tombol "Naikkan" ada di sebelahnya.
   */
  const [{ tertinggi }] = await db
    .select({ tertinggi: max(peopleValues.sortOrder) })
    .from(peopleValues)
    .where(isNull(peopleValues.deletedAt));

  const [row] = await db
    .insert(peopleValues)
    .values({
      title: input.title.trim(),
      tagline: input.tagline.trim(),
      description: input.description.trim(),
      photoId,
      state: input.state,
      sortOrder: (tertinggi ?? -1) + 1,
    })
    .returning({ id: peopleValues.id });

  const created = await getValueById(row.id);
  if (!created) throw new Error("Nilai baru tidak terbaca kembali");
  return created;
}

export async function updateValue(
  id: string,
  input: ValueInput,
): Promise<ValueRecord | null> {
  const existing = await getValueById(id);
  if (!existing) return null;

  const photoId = await resolvePhotoId(input.photo);

  await db
    .update(peopleValues)
    .set({
      title: input.title.trim(),
      tagline: input.tagline.trim(),
      description: input.description.trim(),
      photoId,
      state: input.state,
      /* WAJIB manual: Postgres tidak menyentuh `default now()` saat UPDATE.
         Lupa baris ini = badge "belum terpublish" tidak pernah menyala. */
      updatedAt: new Date(),
    })
    .where(eq(peopleValues.id, id));

  return getValueById(id);
}

/** Hapus = tandai. Isinya masih ada di database dan bisa dikembalikan lewat
 *  `psql`; yang hilang cuma barisnya dari panel dan dari `content.json`. */
export async function softDeleteValue(id: string): Promise<ValueRecord | null> {
  const existing = await getValueById(id);
  if (!existing) return null;

  await db
    .update(peopleValues)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(peopleValues.id, id));

  return existing;
}

/**
 * Susun ulang urutan panel.
 *
 * Menerima SELURUH daftar id dalam urutan barunya, bukan "pindahkan id X ke
 * posisi N". Bedanya terasa saat dua orang menyunting bersamaan: perintah
 * relatif dijalankan terhadap urutan yang mungkin sudah bukan urutan yang
 * dilihat pengirimnya, sedangkan daftar penuh menyatakan hasil akhir yang dia
 * maksud dan tidak bisa ditafsirkan dua kali.
 *
 * `updatedAt` ikut dinaikkan: urutan adalah konten yang tayang, jadi
 * memindahkan panel adalah perubahan yang menunggu Publish seperti yang lain.
 */
export async function reorderValues(ids: string[]): Promise<ValueRecord[] | null> {
  if (ids.length === 0) return null;
  if (new Set(ids).size !== ids.length) return null;

  const alive = await db
    .select({ id: peopleValues.id })
    .from(peopleValues)
    .where(and(isNull(peopleValues.deletedAt), inArray(peopleValues.id, ids)));

  /* Daftar yang tidak menyebut SEMUA baris hidup ditolak bulat-bulat. Yang
     tidak disebut akan tertinggal di `sortOrder` lamanya dan bertabrakan
     dengan yang baru — urutan hasilnya tidak sama dengan yang mana pun dari
     kedua versi, dan itu justru bentuk kerusakan yang paling sulit dibaca. */
  const semua = await db
    .select({ id: peopleValues.id, sortOrder: peopleValues.sortOrder })
    .from(peopleValues)
    .where(isNull(peopleValues.deletedAt));

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
          .update(peopleValues)
          .set({ sortOrder: position, updatedAt: now })
          .where(eq(peopleValues.id, id));
      }
    });
  }

  return listValues({ includeDrafts: true });
}

/** Apakah judul sudah dipakai nilai HIDUP yang lain? Dibandingkan tanpa
 *  membedakan huruf besar-kecil: "Craft First" dan "craft first" adalah dua
 *  judul yang sama bagi pembaca, dan indeks unik di database tidak tahu itu. */
export async function valueTitleTaken(
  title: string,
  exceptId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: peopleValues.id, title: peopleValues.title })
    .from(peopleValues)
    .where(isNull(peopleValues.deletedAt));

  const target = title.trim().toLowerCase();
  return rows.some((r) => r.id !== exceptId && r.title.trim().toLowerCase() === target);
}
