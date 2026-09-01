/**
 * API proyek, melawan Postgres sungguhan.
 *
 * Yang diuji di sini bukan pemeriksa isian — itu punya testnya sendiri di
 * `shared/` dan tidak butuh database. Yang diuji adalah hal-hal yang cuma
 * muncul saat ada database di belakangnya: urutan kartu yang harus stabil antar
 * query, `POST /urutkan` yang menolak daftar setengah, soft delete yang
 * membebaskan nama — dan satu hal yang tidak dipunyai nilai maupun crew:
 * LABEL, yang tinggal di tabelnya sendiri dan karena itu bisa tertinggal,
 * terbalik urutannya, atau menumpuk tiap kali proyeknya disimpan ulang.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

import { app } from "../app";
import type { WorkProjectRecord } from "../workProjectsRepo";
import { db, sql } from "../db/client";
import { auditLog, workProjects, workProjectTags } from "../db/schema";
import {
  asEditor,
  loginAsEditor,
  projectBody,
  resetDb,
  type Login,
} from "../test/helpers";

const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;
type ProjectRes = { project: WorkProjectRecord };
type ListRes = { projects: WorkProjectRecord[] };
type ErrRes = { errors: Record<string, string>; error?: string };

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
  const res = await api("/api/projects", {
    method: "POST",
    body: JSON.stringify(projectBody(over)),
  });
  return { res, body: await json<ProjectRes & ErrRes>(res) };
};

/** Nama proyek hidup, sesuai urutan yang dibalas API. */
const titles = async () =>
  (await json<ListRes>(await api("/api/projects"))).projects.map((p) => p.title);

describe("gerbang login", () => {
  it("tanpa sesi, endpoint proyek tertutup — termasuk urutkan", async () => {
    const anon = (path: string, init: RequestInit = {}) =>
      app.request(path, {
        ...init,
        headers: { "content-type": "application/json" },
      });

    expect((await anon("/api/projects")).status).toBe(401);
    expect(
      (await anon("/api/projects", { method: "POST", body: "{}" })).status,
    ).toBe(401);
    /* Disebut terpisah karena bentuk pathnya beda sendiri: kalau middleware
       dipasang hanya pada "/api/projects/*", route tanpa id seperti ini gampang
       lolos tanpa ada yang sadar. */
    expect(
      (await anon("/api/projects/urutkan", { method: "POST", body: "{}" }))
        .status,
    ).toBe(401);
    expect(
      (await anon("/api/projects/apa-saja", { method: "DELETE" })).status,
    ).toBe(401);
  });
});

describe("membuat proyek", () => {
  it("menyimpan isian, label, dan menautkan gambarnya", async () => {
    const { res, body } = await create();

    expect(res.status).toBe(201);
    expect(body.project.title).toBe("Citizen Service Portal");
    expect(body.project.client).toBe("Regional Government");
    expect(body.project.year).toBe("2024");
    expect(body.project.image).toBe("/work/citizen-portal.webp");
    expect(body.project.tags).toEqual(["React", "Node.js"]);
    expect(body.project.state).toBe("live");
    /* Belum pernah dipublish, jadi badge "belum tayang" harus menyala sejak
       detik pertama. */
    expect(body.project.publishedAt).toBeNull();
    expect(body.project.unpublished).toBe(true);
  });

  it("spasi di ujung isian dirapikan sebelum disimpan", async () => {
    const { body } = await create({ title: "  Citizen Service Portal  " });
    expect(body.project.title).toBe("Citizen Service Portal");
  });

  it("draft boleh setengah jadi, tayang tidak", async () => {
    const draft = await api("/api/projects", {
      method: "POST",
      body: JSON.stringify({ title: "Belum selesai", state: "draft" }),
    });
    expect(draft.status).toBe(201);

    const { res, body } = await create({ client: "", year: "", image: "" });
    expect(res.status).toBe(422);
    expect(body.errors.client).toBeTruthy();
    expect(body.errors.year).toBeTruthy();
    /* Gambar wajib untuk yang tayang — kartunya seluruhnya gambar, jadi tanpa
       ini yang tayang adalah ikon "gambar rusak" bawaan peramban. */
    expect(body.errors.image).toBeTruthy();
  });

  it("nama kembar ditolak, tanpa membedakan huruf besar-kecil", async () => {
    await create();
    const { res, body } = await create({ title: "citizen service portal" });

    expect(res.status).toBe(422);
    expect(body.errors.title).toContain("citizen service portal");

    const rows = await db.select().from(workProjects);
    expect(rows).toHaveLength(1);
  });
});

