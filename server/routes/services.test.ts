/**
 * API layanan, melawan Postgres sungguhan.
 *
 * Yang diuji di sini bukan pemeriksa isian — itu sudah punya testnya sendiri
 * di `shared/` dan tidak butuh database. Yang diuji adalah hal-hal yang cuma
 * muncul saat ada database di belakangnya: urutan yang harus stabil antar
 * query, tabel anak `service_subs` yang ditulis ulang tiap PUT, soft delete
 * yang membebaskan nama, dan `POST /urutkan` yang menolak daftar setengah.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

import { app } from "../app";
import type { ServiceRecord } from "../servicesRepo";
import { db, sql } from "../db/client";
import { auditLog, serviceSubs, services } from "../db/schema";
import {
  asEditor,
  loginAsEditor,
  resetDb,
  serviceBody,
  type Login,
} from "../test/helpers";

const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;
type ServiceRes = { service: ServiceRecord };
type ListRes = { services: ServiceRecord[] };
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
  const res = await api("/api/services", {
    method: "POST",
    body: JSON.stringify(serviceBody(over)),
  });
  return { res, body: await json<ServiceRes & ErrRes>(res) };
};

/** Nama layanan hidup, sesuai urutan yang dibalas API. */
const titles = async () =>
  (await json<ListRes>(await api("/api/services"))).services.map((s) => s.title);

describe("gerbang login", () => {
  it("tanpa sesi, endpoint layanan tertutup — termasuk urutkan", async () => {
    const anon = (path: string, init: RequestInit = {}) =>
      app.request(path, {
        ...init,
        headers: { "content-type": "application/json" },
      });

    expect((await anon("/api/services")).status).toBe(401);
    expect(
      (await anon("/api/services", { method: "POST", body: "{}" })).status,
    ).toBe(401);
    /* Disebut terpisah karena bentuk pathnya beda sendiri: kalau middleware
       dipasang hanya pada "/api/services/*", route tanpa id seperti ini
       gampang lolos tanpa ada yang sadar. */
    expect(
      (await anon("/api/services/urutkan", { method: "POST", body: "{}" }))
        .status,
    ).toBe(401);
    expect(
      (await anon("/api/services/apa-saja", { method: "DELETE" })).status,
    ).toBe(401);
  });
});

describe("membuat layanan", () => {
  it("menyimpan isian apa adanya, berikut rinciannya", async () => {
    const { res, body } = await create();

    expect(res.status).toBe(201);
    expect(body.service.title).toBe("Cloud Solutions");
    expect(body.service.subs).toEqual(["Cloud Migration", "Serverless"]);
    expect(body.service.state).toBe("live");
    /* Belum pernah dipublish, jadi badge "belum terpublish" harus menyala sejak
       detik pertama. */
    expect(body.service.publishedAt).toBeNull();
    expect(body.service.unpublished).toBe(true);
  });

  it("rincian tersimpan berurutan, bukan sesuai urutan baris database", async () => {
    const { body } = await create({
      subs: ["Satu", "Dua", "Tiga", "Empat", "Lima"],
    });
    expect(body.service.subs).toEqual(["Satu", "Dua", "Tiga", "Empat", "Lima"]);
  });

  it("spasi di ujung isian dirapikan sebelum disimpan", async () => {
    const { body } = await create({
      title: "  Cloud Solutions  ",
      subs: ["  Cloud Migration  "],
    });
    expect(body.service.title).toBe("Cloud Solutions");
    expect(body.service.subs).toEqual(["Cloud Migration"]);
  });

  it("draft cukup bernama, tayang harus punya penjelasan", async () => {
    const draft = await api("/api/services", {
      method: "POST",
      body: JSON.stringify({ title: "Belum selesai", state: "draft" }),
    });
    expect(draft.status).toBe(201);

    /* Penjelasan kosong tidak terlihat di layar sama sekali — sabuk 3D cuma
       merender judul. Justru itu sebabnya server yang harus menahannya. */
    const { res, body } = await create({ desc: "" });
    expect(res.status).toBe(422);
    expect(body.errors.desc).toBeTruthy();
  });

  it("layanan tanpa rincian tetap sah", async () => {
    const { res, body } = await create({ subs: [] });
    expect(res.status).toBe(201);
    expect(body.service.subs).toEqual([]);
  });

  it("nama kembar ditolak, tanpa membedakan huruf besar-kecil", async () => {
    await create();
    const { res, body } = await create({ title: "cloud solutions" });

    expect(res.status).toBe(422);
    expect(body.errors.title).toContain("cloud solutions");

    const rows = await db.select().from(services);
    expect(rows).toHaveLength(1);
  });
});

