/**
 * Endpoint seksi Visi (halaman depan → paragraf penutup sebelum Contact).
 *
 * Dua route saja, dan itu bentuk yang benar untuk satu baris: `GET /` untuk
 * membaca, `PUT /` untuk menyimpan. Yang tidak ada di sini sengaja tidak ada —
 *
 * - **Tidak ada `POST /`.** Barisnya tidak pernah "dibuat" oleh editor; ia
 *   sudah ada sejak seed, dan `saveVision()` yang mengurus kalau belum.
 * - **Tidak ada `DELETE`.** Seksi Visi tidak boleh menghilang: `pt-20 pb-20`
 *   miliknya satu-satunya yang menjatah celah 80px antara plank Industries dan
 *   Contact di mobile.
 * - **Tidak ada `POST /urutkan`.** Tidak ada yang bisa diurutkan.
 * - **Tidak ada `/:id`.** Alamat barisnya adalah endpoint-nya sendiri.
 *
 * Konsekuensinya juga bagus: tanpa `/:id`, jebakan urutan pendaftaran Hono
 * yang menghantui route lain (`POST /urutkan` wajib sebelum `POST /:id`) tidak
 * punya tempat untuk muncul di sini.
 */

import { Hono } from "hono";
import { validateVision, type VisionInput } from "@shared/validateVision";

import { record, type Actor } from "../audit";
import { getVision, saveVision } from "../visionRepo";

type Env = { Variables: { actor: Actor } };

const asText = (v: unknown): string => (typeof v === "string" ? v : "");

/** JSON mentah → `VisionInput`. Semua isian dipaksa ke bentuknya, tidak
 *  dipercaya: satu `null` di tempat string sudah cukup membuat `.trim()`
 *  melempar dan endpoint membalas 500 tanpa keterangan berguna. */
export function parseVisionInput(raw: unknown): VisionInput {
  const body = (raw ?? {}) as Record<string, unknown>;
  return {
    statement: asText(body.statement),
    photo: asText(body.photo),
  };
}

const visionRoute = new Hono<Env>();

/**
 * Isi visi untuk panel admin.
 *
 * Membalas `vision: null` — bukan 404 — kalau barisnya belum ada. Database
 * yang belum di-seed bukan permintaan yang salah alamat, dan 404 akan membuat
 * panel menampilkan "tidak ditemukan" untuk satu-satunya halaman yang justru
 * ingin dibuka editor supaya bisa mengisinya.
 *
 * Situs publik tidak pernah memanggil endpoint ini; ia membaca `content.json`.
 */
visionRoute.get("/", async (c) => {
  return c.json({ vision: await getVision() });
});

/** PUT, bukan PATCH: body-nya SELURUH isi visi, dan apa pun yang tidak ikut
 *  dikirim akan hilang. Cocok dengan form admin, yang memang selalu mengirim
 *  seluruh isian. */
visionRoute.put("/", async (c) => {
  const input = parseVisionInput(await c.req.json().catch(() => ({})));

  const errors = validateVision(input);
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const vision = await saveVision(input);
  await record({
    actor: c.get("actor"),
    entity: "vision",
    /* Tanpa `entityId`: kolomnya `uuid` di `audit_log`, sedangkan visi
       ber-id angka 1. Bukan kehilangan apa-apa — `entity: "vision"` sudah
       menunjuk satu-satunya baris yang ada. */
    action: "update",
    snapshot: vision,
  });
  return c.json({ vision });
});

export default visionRoute;
