/**
 * API testimoni, melawan Postgres sungguhan.
 *
 * Yang diuji di sini bukan pemeriksa isian — itu sudah punya testnya sendiri
 * di `shared/` dan tidak butuh database. Yang diuji adalah hal-hal yang cuma
 * muncul saat ada database di belakangnya: urutan yang harus stabil antar
 * query, soft delete yang membebaskan nama, dan `POST /urutkan` yang menolak
 * daftar setengah.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

import { app } from "../app";
import type { TestimonialRecord } from "../testimonialsRepo";
import { db, sql } from "../db/client";
import { auditLog, testimonials } from "../db/schema";
import {
  asEditor,
  loginAsEditor,
  resetDb,
  testimonialBody,
  type Login,
} from "../test/helpers";

const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;
type TestimonialRes = { testimonial: TestimonialRecord };
type ListRes = { testimonials: TestimonialRecord[] };
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
  const res = await api("/api/testimonials", {
    method: "POST",
    body: JSON.stringify(testimonialBody(over)),
  });
  return { res, body: await json<TestimonialRes & ErrRes>(res) };
};

/** Nama-nama testimoni hidup, sesuai urutan yang dibalas API. */
const names = async () =>
  (await json<ListRes>(await api("/api/testimonials"))).testimonials.map(
    (t) => t.name,
  );

describe("gerbang login", () => {
  it("tanpa sesi, endpoint testimoni tertutup — termasuk urutkan", async () => {
    const anon = (path: string, init: RequestInit = {}) =>
      app.request(path, {
        ...init,
        headers: { "content-type": "application/json" },
      });

    expect((await anon("/api/testimonials")).status).toBe(401);
    expect(
      (await anon("/api/testimonials", { method: "POST", body: "{}" })).status,
    ).toBe(401);
    /* Disebut terpisah karena bentuk pathnya beda sendiri: kalau middleware
       dipasang hanya pada "/api/testimonials/*", route tanpa id seperti ini
       gampang lolos tanpa ada yang sadar. */
    expect(
      (await anon("/api/testimonials/urutkan", { method: "POST", body: "{}" }))
        .status,
    ).toBe(401);
    expect(
      (await anon("/api/testimonials/apa-saja", { method: "DELETE" })).status,
    ).toBe(401);
  });
});

describe("membuat testimoni", () => {
  it("menyimpan isian apa adanya", async () => {
    const { res, body } = await create();

    expect(res.status).toBe(201);
    expect(body.testimonial.name).toBe("Ratna Wijaya");
    expect(body.testimonial.role).toContain("Head of IT");
    expect(body.testimonial.state).toBe("live");
    /* Belum pernah dipublish, jadi badge "belum tayang" harus menyala sejak
       detik pertama. */
    expect(body.testimonial.publishedAt).toBeNull();
    expect(body.testimonial.unpublished).toBe(true);
  });

  it("spasi di ujung isian dirapikan sebelum disimpan", async () => {
    const { body } = await create({ name: "  Ratna Wijaya  " });
    expect(body.testimonial.name).toBe("Ratna Wijaya");
  });

  it("draft cukup bernama, tayang harus lengkap", async () => {
    const draft = await api("/api/testimonials", {
      method: "POST",
      body: JSON.stringify({ name: "Belum selesai", state: "draft" }),
    });
    expect(draft.status).toBe(201);

    const { res, body } = await create({ quote: "", role: "" });
    expect(res.status).toBe(422);
    expect(body.errors.quote).toBeTruthy();
    /* Nama tanpa jabatan membuat testimoninya kehilangan bobot. */
    expect(body.errors.role).toBeTruthy();
  });

  it("nama kembar ditolak, tanpa membedakan huruf besar-kecil", async () => {
    await create();
    const { res, body } = await create({ name: "ratna wijaya" });

    expect(res.status).toBe(422);
    expect(body.errors.name).toContain("ratna wijaya");

    const rows = await db.select().from(testimonials);
    expect(rows).toHaveLength(1);
  });
});

