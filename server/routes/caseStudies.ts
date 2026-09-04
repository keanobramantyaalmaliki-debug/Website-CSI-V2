/**
 * Endpoint case study (Work → "Case Studies").
 *
 * Bentuknya menyalin `routes/workProjects.ts` — terjemahkan body, panggil repo,
 * terjemahkan hasil, plus `POST /urutkan` karena urutan blok adalah konten yang
 * tayang.
 *
 * Isian yang bukan string biasa cuma satu lagi di sini: `scope` datang sebagai
 * array, jadi ia dipaksa ke bentuknya sendiri (`asTextList`).
 */

import { Hono } from "hono";
import { CASE_STUDY_STATES, type CaseStudyState } from "@shared/caseStudy";
import {
  validateCaseStudy,
  type CaseStudyInput,
} from "@shared/validateCaseStudy";

import { record, type Actor } from "../audit";
import {
  caseStudyTitleTaken,
  createCaseStudy,
  getCaseStudyById,
  listCaseStudies,
  reorderCaseStudies,
  softDeleteCaseStudy,
  updateCaseStudy,
} from "../caseStudiesRepo";

type Env = { Variables: { actor: Actor } };

const asText = (v: unknown): string => (typeof v === "string" ? v : "");

/** Array label mentah → array string. Yang bukan string dibuang, bukan diubah
 *  jadi `"undefined"` — alasan yang sama seperti di route proyek. */
const asTextList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** JSON mentah → `CaseStudyInput`. Semua isian dipaksa ke bentuknya, tidak
 *  dipercaya — lihat alasan yang sama di `routes/values.ts`. */
export function parseCaseStudyInput(raw: unknown): CaseStudyInput {
  const body = (raw ?? {}) as Record<string, unknown>;

  const state = CASE_STUDY_STATES.includes(body.state as CaseStudyState)
    ? (body.state as CaseStudyState)
    : "draft";

  return {
    title: asText(body.title),
    client: asText(body.client),
    year: asText(body.year),
    industry: asText(body.industry),
    scope: asTextList(body.scope),
    outcome: asText(body.outcome),
    quote: asText(body.quote),
    desc: asText(body.desc),
    image: asText(body.image),
    state,
  };
}

const caseStudiesRoute = new Hono<Env>();

/** Daftar untuk panel admin — termasuk draft. Situs publik tidak pernah
 *  memanggil endpoint ini; ia membaca `content.json`. */
caseStudiesRoute.get("/", async (c) => {
  return c.json({ studies: await listCaseStudies({ includeDrafts: true }) });
});

caseStudiesRoute.post("/", async (c) => {
  const input = parseCaseStudyInput(await c.req.json().catch(() => ({})));

  const errors = validateCaseStudy(input);
  if (input.title.trim() && (await caseStudyTitleTaken(input.title))) {
    errors.title = `Judul "${input.title.trim()}" sudah dipakai case study lain.`;
  }
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const study = await createCaseStudy(input);
  await record({
    actor: c.get("actor"),
    entity: "case_study",
    entityId: study.id,
    action: "create",
    snapshot: study,
  });
  return c.json({ study }, 201);
});

/** Ditaruh SEBELUM `/:id` dengan sengaja — Hono mencocokkan route sesuai
 *  urutan pendaftaran, jadi `POST /:id` yang didaftarkan lebih dulu akan
 *  menangkap "urutkan" sebagai sebuah id. Lihat catatan lengkapnya di
 *  `routes/values.ts`. */
caseStudiesRoute.post("/urutkan", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is string => typeof x === "string")
    : [];

  const studies = await reorderCaseStudies(ids);
  if (!studies) {
    return c.json(
      {
        error:
          "Urutan yang dikirim tidak cocok dengan daftar case study yang ada. Muat ulang halaman lalu coba lagi.",
      },
      422,
    );
  }

  await record({
    actor: c.get("actor"),
    entity: "case_study",
    action: "update",
    snapshot: { urutan: studies.map((s) => s.title) },
  });
  return c.json({ studies });
});

caseStudiesRoute.get("/:id", async (c) => {
  const study = await getCaseStudyById(c.req.param("id"));
  if (!study) return c.json({ error: "Case study tidak ditemukan." }, 404);
  return c.json({ study });
});

/** PUT, bukan PATCH: body-nya SELURUH cerita, dan apa pun yang tidak ikut
 *  dikirim akan hilang. Cocok dengan form admin, yang memang selalu mengirim
 *  seluruh isian. */
caseStudiesRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const input = parseCaseStudyInput(await c.req.json().catch(() => ({})));

  const errors = validateCaseStudy(input);
  if (input.title.trim() && (await caseStudyTitleTaken(input.title, id))) {
    errors.title = `Judul "${input.title.trim()}" sudah dipakai case study lain.`;
  }
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const study = await updateCaseStudy(id, input);
  if (!study) return c.json({ error: "Case study tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "case_study",
    entityId: id,
    action: "update",
    snapshot: study,
  });
  return c.json({ study });
});

caseStudiesRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const study = await softDeleteCaseStudy(id);
  if (!study) return c.json({ error: "Case study tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "case_study",
    entityId: id,
    action: "delete",
    /* Isi lengkap disimpan justru DI SINI: kalau hapusnya keliru, catatan ini
       yang membuat isinya bisa disusun kembali tanpa membongkar backup. */
    snapshot: study,
  });
  return c.json({ ok: true, deleted: study.title });
});

export default caseStudiesRoute;