describe("urutan", () => {
  it("layanan baru mendarat di bawah, bukan di atas", async () => {
    await create({ title: "Cloud Solutions" });
    await create({ title: "Data Analytics" });
    await create({ title: "AI Solutions" });

    expect(await titles()).toEqual([
      "Cloud Solutions",
      "Data Analytics",
      "AI Solutions",
    ]);
  });

  it("POST /urutkan menyusun ulang dan menaikkan updated_at", async () => {
    const a = (await create({ title: "Cloud Solutions" })).body.service;
    const b = (await create({ title: "Data Analytics" })).body.service;
    const c = (await create({ title: "AI Solutions" })).body.service;

    const sebelum = new Date(a.updatedAt).getTime();
    await new Promise((r) => setTimeout(r, 5));

    const res = await api("/api/services/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [c.id, a.id, b.id] }),
    });
    const body = await json<ListRes>(res);

    expect(res.status).toBe(200);
    expect(body.services.map((s) => s.title)).toEqual([
      "AI Solutions",
      "Cloud Solutions",
      "Data Analytics",
    ]);
    expect(await titles()).toEqual([
      "AI Solutions",
      "Cloud Solutions",
      "Data Analytics",
    ]);

    /* Urutan adalah konten yang tayang — ia yang dibaca lurus dari atas ke
       bawah oleh pembaca layar — jadi memindahkannya adalah perubahan yang
       menunggu Publish, bukan preferensi tampilan panel admin. */
    const dipindah = body.services.find((s) => s.id === a.id);
    expect(new Date(dipindah!.updatedAt).getTime()).toBeGreaterThan(sebelum);
  });

  it("daftar yang tidak menyebut semua layanan ditolak, tanpa mengubah apa pun", async () => {
    const a = (await create({ title: "Cloud Solutions" })).body.service;
    await create({ title: "Data Analytics" });
    const c = (await create({ title: "AI Solutions" })).body.service;

    const res = await api("/api/services/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [c.id, a.id] }),
    });
    expect(res.status).toBe(422);
    expect((await json<ErrRes>(res)).error).toBeTruthy();

    /* Yang penting bukan status 422-nya, tapi ini: urutan lama harus utuh. */
    expect(await titles()).toEqual([
      "Cloud Solutions",
      "Data Analytics",
      "AI Solutions",
    ]);
  });

  it("id kembar di dalam satu daftar ditolak", async () => {
    const a = (await create({ title: "Cloud Solutions" })).body.service;
    await create({ title: "Data Analytics" });

    const res = await api("/api/services/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [a.id, a.id] }),
    });
    expect(res.status).toBe(422);
  });

  it("layanan yang sudah dihapus tidak boleh ikut disebut", async () => {
    const a = (await create({ title: "Cloud Solutions" })).body.service;
    const b = (await create({ title: "Data Analytics" })).body.service;
    await api(`/api/services/${b.id}`, { method: "DELETE" });

    const res = await api("/api/services/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });
    expect(res.status).toBe(422);
    expect(await titles()).toEqual(["Cloud Solutions"]);
  });
});

