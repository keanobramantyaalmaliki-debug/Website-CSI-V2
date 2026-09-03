/**
 * API nilai, melawan Postgres sungguhan.
 *
 * Yang diuji di sini bukan pemeriksa isian — itu sudah punya testnya sendiri
 * di `shared/` dan tidak butuh database. Yang diuji adalah hal-hal yang cuma
 * muncul saat ada database di belakangnya: urutan yang harus stabil antar
 * query, soft delete yang membebaskan judul, dan `POST /urutkan` yang menolak
 * daftar setengah.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

import { app } from "../app";
import type { ValueRecord } from "../valuesRepo";
import { db, sql } from "../db/client";
import { auditLog, peopleValues } from "../db/schema";
import {
  asEditor,
  loginAsEditor,
  resetDb,
  valueBody,
  type Login,
} from "../test/helpers";

const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;
type ValueRes = { value: ValueRecord };
type ListRes = { values: ValueRecord[] };
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
  const res = await api("/api/values", {
    method: "POST",
    body: JSON.stringify(valueBody(over)),
  });
  return { res, body: await json<ValueRes & ErrRes>(res) };
};

/** Judul-judul nilai hidup, sesuai urutan yang dibalas API. */
const titles = async () =>
  (await json<ListRes>(await api("/api/values"))).values.map((v) => v.title);

describe("gerbang login", () => {
  it("tanpa sesi, endpoint nilai tertutup — termasuk urutkan", async () => {
    const anon = (path: string, init: RequestInit = {}) =>
      app.request(path, {
        ...init,
        headers: { "content-type": "application/json" },
      });

    expect((await anon("/api/values")).status).toBe(401);
    expect(
      (await anon("/api/values", { method: "POST", body: "{}" })).status,
    ).toBe(401);
    /* Disebut terpisah karena bentuk pathnya beda sendiri: kalau middleware
       dipasang hanya pada "/api/values/*", route tanpa id seperti ini gampang
       lolos tanpa ada yang sadar. */
    expect(
      (await anon("/api/values/urutkan", { method: "POST", body: "{}" }))
        .status,
    ).toBe(401);
    expect(
      (await anon("/api/values/apa-saja", { method: "DELETE" })).status,
    ).toBe(401);
  });
});

describe("membuat nilai", () => {
  it("menyimpan isian dan menautkan fotonya", async () => {
    const { res, body } = await create();

    expect(res.status).toBe(201);
    expect(body.value.title).toBe("Craft First");
    expect(body.value.photo).toBe("/people/craft-first.webp");
    expect(body.value.state).toBe("live");
    /* Belum pernah dipublish, jadi badge "belum terpublish" harus menyala sejak
       detik pertama. */
    expect(body.value.publishedAt).toBeNull();
    expect(body.value.unpublished).toBe(true);
  });

  it("spasi di ujung isian dirapikan sebelum disimpan", async () => {
    const { body } = await create({ title: "  Craft First  " });
    expect(body.value.title).toBe("Craft First");
  });

  it("draft boleh setengah jadi, tayang tidak", async () => {
    const draft = await api("/api/values", {
      method: "POST",
      body: JSON.stringify({ title: "Belum selesai", state: "draft" }),
    });
    expect(draft.status).toBe(201);

    const { res, body } = await create({ tagline: "", description: "", photo: "" });
    expect(res.status).toBe(422);
    expect(body.errors.tagline).toBeTruthy();
    expect(body.errors.description).toBeTruthy();
    /* Foto wajib untuk yang tayang — kalau tidak, bingkai bertuliskan PHOTO
       yang tayang di produksi. */
    expect(body.errors.photo).toBeTruthy();
  });

  it("judul kembar ditolak, tanpa membedakan huruf besar-kecil", async () => {
    await create();
    const { res, body } = await create({ title: "craft first" });

    expect(res.status).toBe(422);
    expect(body.errors.title).toContain("craft first");

    const rows = await db.select().from(peopleValues);
    expect(rows).toHaveLength(1);
  });
});

describe("urutan", () => {
  it("nilai baru mendarat di bawah, bukan di atas", async () => {
    await create({ title: "Craft First" });
    await create({ title: "Partnership" });
    await create({ title: "Long-Term Thinking" });

    /* Kebalikan dari lowongan, dan disengaja: urutan di sini adalah urutan
       panel di halaman People, jadi nilai baru tidak boleh menggeser panel
       pembuka halaman tanpa diminta. */
    expect(await titles()).toEqual([
      "Craft First",
      "Partnership",
      "Long-Term Thinking",
    ]);
  });

  it("POST /urutkan menyusun ulang dan menaikkan updated_at", async () => {
    const a = (await create({ title: "Craft First" })).body.value;
    const b = (await create({ title: "Partnership" })).body.value;
    const c = (await create({ title: "Long-Term Thinking" })).body.value;

    const sebelum = new Date(a.updatedAt).getTime();
    await new Promise((r) => setTimeout(r, 5));

    const res = await api("/api/values/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [c.id, a.id, b.id] }),
    });
    const body = await json<ListRes>(res);

    expect(res.status).toBe(200);
    expect(body.values.map((v) => v.title)).toEqual([
      "Long-Term Thinking",
      "Craft First",
      "Partnership",
    ]);
    expect(await titles()).toEqual([
      "Long-Term Thinking",
      "Craft First",
      "Partnership",
    ]);

    /* Urutan adalah konten yang tayang: memindahkan panel adalah perubahan
       yang menunggu Publish, bukan preferensi tampilan panel admin. */
    const dipindah = body.values.find((v) => v.id === a.id);
    expect(new Date(dipindah!.updatedAt).getTime()).toBeGreaterThan(sebelum);
  });

  it("daftar yang tidak menyebut semua nilai ditolak, tanpa mengubah apa pun", async () => {
    const a = (await create({ title: "Craft First" })).body.value;
    await create({ title: "Partnership" });
    const c = (await create({ title: "Long-Term Thinking" })).body.value;

    const res = await api("/api/values/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [c.id, a.id] }),
    });
    expect(res.status).toBe(422);
    expect((await json<ErrRes>(res)).error).toBeTruthy();

    /* Yang penting bukan status 422-nya, tapi ini: urutan lama harus utuh.
       Menerima daftar setengah akan meninggalkan yang tak disebut di
       `sortOrder` lamanya dan bertabrakan dengan yang baru. */
    expect(await titles()).toEqual([
      "Craft First",
      "Partnership",
      "Long-Term Thinking",
    ]);
  });

  it("id kembar di dalam satu daftar ditolak", async () => {
    const a = (await create({ title: "Craft First" })).body.value;
    await create({ title: "Partnership" });

    const res = await api("/api/values/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [a.id, a.id] }),
    });
    expect(res.status).toBe(422);
  });

  it("nilai yang sudah dihapus tidak boleh ikut disebut", async () => {
    const a = (await create({ title: "Craft First" })).body.value;
    const b = (await create({ title: "Partnership" })).body.value;
    await api(`/api/values/${b.id}`, { method: "DELETE" });

    const res = await api("/api/values/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });
    expect(res.status).toBe(422);
    expect(await titles()).toEqual(["Craft First"]);
  });
});