describe("label", () => {
  it("urutan label yang dikirim dipertahankan apa adanya", async () => {
    const { body } = await create({ tags: ["Zig", "Ada", "Blade"] });
    /* Bukan A-Z: urutan label adalah urutan yang dipilih editor, dan itu yang
       dibaca kartu di situs. */
    expect(body.project.tags).toEqual(["Zig", "Ada", "Blade"]);
  });

  it("menyimpan ulang mengganti label, bukan menumpuknya", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/projects/${dibuat.project.id}`, {
      method: "PUT",
      body: JSON.stringify(projectBody({ tags: ["Go"] })),
    });
    expect((await json<ProjectRes>(res)).project.tags).toEqual(["Go"]);

    /* Yang dijaga di baris ini adalah tabelnya sendiri: hapus-lalu-sisipkan
       yang lupa menghapus meninggalkan label lama tanpa terlihat di API. */
    const rows = await db.select().from(workProjectTags);
    expect(rows).toHaveLength(1);
  });

  it("proyek tanpa label boleh disimpan", async () => {
    const { res, body } = await create({ tags: [] });
    expect(res.status).toBe(201);
    expect(body.project.tags).toEqual([]);
  });

  it("label kembar ditolak — teksnya dipakai sebagai key React di situs", async () => {
    const { res, body } = await create({ tags: ["React", "react"] });
    expect(res.status).toBe(422);
    expect(body.errors.tags).toBeTruthy();
  });

  it("isian selain teks di dalam daftar label dibuang, bukan disimpan", async () => {
    const res = await api("/api/projects", {
      method: "POST",
      body: JSON.stringify(projectBody({ tags: ["React", 7, null] })),
    });
    expect((await json<ProjectRes>(res)).project.tags).toEqual(["React"]);
  });
});

describe("urutan", () => {
  it("proyek baru mendarat di bawah, bukan di atas", async () => {
    await create({ title: "Citizen Service Portal" });
    await create({ title: "Logistics Command Center" });
    await create({ title: "API Gateway" });

    /* Kartu pertama adalah kartu yang sudah terbuka saat halaman Work dibuka.
       Proyek baru tidak boleh merebut tempat itu tanpa diminta. */
    expect(await titles()).toEqual([
      "Citizen Service Portal",
      "Logistics Command Center",
      "API Gateway",
    ]);
  });

  it("POST /urutkan menyusun ulang dan menaikkan updated_at", async () => {
    const a = (await create({ title: "Citizen Service Portal" })).body.project;
    const b = (await create({ title: "Logistics Command Center" })).body.project;
    const c = (await create({ title: "API Gateway" })).body.project;

    const sebelum = new Date(a.updatedAt).getTime();
    await new Promise((r) => setTimeout(r, 5));

    const res = await api("/api/projects/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [c.id, a.id, b.id] }),
    });
    const body = await json<ListRes>(res);

    expect(res.status).toBe(200);
    expect(body.projects.map((p) => p.title)).toEqual([
      "API Gateway",
      "Citizen Service Portal",
      "Logistics Command Center",
    ]);
    expect(await titles()).toEqual([
      "API Gateway",
      "Citizen Service Portal",
      "Logistics Command Center",
    ]);

    /* Urutan adalah konten yang tayang: memindahkan kartu adalah perubahan
       yang menunggu Publish, bukan preferensi tampilan panel admin. */
    const dipindah = body.projects.find((p) => p.id === a.id);
    expect(new Date(dipindah!.updatedAt).getTime()).toBeGreaterThan(sebelum);
  });

  it("memindahkan urutan tidak menghilangkan label", async () => {
    const a = (await create({ title: "Citizen Service Portal" })).body.project;
    const b = (await create({ title: "API Gateway", tags: ["Go", "Kong"] }))
      .body.project;

    const res = await api("/api/projects/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });
    const body = await json<ListRes>(res);
    expect(body.projects[0].tags).toEqual(["Go", "Kong"]);
  });

  it("daftar yang tidak menyebut semua proyek ditolak, tanpa mengubah apa pun", async () => {
    const a = (await create({ title: "Citizen Service Portal" })).body.project;
    await create({ title: "Logistics Command Center" });
    const c = (await create({ title: "API Gateway" })).body.project;

    const res = await api("/api/projects/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [c.id, a.id] }),
    });
    expect(res.status).toBe(422);
    expect((await json<ErrRes>(res)).error).toBeTruthy();

    /* Yang penting bukan status 422-nya, tapi ini: urutan lama harus utuh.
       Menerima daftar setengah akan meninggalkan yang tak disebut di
       `sortOrder` lamanya dan bertabrakan dengan yang baru. */
    expect(await titles()).toEqual([
      "Citizen Service Portal",
      "Logistics Command Center",
      "API Gateway",
    ]);
  });

  it("id kembar di dalam satu daftar ditolak", async () => {
    const a = (await create({ title: "Citizen Service Portal" })).body.project;
    await create({ title: "API Gateway" });

    const res = await api("/api/projects/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [a.id, a.id] }),
    });
    expect(res.status).toBe(422);
  });

  it("proyek yang sudah dihapus tidak boleh ikut disebut", async () => {
    const a = (await create({ title: "Citizen Service Portal" })).body.project;
    const b = (await create({ title: "API Gateway" })).body.project;
    await api(`/api/projects/${b.id}`, { method: "DELETE" });

    const res = await api("/api/projects/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });
    expect(res.status).toBe(422);
    expect(await titles()).toEqual(["Citizen Service Portal"]);
  });
});

describe("daftar & ambil satu", () => {
  it("draft ikut di daftar admin", async () => {
    await create();
    await api("/api/projects", {
      method: "POST",
      body: JSON.stringify(projectBody({ title: "Rahasia", state: "draft" })),
    });

    expect(await titles()).toEqual(["Citizen Service Portal", "Rahasia"]);
  });

  it("proyek yang tidak ada membalas 404, bukan 500", async () => {
    const res = await api("/api/projects/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});

describe("mengubah proyek", () => {
  it("PUT mengganti seluruh isi", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/projects/${dibuat.project.id}`, {
      method: "PUT",
      body: JSON.stringify(
        projectBody({ outcome: "Hasil yang baru", state: "draft" }),
      ),
    });
    const body = await json<ProjectRes>(res);

    expect(res.status).toBe(200);
    expect(body.project.outcome).toBe("Hasil yang baru");
    expect(body.project.state).toBe("draft");
  });

  it("updated_at maju — Postgres tidak melakukannya sendiri", async () => {
    const { body: dibuat } = await create();
    const sebelum = new Date(dibuat.project.updatedAt).getTime();

    await new Promise((r) => setTimeout(r, 5));
    const res = await api(`/api/projects/${dibuat.project.id}`, {
      method: "PUT",
      body: JSON.stringify(projectBody({ outcome: "Diperbarui." })),
    });
    const body = await json<ProjectRes>(res);

    expect(new Date(body.project.updatedAt).getTime()).toBeGreaterThan(sebelum);
  });

  it("mengubah tidak menggeser urutannya", async () => {
    await create({ title: "Citizen Service Portal" });
    const b = (await create({ title: "Logistics Command Center" })).body.project;
    await create({ title: "API Gateway" });

    await api(`/api/projects/${b.id}`, {
      method: "PUT",
      body: JSON.stringify(
        projectBody({ title: "Logistics Command Center", outcome: "Baru" }),
      ),
    });

    expect(await titles()).toEqual([
      "Citizen Service Portal",
      "Logistics Command Center",
      "API Gateway",
    ]);
  });

  it("nama sendiri tidak dihitung bentrok", async () => {
    const { body: dibuat } = await create();
    const res = await api(`/api/projects/${dibuat.project.id}`, {
      method: "PUT",
      body: JSON.stringify(projectBody({ outcome: "Diubah sedikit saja." })),
    });
    expect(res.status).toBe(200);
  });
});

