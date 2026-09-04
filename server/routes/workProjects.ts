/**
 * Endpoint proyek (Work → "Selected Work").
 *
 * Bentuknya menyalin `routes/values.ts` — terjemahkan body, panggil repo,
 * terjemahkan hasil, plus `POST /urutkan` karena urutan kartu adalah konten
 * yang tayang.
 *
 * Bedanya cuma satu isian: `tags` datang sebagai array, jadi ia dipaksa ke
 * bentuknya sendiri (`asTextList`) alih-alih lewat `asText`.
 */

import { Hono } from "hono";
import {
  WORK_PROJECT_STATES,
  type WorkProjectState,
} from "@shared/workProject";
import {
  validateWorkProject,
  type WorkProjectInput,
} from "@shared/validateWorkProject";

import { record, type Actor } from "../audit";
import {
  createWorkProject,
  getWorkProjectById,
  listWorkProjects,
  reorderWorkProjects,
  softDeleteWorkProject,
  updateWorkProject,
  workProjectTitleTaken,
} from "../workProjectsRepo";

type Env = { Variables: { actor: Actor } };

const asText = (v: unknown): string => (typeof v === "string" ? v : "");

/** Array label mentah → array string. Yang bukan string dibuang, bukan
 *  diubah jadi `"undefined"`: label yang tidak terkirim dengan benar lebih baik
 *  hilang daripada tayang sebagai teks omong kosong di kartu. */
const asTextList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** JSON mentah → `WorkProjectInput`. Semua isian dipaksa ke bentuknya, tidak
 *  dipercaya — lihat alasan yang sama di `routes/values.ts`. */
export function parseWorkProjectInput(raw: unknown): WorkProjectInput {
  const body = (raw ?? {}) as Record<string, unknown>;

  const state = WORK_PROJECT_STATES.includes(body.state as WorkProjectState)
    ? (body.state as WorkProjectState)
    : "draft";

  return {
    title: asText(body.title),
    client: asText(body.client),
    year: asText(body.year),
    tags: asTextList(body.tags),
    image: asText(body.image),
    outcome: asText(body.outcome),
    state,
  };
}

const workProjectsRoute = new Hono<Env>();

/** Daftar untuk panel admin — termasuk draft. Situs publik tidak pernah
 *  memanggil endpoint ini; ia membaca `content.json`. */
workProjectsRoute.get("/", async (c) => {
  return c.json({ projects: await listWorkProjects({ includeDrafts: true }) });
});

workProjectsRoute.post("/", async (c) => {
  const input = parseWorkProjectInput(await c.req.json().catch(() => ({})));

  const errors = validateWorkProject(input);
  if (input.title.trim() && (await workProjectTitleTaken(input.title))) {
    errors.title = `Nama proyek "${input.title.trim()}" sudah dipakai proyek lain.`;
  }
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const project = await createWorkProject(input);
  await record({
    actor: c.get("actor"),
    entity: "work_project",
    entityId: project.id,
    action: "create",
    snapshot: project,
  });
  return c.json({ project }, 201);
});

/** Ditaruh SEBELUM `/:id` dengan sengaja — Hono mencocokkan route sesuai
 *  urutan pendaftaran, jadi `POST /:id` yang didaftarkan lebih dulu akan
 *  menangkap "urutkan" sebagai sebuah id. Lihat catatan lengkapnya di
 *  `routes/values.ts`. */
workProjectsRoute.post("/urutkan", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is string => typeof x === "string")
    : [];

  const projects = await reorderWorkProjects(ids);
  if (!projects) {
    return c.json(
      {
        error:
          "Urutan yang dikirim tidak cocok dengan daftar proyek yang ada. Muat ulang halaman lalu coba lagi.",
      },
      422,
    );
  }

  await record({
    actor: c.get("actor"),
    entity: "work_project",
    action: "update",
    snapshot: { urutan: projects.map((p) => p.title) },
  });
  return c.json({ projects });
});

workProjectsRoute.get("/:id", async (c) => {
  const project = await getWorkProjectById(c.req.param("id"));
  if (!project) return c.json({ error: "Proyek tidak ditemukan." }, 404);
  return c.json({ project });
});

/** PUT, bukan PATCH: body-nya SELURUH proyek, dan apa pun yang tidak ikut
 *  dikirim akan hilang. Cocok dengan form admin, yang memang selalu mengirim
 *  seluruh isian. */
workProjectsRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const input = parseWorkProjectInput(await c.req.json().catch(() => ({})));

  const errors = validateWorkProject(input);
  if (input.title.trim() && (await workProjectTitleTaken(input.title, id))) {
    errors.title = `Nama proyek "${input.title.trim()}" sudah dipakai proyek lain.`;
  }
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const project = await updateWorkProject(id, input);
  if (!project) return c.json({ error: "Proyek tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "work_project",
    entityId: id,
    action: "update",
    snapshot: project,
  });
  return c.json({ project });
});

workProjectsRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const project = await softDeleteWorkProject(id);
  if (!project) return c.json({ error: "Proyek tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "work_project",
    entityId: id,
    action: "delete",
    /* Isi lengkap disimpan justru DI SINI: kalau hapusnya keliru, catatan ini
       yang membuat isinya bisa disusun kembali tanpa membongkar backup. */
    snapshot: project,
  });
  return c.json({ ok: true, deleted: project.title });
});

export default workProjectsRoute;
