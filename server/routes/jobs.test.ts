/**
 * API lowongan, melawan Postgres sungguhan.
 *
 * Bukan mock: yang paling mungkin salah di lapisan ini justru hal-hal yang
 * mock tidak pernah tahu — indeks unik parsial pada slug, transaksi empat
 * tabel, dan soft delete yang harus menghilangkan baris dari daftar tanpa
 * menghilangkannya dari database.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

import { app } from "../app";
import type { JobRecord } from "../jobsRepo";
import { db, sql } from "../db/client";
import { auditLog, jobCopy, jobSkills, jobs } from "../db/schema";
import {
  asEditor,
  jobBody,
  loginAsEditor,
  resetDb,
  type Login,
} from "../test/helpers";

/** `res.json()` mengembalikan `unknown` — bentuknya diberikan di sini sekali,
 *  supaya test membaca seperti pemakaian API dan bukan seperti pergulatan tipe. */
const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;
type JobRes = { job: JobRecord };
type ListRes = { jobs: JobRecord[] };
type ErrRes = { errors: Record<string, string> };

let login: Login;
let api: ReturnType<typeof asEditor>;

beforeEach(async () => {
  await resetDb();
  login = await loginAsEditor();
  api = asEditor(login);
});

afterAll(async () => {
  await sql.end();
});

const create = async (over: Record<string, unknown> = {}) => {
  const res = await api("/api/jobs", {
    method: "POST",
    body: JSON.stringify(jobBody(over)),
  });
  return { res, body: await json<JobRes & ErrRes>(res) };
};

describe("gerbang login", () => {
  it("tanpa sesi, semua endpoint konten tertutup", async () => {
    const anon = (path: string, init: RequestInit = {}) =>
      app.request(path, {
        ...init,
        headers: { "content-type": "application/json" },
      });

    expect((await anon("/api/jobs")).status).toBe(401);
    expect(
      (await anon("/api/jobs", { method: "POST", body: "{}" })).status,
    ).toBe(401);
    expect(
      (await anon("/api/jobs/apa-saja", { method: "DELETE" })).status,
    ).toBe(401);
    expect((await anon("/api/publish/status")).status).toBe(401);
  });

  it("health tetap terbuka", async () => {
    expect((await app.request("/api/health")).status).toBe(200);
  });
});

describe("membuat lowongan", () => {
  it("menyimpan isian beserta anaknya dalam satu transaksi", async () => {
    const { res, body } = await create();

    expect(res.status).toBe(201);
    expect(body.job.title).toBe("Data Engineer");
    expect(body.job.slug).toBe("data-engineer");
    expect(body.job.skills).toEqual(["SQL", "Python"]);
    expect(body.job.detail).toBeNull();

    const skills = await db
      .select()
      .from(jobSkills)
      .where(eq(jobSkills.jobId, body.job.id));
    expect(skills.map((s) => [s.position, s.label])).toEqual([
      [0, "SQL"],
      [1, "Python"],
    ]);
  });

  it("slug dibuat otomatis dari judul", async () => {
    const { body } = await create({ title: "Senior Product Builder" });
    expect(body.job.slug).toBe("senior-product-builder");
  });

  it("isi dua bahasa tersimpan sebagai baris terpisah per bahasa", async () => {
    const { body } = await create({
      detail: {
        en: {
          intro: "Join us.",
          responsibilities: ["Build pipelines", "Ship"],
          qualifications: ["SQL"],
        },
        id: {
          intro: "Bergabunglah.",
          responsibilities: ["Bangun jalur data", "Rilis"],
          qualifications: ["SQL"],
        },
      },
    });

    expect(body.job.detail?.id.responsibilities).toEqual([
      "Bangun jalur data",
      "Rilis",
    ]);

    const copies = await db
      .select()
      .from(jobCopy)
      .where(eq(jobCopy.jobId, body.job.id));
    expect(copies.map((c) => c.lang).sort()).toEqual(["en", "id"]);
  });

  it("detail yang kedua bahasanya kosong dianggap tidak ada", async () => {
    const { body } = await create({
      detail: {
        en: { intro: "  ", responsibilities: [], qualifications: [] },
        id: { intro: "", responsibilities: [""], qualifications: [] },
      },
    });
    /* Bukan objek berisi string kosong: bedanya menentukan barisnya jadi
       accordion atau tautan ke halaman yang kosong melompong. */
    expect(body.job.detail).toBeNull();
  });

  it("draft boleh setengah jadi, tayang tidak", async () => {
    const draft = await api("/api/jobs", {
      method: "POST",
      body: JSON.stringify({ title: "Belum selesai", state: "draft" }),
    });
    expect(draft.status).toBe(201);

    const { res, body } = await create({ overview: "", skills: [] });
    expect(res.status).toBe(422);
    expect(body.errors.overview).toBeTruthy();
    expect(body.errors.skills).toBeTruthy();
  });

  it("slug bentrok ditolak dengan pesan yang menyebut slugnya", async () => {
    await create();
    const { res, body } = await create({ title: "Data  Engineer" });

    expect(res.status).toBe(422);
    expect(body.errors.slug).toContain("data-engineer");

    const rows = await db.select().from(jobs);
    expect(rows).toHaveLength(1);
  });
});