describe("urutan", () => {
  it("testimoni baru mendarat di bawah, bukan di atas", async () => {
    await create({ name: "Ratna Wijaya" });
    await create({ name: "Budi Hartono" });
    await create({ name: "Sari Kusuma" });

    /* Disengaja: baris pertama adalah kutipan yang terlihat saat halaman
       Services dibuka, jadi testimoni baru tidak boleh mengambil alih kesan
       pertama halaman tanpa diminta. */
    expect(await names()).toEqual([
      "Ratna Wijaya",
      "Budi Hartono",
      "Sari Kusuma",
    ]);
  });

  it("POST /urutkan menyusun ulang dan menaikkan updated_at", async () => {
    const a = (await create({ name: "Ratna Wijaya" })).body.testimonial;
    const b = (await create({ name: "Budi Hartono" })).body.testimonial;
    const c = (await create({ name: "Sari Kusuma" })).body.testimonial;

    const sebelum = new Date(a.updatedAt).getTime();
    await new Promise((r) => setTimeout(r, 5));

    const res = await api("/api/testimonials/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [c.id, a.id, b.id] }),
    });
    const body = await json<ListRes>(res);

    expect(res.status).toBe(200);
    expect(body.testimonials.map((t) => t.name)).toEqual([
      "Sari Kusuma",
      "Ratna Wijaya",
      "Budi Hartono",
    ]);
    expect(await names()).toEqual([
      "Sari Kusuma",
      "Ratna Wijaya",
      "Budi Hartono",
    ]);

    /* Urutan adalah konten yang tayang: memindahkan kutipan adalah perubahan
       yang menunggu Publish, bukan preferensi tampilan panel admin. */
    const dipindah = body.testimonials.find((t) => t.id === a.id);
    expect(new Date(dipindah!.updatedAt).getTime()).toBeGreaterThan(sebelum);
  });

  it("daftar yang tidak menyebut semua testimoni ditolak, tanpa mengubah apa pun", async () => {
    const a = (await create({ name: "Ratna Wijaya" })).body.testimonial;
    await create({ name: "Budi Hartono" });
    const c = (await create({ name: "Sari Kusuma" })).body.testimonial;

    const res = await api("/api/testimonials/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [c.id, a.id] }),
    });
    expect(res.status).toBe(422);
    expect((await json<ErrRes>(res)).error).toBeTruthy();

    /* Yang penting bukan status 422-nya, tapi ini: urutan lama harus utuh. */
    expect(await names()).toEqual([
      "Ratna Wijaya",
      "Budi Hartono",
      "Sari Kusuma",
    ]);
  });

  it("id kembar di dalam satu daftar ditolak", async () => {
    const a = (await create({ name: "Ratna Wijaya" })).body.testimonial;
    await create({ name: "Budi Hartono" });

    const res = await api("/api/testimonials/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [a.id, a.id] }),
    });
    expect(res.status).toBe(422);
  });

  it("testimoni yang sudah dihapus tidak boleh ikut disebut", async () => {
    const a = (await create({ name: "Ratna Wijaya" })).body.testimonial;
    const b = (await create({ name: "Budi Hartono" })).body.testimonial;
    await api(`/api/testimonials/${b.id}`, { method: "DELETE" });

    const res = await api("/api/testimonials/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });
    expect(res.status).toBe(422);
    expect(await names()).toEqual(["Ratna Wijaya"]);
  });
});

describe("daftar & ambil satu", () => {
  it("draft ikut di daftar admin", async () => {
    await create();
    await api("/api/testimonials", {
      method: "POST",
      body: JSON.stringify(testimonialBody({ name: "Rahasia", state: "draft" })),
    });

    expect(await names()).toEqual(["Ratna Wijaya", "Rahasia"]);
  });

  it("testimoni yang tidak ada membalas 404, bukan 500", async () => {
    const res = await api(
      "/api/testimonials/00000000-0000-0000-0000-000000000000",
    );
    expect(res.status).toBe(404);
  });
});