describe("hapus = soft delete", () => {
  it("hilang dari daftar, masih ada di database", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/projects/${dibuat.project.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    expect((await json<{ deleted: string }>(res)).deleted).toBe(
      "Citizen Service Portal",
    );
    expect(await titles()).toEqual([]);

    const rows = await db.select().from(workProjects);
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).not.toBeNull();
  });

  it("namanya bebas lagi dipakai proyek baru", async () => {
    const { body: dibuat } = await create();
    await api(`/api/projects/${dibuat.project.id}`, { method: "DELETE" });

    const { res } = await create();
    expect(res.status).toBe(201);
  });

  it("menghapus dua kali membalas 404", async () => {
    const { body: dibuat } = await create();
    await api(`/api/projects/${dibuat.project.id}`, { method: "DELETE" });
    const kedua = await api(`/api/projects/${dibuat.project.id}`, {
      method: "DELETE",
    });
    expect(kedua.status).toBe(404);
  });
});

describe("audit log", () => {
  it("mencatat siapa melakukan apa, dengan salinan isinya", async () => {
    const { body: dibuat } = await create();
    await api(`/api/projects/${dibuat.project.id}`, {
      method: "PUT",
      body: JSON.stringify(projectBody({ outcome: "Diubah." })),
    });
    await api(`/api/projects/${dibuat.project.id}`, { method: "DELETE" });

    const rows = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entity, "work_project"),
          eq(auditLog.entityId, dibuat.project.id),
        ),
      );

    expect(rows.map((r) => r.action).sort()).toEqual([
      "create",
      "delete",
      "update",
    ]);
    expect(rows.every((r) => r.userName === "Editor Test")).toBe(true);

    const dihapus = rows.find((r) => r.action === "delete");
    expect((dihapus?.snapshot as { title: string }).title).toBe(
      "Citizen Service Portal",
    );
  });
});
