/**
 * Endpoint crew (People → "The Crew").
 *
 * Bentuknya menyalin `routes/values.ts` — terjemahkan body, panggil repo,
 * terjemahkan hasil. Yang tidak ada di sini: `POST /urutkan`. Situs
 * mengurutkan crew A–Z sendiri di dalam tiap departemen, jadi endpoint
 * mengurutkan cuma akan memberi editor tombol yang tidak mengubah apa pun.
 * Alasan lengkapnya di `server/db/schema.ts`.
 */

import { Hono } from "hono";
import {
  CREW_CATEGORIES,
  CREW_STATES,
  SOCIAL_PLATFORMS,
  type CrewCategory,
  type CrewSocial,
  type CrewState,
  type SocialPlatform,
} from "@shared/crew";
import { validateCrew, type CrewInput } from "@shared/validateCrew";

import { record, type Actor } from "../audit";
import {
  createCrew,
  crewNameTaken,
  getCrewById,
  listCrew,
  softDeleteCrew,
  updateCrew,
} from "../crewRepo";

type Env = { Variables: { actor: Actor } };

const asText = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Tautan sosial mentah → daftar yang bentuknya pasti.
 *
 * Baris yang platform-nya tidak dikenal DIBUANG di sini, bukan diluluskan ke
 * `validateCrew` supaya ditolak dengan pesan. Editor tidak pernah bisa
 * mengetik platform sendiri — form-nya `<select>` berisi tiga pilihan — jadi
 * nilai asing artinya body-nya bukan dari form, dan pesan kesalahan berbahasa
 * Indonesia untuk kasus itu cuma akan membingungkan orang yang benar.
 */
function parseSocial(raw: unknown): CrewSocial[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item): CrewSocial[] => {
    const row = (item ?? {}) as Record<string, unknown>;
    const platform = row.platform;
    if (!SOCIAL_PLATFORMS.includes(platform as SocialPlatform)) return [];
    return [{ platform: platform as SocialPlatform, url: asText(row.url) }];
  });
}

/** JSON mentah → `CrewInput`. Semua isian dipaksa ke bentuknya, tidak
 *  dipercaya: satu `null` di tempat string sudah cukup membuat `.trim()`
 *  melempar dan endpoint membalas 500 tanpa keterangan berguna. */
export function parseCrewInput(raw: unknown): CrewInput {
  const body = (raw ?? {}) as Record<string, unknown>;

  const state = CREW_STATES.includes(body.state as CrewState)
    ? (body.state as CrewState)
    : "draft";

  /* Departemen tidak punya nilai bawaan yang aman — "Management" untuk orang
     yang seharusnya Developer adalah kesalahan yang tersimpan diam-diam. Yang
     asing dibiarkan lewat sebagai string apa adanya supaya `validateCrew`
     yang menolaknya dengan kalimat yang bisa dibaca editor. */
  const category = CREW_CATEGORIES.includes(body.category as CrewCategory)
    ? (body.category as CrewCategory)
    : (asText(body.category) as CrewCategory);

  return {
    name: asText(body.name),
    role: asText(body.role),
    category,
    photo: asText(body.photo),
    social: parseSocial(body.social),
    state,
  };
}

const crewRoute = new Hono<Env>();

/** Daftar untuk panel admin — termasuk draft. Situs publik tidak pernah
 *  memanggil endpoint ini; ia membaca `content.json`. */
crewRoute.get("/", async (c) => {
  return c.json({ crew: await listCrew({ includeDrafts: true }) });
});

crewRoute.post("/", async (c) => {
  const input = parseCrewInput(await c.req.json().catch(() => ({})));

  const errors = validateCrew(input);
  if (input.name.trim() && (await crewNameTaken(input.name))) {
    errors.name = `Nama "${input.name.trim()}" sudah dipakai anggota lain.`;
  }
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const member = await createCrew(input);
  await record({
    actor: c.get("actor"),
    entity: "crew",
    entityId: member.id,
    action: "create",
    snapshot: member,
  });
  return c.json({ member }, 201);
});

crewRoute.get("/:id", async (c) => {
  const member = await getCrewById(c.req.param("id"));
  if (!member) return c.json({ error: "Anggota crew tidak ditemukan." }, 404);
  return c.json({ member });
});

/** PUT, bukan PATCH: body-nya SELURUH anggota, dan apa pun yang tidak ikut
 *  dikirim akan hilang. Cocok dengan form admin, yang memang selalu mengirim
 *  seluruh isian. */
crewRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const input = parseCrewInput(await c.req.json().catch(() => ({})));

  const errors = validateCrew(input);
  if (input.name.trim() && (await crewNameTaken(input.name, id))) {
    errors.name = `Nama "${input.name.trim()}" sudah dipakai anggota lain.`;
  }
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const member = await updateCrew(id, input);
  if (!member) return c.json({ error: "Anggota crew tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "crew",
    entityId: id,
    action: "update",
    snapshot: member,
  });
  return c.json({ member });
});

crewRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const member = await softDeleteCrew(id);
  if (!member) return c.json({ error: "Anggota crew tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "crew",
    entityId: id,
    action: "delete",
    /* Isi lengkap disimpan justru DI SINI: kalau hapusnya keliru, catatan ini
       yang membuat isinya bisa disusun kembali tanpa membongkar backup. */
    snapshot: member,
  });
  return c.json({ ok: true, deleted: member.name });
});

export default crewRoute;