describe("daftar & ambil satu", () => {
  it("draft ikut di daftar admin", async () => {
    await create();
    await api("/api/services", {
      method: "POST",
      body: JSON.stringify(serviceBody({ title: "Rahasia", state: "draft" })),
    });

    expect(await titles()).toEqual(["Cloud Solutions", "Rahasia"]);
  });

  it("layanan yang tidak ada membalas 404, bukan 500", async () => {
    const res = await api("/api/services/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});

describe("mengubah layanan", () => {
  it("PUT mengganti seluruh isi", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/services/${dibuat.service.id}`, {
      method: "PUT",
      body: JSON.stringify(
        serviceBody({ desc: "Penjelasan yang baru.", state: "draft" }),
      ),
    });
    const body = await json<ServiceRes>(res);

    expect(res.status).toBe(200);
    expect(body.service.desc).toBe("Penjelasan yang baru.");
    expect(body.service.state).toBe("draft");
  });

  /* Tabel anaknya ditulis hapus-lalu-tulis-ulang. Yang paling mudah salah di
     pola itu adalah baris lama yang tertinggal: rincian yang dibuang editor
     tetap ikut dibacakan pembaca layar, dan tidak ada yang melihatnya. */
  it("rincian yang dibuang benar-benar hilang, tidak menumpuk", async () => {
    const { body: dibuat } = await create({ subs: ["Satu", "Dua", "Tiga"] });

    const res = await api(`/api/services/${dibuat.service.id}`, {
      method: "PUT",
      body: JSON.stringify(serviceBody({ subs: ["Empat"] })),
    });
    expect((await json<ServiceRes>(res)).service.subs).toEqual(["Empat"]);

    const rows = await db
      .select()
      .from(serviceSubs)
      .where(eq(serviceSubs.serviceId, dibuat.service.id));
    expect(rows).toHaveLength(1);
  });

  it("updated_at maju — Postgres tidak melakukannya sendiri", async () => {
    const { body: dibuat } = await create();
    const sebelum = new Date(dibuat.service.updatedAt).getTime();

    await new Promise((r) => setTimeout(r, 5));
    const res = await api(`/api/services/${dibuat.service.id}`, {
      method: "PUT",
      body: JSON.stringify(serviceBody({ desc: "Penjelasan diperbarui." })),
    });
    const body = await json<ServiceRes>(res);

    expect(new Date(body.service.updatedAt).getTime()).toBeGreaterThan(sebelum);
  });

  it("mengubah tidak menggeser urutannya", async () => {
    await create({ title: "Cloud Solutions" });
    const b = (await create({ title: "Data Analytics" })).body.service;
    await create({ title: "AI Solutions" });

    await api(`/api/services/${b.id}`, {
      method: "PUT",
      body: JSON.stringify(
        serviceBody({ title: "Data Analytics", desc: "Penjelasan baru." }),
      ),
    });

    expect(await titles()).toEqual([
      "Cloud Solutions",
      "Data Analytics",
      "AI Solutions",
    ]);
  });

  it("nama sendiri tidak dihitung bentrok", async () => {
    const { body: dibuat } = await create();
    const res = await api(`/api/services/${dibuat.service.id}`, {
      method: "PUT",
      body: JSON.stringify(serviceBody({ desc: "Diubah sedikit saja." })),
    });
    expect(res.status).toBe(200);
  });
});

describe("hapus = soft delete", () => {
  it("hilang dari daftar, masih ada di database", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/services/${dibuat.service.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    expect((await json<{ deleted: string }>(res)).deleted).toBe(
      "Cloud Solutions",
    );
    expect(await titles()).toEqual([]);

    const rows = await db.select().from(services);
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).not.toBeNull();
  });

  it("namanya bebas lagi dipakai layanan baru", async () => {
    const { body: dibuat } = await create();
    await api(`/api/services/${dibuat.service.id}`, { method: "DELETE" });

    const { res } = await create();
    expect(res.status).toBe(201);
  });

  it("menghapus dua kali membalas 404", async () => {
    const { body: dibuat } = await create();
    await api(`/api/services/${dibuat.service.id}`, { method: "DELETE" });
    const kedua = await api(`/api/services/${dibuat.service.id}`, {
      method: "DELETE",
    });
    expect(kedua.status).toBe(404);
  });
});

describe("audit log", () => {
  it("mencatat siapa melakukan apa, dengan salinan isinya", async () => {
    const { body: dibuat } = await create();
    await api(`/api/services/${dibuat.service.id}`, {
      method: "PUT",
      body: JSON.stringify(serviceBody({ desc: "Diubah." })),
    });
    await api(`/api/services/${dibuat.service.id}`, { method: "DELETE" });

    const rows = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entity, "service"),
          eq(auditLog.entityId, dibuat.service.id),
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
      "Cloud Solutions",
    );
  });
});