describe("daftar & ambil satu", () => {
  it("draft ikut di daftar admin", async () => {
    await create();
    await api("/api/jobs", {
      method: "POST",
      body: JSON.stringify(jobBody({ title: "Rahasia", state: "draft" })),
    });

    const list = await json<ListRes>(await api("/api/jobs"));
    expect(list.jobs.map((j) => j.title).sort()).toEqual([
      "Data Engineer",
      "Rahasia",
    ]);
  });

  it("lowongan yang tidak ada membalas 404, bukan 500", async () => {
    const res = await api(
      "/api/jobs/00000000-0000-0000-0000-000000000000",
    );
    expect(res.status).toBe(404);
  });
});

describe("mengubah lowongan", () => {
  it("PUT mengganti seluruh isi, termasuk anaknya", async () => {
    const { body: dibuat } = await create({ skills: ["SQL", "Python", "dbt"] });

    const res = await api(`/api/jobs/${dibuat.job.id}`, {
      method: "PUT",
      body: JSON.stringify(
        jobBody({ title: "Data Engineer", skills: ["Go"], askGithub: false }),
      ),
    });
    const body = await json<JobRes>(res);

    expect(res.status).toBe(200);
    expect(body.job.skills).toEqual(["Go"]);
    expect(body.job.askGithub).toBe(false);

    const skills = await db
      .select()
      .from(jobSkills)
      .where(eq(jobSkills.jobId, dibuat.job.id));
    expect(skills).toHaveLength(1);
  });

  it("updated_at maju — Postgres tidak melakukannya sendiri", async () => {
    const { body: dibuat } = await create();
    const sebelum = new Date(dibuat.job.updatedAt).getTime();

    await new Promise((r) => setTimeout(r, 5));
    const res = await api(`/api/jobs/${dibuat.job.id}`, {
      method: "PUT",
      body: JSON.stringify(jobBody({ overview: "Ringkasan yang diperbarui." })),
    });
    const body = await json<JobRes>(res);

    expect(new Date(body.job.updatedAt).getTime()).toBeGreaterThan(sebelum);
  });

  it("slug sendiri tidak dihitung bentrok", async () => {
    const { body: dibuat } = await create();
    const res = await api(`/api/jobs/${dibuat.job.id}`, {
      method: "PUT",
      body: JSON.stringify(jobBody({ overview: "Diubah sedikit saja." })),
    });
    expect(res.status).toBe(200);
  });
});

describe("hapus = soft delete", () => {
  it("hilang dari daftar, masih ada di database", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/jobs/${dibuat.job.id}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect((await json<{ deleted: string }>(res)).deleted).toBe("Data Engineer");

    const list = await json<ListRes>(await api("/api/jobs"));
    expect(list.jobs).toHaveLength(0);

    const rows = await db.select().from(jobs);
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).not.toBeNull();
  });

  it("slugnya bebas lagi dipakai lowongan baru", async () => {
    const { body: dibuat } = await create();
    await api(`/api/jobs/${dibuat.job.id}`, { method: "DELETE" });

    /* Inilah alasan indeks uniknya parsial (`where deleted_at is null`).
       Indeks unik biasa akan mengunci "data-engineer" selamanya, dan editor
       tidak akan pernah tahu kenapa judul yang sama ditolak terus. */
    const { res } = await create();
    expect(res.status).toBe(201);
  });

  it("menghapus dua kali membalas 404", async () => {
    const { body: dibuat } = await create();
    await api(`/api/jobs/${dibuat.job.id}`, { method: "DELETE" });
    const kedua = await api(`/api/jobs/${dibuat.job.id}`, { method: "DELETE" });
    expect(kedua.status).toBe(404);
  });
});

describe("audit log", () => {
  it("mencatat siapa melakukan apa, dengan salinan isinya", async () => {
    const { body: dibuat } = await create();
    await api(`/api/jobs/${dibuat.job.id}`, {
      method: "PUT",
      body: JSON.stringify(jobBody({ overview: "Diubah." })),
    });
    await api(`/api/jobs/${dibuat.job.id}`, { method: "DELETE" });

    const rows = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entity, "job"), eq(auditLog.entityId, dibuat.job.id)));

    expect(rows.map((r) => r.action).sort()).toEqual([
      "create",
      "delete",
      "update",
    ]);
    expect(rows.every((r) => r.userName === "Editor Test")).toBe(true);

    /* Salinan saat dihapus adalah satu-satunya cara memulihkan isi lowongan
       tanpa membongkar backup. */
    const dihapus = rows.find((r) => r.action === "delete");
    expect((dihapus?.snapshot as { title: string }).title).toBe("Data Engineer");
  });
});