describe("daftar & ambil satu", () => {
  it("draft ikut di daftar admin", async () => {
    await create();
    await api("/api/values", {
      method: "POST",
      body: JSON.stringify(valueBody({ title: "Rahasia", state: "draft" })),
    });

    expect(await titles()).toEqual(["Craft First", "Rahasia"]);
  });

  it("nilai yang tidak ada membalas 404, bukan 500", async () => {
    const res = await api("/api/values/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});

describe("mengubah nilai", () => {
  it("PUT mengganti seluruh isi", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/values/${dibuat.value.id}`, {
      method: "PUT",
      body: JSON.stringify(
        valueBody({ tagline: "Baris yang baru", state: "draft" }),
      ),
    });
    const body = await json<ValueRes>(res);

    expect(res.status).toBe(200);
    expect(body.value.tagline).toBe("Baris yang baru");
    expect(body.value.state).toBe("draft");
  });

  it("updated_at maju — Postgres tidak melakukannya sendiri", async () => {
    const { body: dibuat } = await create();
    const sebelum = new Date(dibuat.value.updatedAt).getTime();

    await new Promise((r) => setTimeout(r, 5));
    const res = await api(`/api/values/${dibuat.value.id}`, {
      method: "PUT",
      body: JSON.stringify(valueBody({ description: "Uraian diperbarui." })),
    });
    const body = await json<ValueRes>(res);

    expect(new Date(body.value.updatedAt).getTime()).toBeGreaterThan(sebelum);
  });

  it("mengubah tidak menggeser urutannya", async () => {
    await create({ title: "Craft First" });
    const b = (await create({ title: "Partnership" })).body.value;
    await create({ title: "Long-Term Thinking" });

    await api(`/api/values/${b.id}`, {
      method: "PUT",
      body: JSON.stringify(valueBody({ title: "Partnership", tagline: "Baru" })),
    });

    expect(await titles()).toEqual([
      "Craft First",
      "Partnership",
      "Long-Term Thinking",
    ]);
  });

  it("judul sendiri tidak dihitung bentrok", async () => {
    const { body: dibuat } = await create();
    const res = await api(`/api/values/${dibuat.value.id}`, {
      method: "PUT",
      body: JSON.stringify(valueBody({ description: "Diubah sedikit saja." })),
    });
    expect(res.status).toBe(200);
  });
});

describe("hapus = soft delete", () => {
  it("hilang dari daftar, masih ada di database", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/values/${dibuat.value.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    expect((await json<{ deleted: string }>(res)).deleted).toBe("Craft First");
    expect(await titles()).toEqual([]);

    const rows = await db.select().from(peopleValues);
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).not.toBeNull();
  });

  it("judulnya bebas lagi dipakai nilai baru", async () => {
    const { body: dibuat } = await create();
    await api(`/api/values/${dibuat.value.id}`, { method: "DELETE" });

    const { res } = await create();
    expect(res.status).toBe(201);
  });

  it("menghapus dua kali membalas 404", async () => {
    const { body: dibuat } = await create();
    await api(`/api/values/${dibuat.value.id}`, { method: "DELETE" });
    const kedua = await api(`/api/values/${dibuat.value.id}`, {
      method: "DELETE",
    });
    expect(kedua.status).toBe(404);
  });
});

describe("audit log", () => {
  it("mencatat siapa melakukan apa, dengan salinan isinya", async () => {
    const { body: dibuat } = await create();
    await api(`/api/values/${dibuat.value.id}`, {
      method: "PUT",
      body: JSON.stringify(valueBody({ description: "Diubah." })),
    });
    await api(`/api/values/${dibuat.value.id}`, { method: "DELETE" });

    const rows = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entity, "value"),
          eq(auditLog.entityId, dibuat.value.id),
        ),
      );

    expect(rows.map((r) => r.action).sort()).toEqual([
      "create",
      "delete",
      "update",
    ]);
    expect(rows.every((r) => r.userName === "Editor Test")).toBe(true);

    const dihapus = rows.find((r) => r.action === "delete");
    expect((dihapus?.snapshot as { title: string }).title).toBe("Craft First");
  });
});