describe("mengubah testimoni", () => {
  it("PUT mengganti seluruh isi", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/testimonials/${dibuat.testimonial.id}`, {
      method: "PUT",
      body: JSON.stringify(
        testimonialBody({ role: "Jabatan yang baru", state: "draft" }),
      ),
    });
    const body = await json<TestimonialRes>(res);

    expect(res.status).toBe(200);
    expect(body.testimonial.role).toBe("Jabatan yang baru");
    expect(body.testimonial.state).toBe("draft");
  });

  it("updated_at maju — Postgres tidak melakukannya sendiri", async () => {
    const { body: dibuat } = await create();
    const sebelum = new Date(dibuat.testimonial.updatedAt).getTime();

    await new Promise((r) => setTimeout(r, 5));
    const res = await api(`/api/testimonials/${dibuat.testimonial.id}`, {
      method: "PUT",
      body: JSON.stringify(testimonialBody({ quote: "Kutipan diperbarui." })),
    });
    const body = await json<TestimonialRes>(res);

    expect(new Date(body.testimonial.updatedAt).getTime()).toBeGreaterThan(
      sebelum,
    );
  });

  it("mengubah tidak menggeser urutannya", async () => {
    await create({ name: "Ratna Wijaya" });
    const b = (await create({ name: "Budi Hartono" })).body.testimonial;
    await create({ name: "Sari Kusuma" });

    await api(`/api/testimonials/${b.id}`, {
      method: "PUT",
      body: JSON.stringify(
        testimonialBody({ name: "Budi Hartono", quote: "Kutipan baru." }),
      ),
    });

    expect(await names()).toEqual([
      "Ratna Wijaya",
      "Budi Hartono",
      "Sari Kusuma",
    ]);
  });

  it("nama sendiri tidak dihitung bentrok", async () => {
    const { body: dibuat } = await create();
    const res = await api(`/api/testimonials/${dibuat.testimonial.id}`, {
      method: "PUT",
      body: JSON.stringify(testimonialBody({ quote: "Diubah sedikit saja." })),
    });
    expect(res.status).toBe(200);
  });
});

describe("hapus = soft delete", () => {
  it("hilang dari daftar, masih ada di database", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/testimonials/${dibuat.testimonial.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    expect((await json<{ deleted: string }>(res)).deleted).toBe("Ratna Wijaya");
    expect(await names()).toEqual([]);

    const rows = await db.select().from(testimonials);
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).not.toBeNull();
  });

  it("namanya bebas lagi dipakai testimoni baru", async () => {
    const { body: dibuat } = await create();
    await api(`/api/testimonials/${dibuat.testimonial.id}`, {
      method: "DELETE",
    });

    const { res } = await create();
    expect(res.status).toBe(201);
  });

  it("menghapus dua kali membalas 404", async () => {
    const { body: dibuat } = await create();
    await api(`/api/testimonials/${dibuat.testimonial.id}`, {
      method: "DELETE",
    });
    const kedua = await api(`/api/testimonials/${dibuat.testimonial.id}`, {
      method: "DELETE",
    });
    expect(kedua.status).toBe(404);
  });
});

describe("audit log", () => {
  it("mencatat siapa melakukan apa, dengan salinan isinya", async () => {
    const { body: dibuat } = await create();
    await api(`/api/testimonials/${dibuat.testimonial.id}`, {
      method: "PUT",
      body: JSON.stringify(testimonialBody({ quote: "Diubah." })),
    });
    await api(`/api/testimonials/${dibuat.testimonial.id}`, {
      method: "DELETE",
    });

    const rows = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entity, "testimonial"),
          eq(auditLog.entityId, dibuat.testimonial.id),
        ),
      );

    expect(rows.map((r) => r.action).sort()).toEqual([
      "create",
      "delete",
      "update",
    ]);
    expect(rows.every((r) => r.userName === "Editor Test")).toBe(true);

    const dihapus = rows.find((r) => r.action === "delete");
    expect((dihapus?.snapshot as { name: string }).name).toBe("Ratna Wijaya");
  });
});
