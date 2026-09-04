/**
 * Endpoint Judul seksi — kalimat pembuka sebelas seksi situs.
 *
 * Dua route: `GET /` membaca semuanya sekaligus, `PUT /:key` menyimpan satu.
 * Yang tidak ada di sini sengaja tidak ada —
 *
 * - **Tidak ada `POST /`.** Sebelas barisnya lahir dari seed dan kuncinya
 *   ditutup enum `section_key`. Seksi kedua belas berarti komponen baru di
 *   situs, bukan tombol Tambah di panel.
 * - **Tidak ada `DELETE`.** Judul yang hilang bukan seksi yang hilang,
 *   melainkan seksi yang tayang dengan kepala kosong.
 * - **Tidak ada `POST /urutkan`.** Urutan seksi milik tata letak halaman.
 *
 * `GET /` mengembalikan SELURUH daftar, bukan per halaman. Panel memuat semua
 * entitas sekali di awal (`muat()` di `admin/src/App.tsx`), dan memecahnya
 * jadi empat endpoint cuma akan menambah tiga permintaan untuk data yang
 * totalnya sebelas baris. Pemecahan per halaman terjadi di panel.
 */

import { Hono } from "hono";
import { isSectionTextKey } from "@shared/sectionText";
import { sectionTextEntity } from "@shared/sectionText";
import {
  validateSectionText,
  type SectionTextInput,
} from "@shared/validateSectionText";

import { record, type Actor } from "../audit";
import { listSectionTexts, saveSectionText } from "../sectionTextRepo";

type Env = { Variables: { actor: Actor } };

const asText = (v: unknown): string => (typeof v === "string" ? v : "");

/** JSON mentah → `SectionTextInput`. Semua isian dipaksa ke bentuknya, tidak
 *  dipercaya: satu `null` di tempat string sudah cukup membuat pemecah baris
 *  melempar dan endpoint membalas 500 tanpa keterangan berguna.
 *
 *  ⚠️ `key` sengaja TIDAK dibaca dari body — alamatnya di URL. Kalau body
 *  ikut menentukan, satu permintaan yang dikarang bisa menulis judul seksi
 *  lain lewat endpoint seksi ini. */
export function parseSectionTextInput(raw: unknown): SectionTextInput {
  const body = (raw ?? {}) as Record<string, unknown>;
  return {
    heading: asText(body.heading),
    subheading: asText(body.subheading),
  };
}

const sectionTextRoute = new Hono<Env>();

/**
 * Sebelas judul seksi untuk panel admin, urut seperti di situs.
 *
 * Situs publik tidak pernah memanggil endpoint ini; ia membaca `content.json`.
 */
sectionTextRoute.get("/", async (c) => {
  return c.json({ sectionTexts: await listSectionTexts() });
});

/** PUT, bukan PATCH: body-nya SELURUH isi satu seksi, dan apa pun yang tidak
 *  ikut dikirim akan hilang. Cocok dengan form admin, yang memang selalu
 *  mengirim seluruh isian. */
sectionTextRoute.put("/:key", async (c) => {
  const key = c.req.param("key");
  /* 404, bukan 422: yang salah alamatnya, bukan isinya. Kunci di luar daftar
     berarti panel menunjuk seksi yang tidak ada di situs ini. */
  if (!isSectionTextKey(key)) return c.json({ pesan: "Seksi tidak ditemukan." }, 404);

  const input = parseSectionTextInput(await c.req.json().catch(() => ({})));

  const errors = validateSectionText(key, input);
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const sectionText = await saveSectionText(key, input);
  await record({
    actor: c.get("actor"),
    entity: sectionTextEntity(key),
    /* Uuid barisnya, bukan kuncinya: kolom `audit_log.entity_id` bertipe
       uuid, dan itulah alasan tabel ini punya `id` sendiri padahal `key`
       sudah unik. */
    entityId: sectionText.id,
    action: "update",
    snapshot: sectionText,
  });
  return c.json({ sectionText });
});

export default sectionTextRoute;
