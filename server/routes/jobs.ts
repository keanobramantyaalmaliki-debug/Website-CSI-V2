/**
 * Endpoint lowongan.
 *
 * Route di sini hanya melakukan tiga hal: menerjemahkan body request jadi
 * bentuk yang dimengerti, memanggil `jobsRepo`, dan menerjemahkan hasilnya jadi
 * respons. Tidak ada SQL dan tidak ada aturan validasi yang ditulis ulang —
 * aturannya di `shared/validateJob.ts`, dipakai bersama panel admin supaya
 * pesan yang dilihat editor sama persis di kedua sisi.
 */

import { Hono } from "hono";
import { JOB_STATES, slugify, type Job, type JobState } from "@shared/job";
import { validateJob, type JobInput } from "@shared/validateJob";

import { record, type Actor } from "../audit";
import {
  createJob,
  getJobById,
  listJobs,
  slugTaken,
  softDeleteJob,
  updateJob,
} from "../jobsRepo";

type Env = { Variables: { actor: Actor } };

const asText = (v: unknown): string => (typeof v === "string" ? v : "");
const asList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/**
 * Ubah JSON mentah jadi `JobInput`.
 *
 * Semua isian dipaksa ke bentuk yang benar alih-alih dipercaya. Body request
 * datang dari luar proses ini; satu isian yang ternyata `null` di tempat string
 * diharapkan sudah cukup untuk membuat `.trim()` melempar dan endpoint-nya
 * membalas 500 tanpa keterangan berguna.
 */
function parseJobInput(raw: unknown): JobInput {
  const body = (raw ?? {}) as Record<string, unknown>;

  const state = JOB_STATES.includes(body.state as JobState)
    ? (body.state as JobState)
    : "draft";

  const title = asText(body.title).trim();

  /* Slug dibuat dari judul kalau editor tidak mengisinya — di panel admin
     isian itu tersembunyi di bagian "lanjutan" dan hampir selalu kosong. */
  const slug = asText(body.slug).trim() || slugify(title);

  let detail: Job["detail"] = null;
  const rawDetail = body.detail as Record<string, unknown> | null | undefined;
  if (rawDetail && typeof rawDetail === "object") {
    const lang = (key: "en" | "id") => {
      const copy = (rawDetail[key] ?? {}) as Record<string, unknown>;
      return {
        intro: asText(copy.intro),
        responsibilities: asList(copy.responsibilities),
        qualifications: asList(copy.qualifications),
      };
    };
    const parsed = { en: lang("en"), id: lang("id") };

    /* Kalau KEDUA bahasa benar-benar kosong, `detail` dijadikan `null` lagi:
       itu artinya "lowongan ini belum punya halaman sendiri", dan bedanya
       menentukan barisnya jadi accordion atau tautan. Menyimpan objek berisi
       string kosong akan membuat situs menautkan ke halaman kosong. */
    const isi = (c: (typeof parsed)["en"]) =>
      c.intro.trim() ||
      c.responsibilities.some((t) => t.trim()) ||
      c.qualifications.some((t) => t.trim());
    detail = isi(parsed.en) || isi(parsed.id) ? parsed : null;
  }

  return {
    slug,
    title,
    department: asText(body.department),
    state,
    overview: asText(body.overview),
    photo: asText(body.photo),
    skills: asList(body.skills),
    askGithub: body.askGithub === true,
    detail,
  };
}

const jobsRoute = new Hono<Env>();

/** Daftar untuk panel admin — termasuk draft. Situs publik tidak pernah
 *  memanggil endpoint ini; ia membaca `content.json`. */
jobsRoute.get("/", async (c) => {
  return c.json({ jobs: await listJobs({ includeDrafts: true }) });
});

jobsRoute.get("/:id", async (c) => {
  const job = await getJobById(c.req.param("id"));
  if (!job) return c.json({ error: "Lowongan tidak ditemukan." }, 404);
  return c.json({ job });
});

jobsRoute.post("/", async (c) => {
  const input = parseJobInput(await c.req.json().catch(() => ({})));

  const errors = validateJob(input);
  if (await slugTaken(input.slug)) {
    errors.slug = `Alamat halaman "${input.slug}" sudah dipakai lowongan lain.`;
  }
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const job = await createJob(input);
  await record({
    actor: c.get("actor"),
    entity: "job",
    entityId: job.id,
    action: "create",
    snapshot: job,
  });
  return c.json({ job }, 201);
});

/**
 * PUT, bukan PATCH: body-nya SELURUH lowongan, dan apa pun yang tidak ikut
 * dikirim akan hilang.
 *
 * Semantiknya dipilih supaya cocok dengan form admin, yang memang selalu
 * mengirim seluruh isian. PATCH akan menjanjikan "kirim yang berubah saja" —
 * janji yang tidak ditepati kode ini, dan cara menemukannya adalah lewat
 * halaman lowongan yang tiba-tiba kosong.
 */
jobsRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const input = parseJobInput(await c.req.json().catch(() => ({})));

  const errors = validateJob(input);
  if (await slugTaken(input.slug, id)) {
    errors.slug = `Alamat halaman "${input.slug}" sudah dipakai lowongan lain.`;
  }
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const job = await updateJob(id, input);
  if (!job) return c.json({ error: "Lowongan tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "job",
    entityId: id,
    action: "update",
    snapshot: job,
  });
  return c.json({ job });
});

jobsRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const job = await softDeleteJob(id);
  if (!job) return c.json({ error: "Lowongan tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "job",
    entityId: id,
    action: "delete",
    /* Isi lengkap disimpan justru DI SINI: kalau hapusnya keliru, catatan ini
       yang membuat isinya bisa disusun kembali tanpa membongkar backup. */
    snapshot: job,
  });
  return c.json({ ok: true, deleted: job.title });
});

export default jobsRoute;
