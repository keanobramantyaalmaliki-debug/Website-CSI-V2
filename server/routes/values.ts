/**
 * Endpoint nilai (People → "What We Stand For").
 *
 * Bentuknya menyalin `routes/jobs.ts` — terjemahkan body, panggil repo,
 * terjemahkan hasil — dengan satu tambahan yang tidak ada di lowongan:
 * `POST /urutkan`. Urutan panel adalah konten yang tayang, jadi ia butuh
 * endpoint sendiri; menyelipkannya sebagai isian di form akan meminta editor
 * mengarang angka `sortOrder`, padahal yang dia lihat adalah tumpukan panel.
 */

import { Hono } from "hono";
import { VALUE_STATES, type ValueState } from "@shared/value";
import { validateValue, type ValueInput } from "@shared/validateValue";

import { record, type Actor } from "../audit";
import {
  createValue,
  getValueById,
  listValues,
  reorderValues,
  softDeleteValue,
  updateValue,
  valueTitleTaken,
} from "../valuesRepo";

type Env = { Variables: { actor: Actor } };

const asText = (v: unknown): string => (typeof v === "string" ? v : "");

/** JSON mentah → `ValueInput`. Semua isian dipaksa ke bentuknya, tidak
 *  dipercaya: satu `null` di tempat string sudah cukup membuat `.trim()`
 *  melempar dan endpoint membalas 500 tanpa keterangan berguna. */
function parseValueInput(raw: unknown): ValueInput {
  const body = (raw ?? {}) as Record<string, unknown>;

  const state = VALUE_STATES.includes(body.state as ValueState)
    ? (body.state as ValueState)
    : "draft";

  return {
    title: asText(body.title),
    tagline: asText(body.tagline),
    description: asText(body.description),
    photo: asText(body.photo),
    state,
  };
}

const valuesRoute = new Hono<Env>();

/** Daftar untuk panel admin — termasuk draft. Situs publik tidak pernah
 *  memanggil endpoint ini; ia membaca `content.json`. */
valuesRoute.get("/", async (c) => {
  return c.json({ values: await listValues({ includeDrafts: true }) });
});

valuesRoute.post("/", async (c) => {
  const input = parseValueInput(await c.req.json().catch(() => ({})));

  const errors = validateValue(input);
  if (input.title.trim() && (await valueTitleTaken(input.title))) {
    errors.title = `Judul "${input.title.trim()}" sudah dipakai nilai lain.`;
  }
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const value = await createValue(input);
  await record({
    actor: c.get("actor"),
    entity: "value",
    entityId: value.id,
    action: "create",
    snapshot: value,
  });
  return c.json({ value }, 201);
});

/**
 * Ditaruh SEBELUM `/:id` dengan sengaja.
 *
 * Hono mencocokkan route sesuai urutan pendaftaran; kalau `POST /:id` pernah
 * ada dan didaftarkan lebih dulu, "urutkan" akan tertangkap sebagai sebuah id.
 * Hari ini `POST /:id` tidak ada, jadi ini bukan perbaikan bug melainkan
 * pagar untuk route berikutnya yang ditambahkan orang lain.
 */
valuesRoute.post("/urutkan", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is string => typeof x === "string")
    : [];

  const values = await reorderValues(ids);
  if (!values) {
    return c.json(
      {
        error:
          "Urutan yang dikirim tidak cocok dengan daftar nilai yang ada. Muat ulang halaman lalu coba lagi.",
      },
      422,
    );
  }

  await record({
    actor: c.get("actor"),
    entity: "value",
    action: "update",
    snapshot: { urutan: values.map((v) => v.title) },
  });
  return c.json({ values });
});

valuesRoute.get("/:id", async (c) => {
  const value = await getValueById(c.req.param("id"));
  if (!value) return c.json({ error: "Nilai tidak ditemukan." }, 404);
  return c.json({ value });
});

/** PUT, bukan PATCH: body-nya SELURUH nilai, dan apa pun yang tidak ikut
 *  dikirim akan hilang. Cocok dengan form admin, yang memang selalu mengirim
 *  seluruh isian. */
valuesRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const input = parseValueInput(await c.req.json().catch(() => ({})));

  const errors = validateValue(input);
  if (input.title.trim() && (await valueTitleTaken(input.title, id))) {
    errors.title = `Judul "${input.title.trim()}" sudah dipakai nilai lain.`;
  }
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const value = await updateValue(id, input);
  if (!value) return c.json({ error: "Nilai tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "value",
    entityId: id,
    action: "update",
    snapshot: value,
  });
  return c.json({ value });
});

valuesRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const value = await softDeleteValue(id);
  if (!value) return c.json({ error: "Nilai tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "value",
    entityId: id,
    action: "delete",
    /* Isi lengkap disimpan justru DI SINI: kalau hapusnya keliru, catatan ini
       yang membuat isinya bisa disusun kembali tanpa membongkar backup. */
    snapshot: value,
  });
  return c.json({ ok: true, deleted: value.title });
});

export default valuesRoute;
