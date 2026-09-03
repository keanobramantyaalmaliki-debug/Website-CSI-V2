/**
 * API sektor industri, melawan Postgres sungguhan.
 *
 * Yang diuji di sini bukan pemeriksa isian — itu sudah punya testnya sendiri
 * di `shared/validateIndustry.test.ts` dan tidak butuh database. Yang diuji
 * adalah hal-hal yang cuma muncul saat ada database di belakangnya: urutan
 * yang harus stabil antar query, soft delete yang membebaskan nama, dan —
 * satu-satunya di seluruh CMS ini — BATAS 13 sektor tayang, yang sifatnya
 * aturan tingkat daftar sehingga tidak mungkin dijaga pemeriksa satu baris.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

import { MAX_LIVE_INDUSTRIES } from "@shared/industry";

import { app } from "../app";
import type { IndustryRecord } from "../industriesRepo";
import { db, sql } from "../db/client";
import { auditLog, industries } from "../db/schema";
import {
  asEditor,
  industryBody,
  loginAsEditor,
  resetDb,
  type Login,
} from "../test/helpers";

const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;
type IndustryRes = { industry: IndustryRecord };
type ListRes = { industries: IndustryRecord[] };
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
  const res = await api("/api/industries", {
    method: "POST",
    body: JSON.stringify(industryBody(over)),
  });
  return { res, body: await json<IndustryRes & ErrRes>(res) };
};

/** Nama sektor hidup, sesuai urutan yang dibalas API. */
const names = async () =>
  (await json<ListRes>(await api("/api/industries"))).industries.map(
    (i) => i.name,
  );

describe("gerbang login", () => {
  it("tanpa sesi, endpoint industri tertutup — termasuk urutkan", async () => {
    const anon = (path: string, init: RequestInit = {}) =>
      app.request(path, {
        ...init,
        headers: { "content-type": "application/json" },
      });

    expect((await anon("/api/industries")).status).toBe(401);
    expect(
      (await anon("/api/industries", { method: "POST", body: "{}" })).status,
    ).toBe(401);
    /* Disebut terpisah karena bentuk pathnya beda sendiri: kalau middleware
       dipasang hanya pada "/api/industries/*", route tanpa id seperti ini
       gampang lolos tanpa ada yang sadar. */
    expect(
      (await anon("/api/industries/urutkan", { method: "POST", body: "{}" }))
        .status,
    ).toBe(401);
    expect(
      (await anon("/api/industries/apa-saja", { method: "DELETE" })).status,
    ).toBe(401);
  });
});

describe("membuat sektor", () => {
  it("menyimpan isian dan menautkan fotonya", async () => {
    const { res, body } = await create();

    expect(res.status).toBe(201);
    expect(body.industry.name).toBe("Healthcare");
    expect(body.industry.image).toBe("/industries/healthcare.webp");
    expect(body.industry.tier).toBe("also");
    expect(body.industry.state).toBe("live");
    /* Belum pernah dipublish, jadi badge "belum terpublish" harus menyala sejak
       detik pertama. */
    expect(body.industry.publishedAt).toBeNull();
    expect(body.industry.unpublished).toBe(true);
  });

  it("spasi di ujung isian dirapikan sebelum disimpan", async () => {
    const { body } = await create({ name: "  Healthcare  " });
    expect(body.industry.name).toBe("Healthcare");
  });

  it("draft boleh setengah jadi, tayang tidak", async () => {
    const draft = await api("/api/industries", {
      method: "POST",
      body: JSON.stringify({ name: "Belum selesai", tier: "also", state: "draft" }),
    });
    expect(draft.status).toBe(201);

    const { res, body } = await create({ desc: "", image: "" });
    expect(res.status).toBe(422);
    expect(body.errors.desc).toBeTruthy();
    /* Foto wajib untuk yang tayang: plank tanpa foto punya tampilan yang sah
       (putih buram) sampai pengunjung mengkliknya — lalu kartunya kosong. */
    expect(body.errors.image).toBeTruthy();
  });

  it("bobot di luar dua pilihan ditolak, bukan diam-diam dijadikan bawaan", async () => {
    const { res, body } = await create({ tier: "utama" });
    expect(res.status).toBe(422);
    expect(body.errors.tier).toBeTruthy();
  });

  it("nama kembar ditolak, tanpa membedakan huruf besar-kecil", async () => {
    await create();
    const { res, body } = await create({ name: "healthcare" });

    expect(res.status).toBe(422);
    expect(body.errors.name).toContain("healthcare");

    const rows = await db.select().from(industries);
    expect(rows).toHaveLength(1);
  });
});

/**
 * Batas 13 — satu-satunya batas jumlah di CMS ini, dan alasannya geometri:
 * tumpukan spiral 3D-nya dikalibrasi sepanjang 13 plank, jadi yang ke-14
 * memanjat keluar bingkai kamera. Ke bawah tidak ada batas sama sekali.
 */
describe(`batas ${MAX_LIVE_INDUSTRIES} sektor tayang`, () => {
  /** Isi daftar sampai penuh sesak. */
  const penuhi = async (jumlah = MAX_LIVE_INDUSTRIES) => {
    for (let i = 0; i < jumlah; i += 1) {
      const { res } = await create({ name: `Sektor ${i + 1}` });
      expect(res.status).toBe(201);
    }
  };

  it("sektor ke-14 yang tayang ditolak, dan alasannya terbaca manusia", async () => {
    await penuhi();

    const { res, body } = await create({ name: "Satu Lagi" });
    expect(res.status).toBe(422);
    /* Dilaporkan di isian `state`, bukan `name`: yang salah bukan namanya
       melainkan keputusan menayangkannya, dan itu isian yang harus disorot
       form. */
    expect(body.errors.state).toContain(String(MAX_LIVE_INDUSTRIES));
    expect(body.errors.name).toBeUndefined();

    const rows = await db.select().from(industries);
    expect(rows).toHaveLength(MAX_LIVE_INDUSTRIES);
  });

  it("draft ke-14 tetap boleh — yang dibatasi cuma yang tayang", async () => {
    await penuhi();

    const res = await api("/api/industries", {
      method: "POST",
      body: JSON.stringify(
        industryBody({ name: "Disiapkan Dulu", state: "draft" }),
      ),
    });
    expect(res.status).toBe(201);
  });

  it("sektor yang sudah tayang tidak menghitung dirinya sendiri saat disunting", async () => {
    await penuhi(MAX_LIVE_INDUSTRIES - 1);
    const { body } = await create({ name: "Yang Terakhir" });

    /* Daftar sudah penuh. Menyunting salah satunya tanpa mengubah status
       tidak boleh ditolak — kalau `exceptId` lupa, seluruh daftar membeku
       dan tidak ada yang bisa dibetulkan lagi. */
    const res = await api(`/api/industries/${body.industry.id}`, {
      method: "PUT",
      body: JSON.stringify(
        industryBody({ name: "Yang Terakhir", desc: "Kalimatnya diperbaiki." }),
      ),
    });
    expect(res.status).toBe(200);
  });

  it("menaikkan draft jadi tayang di daftar yang penuh ditolak", async () => {
    await penuhi();
    const { body } = await create({ name: "Antre", state: "draft" });

    const res = await api(`/api/industries/${body.industry.id}`, {
      method: "PUT",
      body: JSON.stringify(industryBody({ name: "Antre", state: "live" })),
    });
    expect(res.status).toBe(422);
    expect((await json<ErrRes>(res)).errors.state).toBeTruthy();
  });

  it("menghapus satu sektor membuka satu tempat lagi", async () => {
    await penuhi();
    const semua = (await json<ListRes>(await api("/api/industries"))).industries;

    await api(`/api/industries/${semua[0].id}`, { method: "DELETE" });

    const { res } = await create({ name: "Pengganti" });
    expect(res.status).toBe(201);
  });
});

describe("urutan", () => {
  it("sektor baru mendarat di bawah, bukan di atas", async () => {
    await create({ name: "Healthcare" });
    await create({ name: "Logistics" });
    await create({ name: "Education" });

    /* Urutan di sini adalah urutan plank di tumpukan SEKALIGUS nomor 01–13
       yang tercetak di situs, jadi sektor baru tidak boleh menggeser nomor
       sektor lain tanpa diminta. */
    expect(await names()).toEqual(["Healthcare", "Logistics", "Education"]);
  });

  it("POST /urutkan menyusun ulang dan menaikkan updated_at", async () => {
    const a = (await create({ name: "Healthcare" })).body.industry;
    const b = (await create({ name: "Logistics" })).body.industry;
    const c = (await create({ name: "Education" })).body.industry;

    const sebelum = new Date(a.updatedAt).getTime();
    await new Promise((r) => setTimeout(r, 5));

    const res = await api("/api/industries/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [c.id, a.id, b.id] }),
    });
    const body = await json<ListRes>(res);

    expect(res.status).toBe(200);
    expect(body.industries.map((i) => i.name)).toEqual([
      "Education",
      "Healthcare",
      "Logistics",
    ]);
    expect(await names()).toEqual(["Education", "Healthcare", "Logistics"]);

    /* Urutan adalah konten yang tayang — ia memindahkan plank DAN mengganti
       nomornya — jadi ia perubahan yang menunggu Publish, bukan preferensi
       tampilan panel admin. */
    const dipindah = body.industries.find((i) => i.id === a.id);
    expect(new Date(dipindah!.updatedAt).getTime()).toBeGreaterThan(sebelum);
  });

  it("daftar yang tidak menyebut semua sektor ditolak, tanpa mengubah apa pun", async () => {
    const a = (await create({ name: "Healthcare" })).body.industry;
    await create({ name: "Logistics" });
    const c = (await create({ name: "Education" })).body.industry;

    const res = await api("/api/industries/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [c.id, a.id] }),
    });
    expect(res.status).toBe(422);
    expect((await json<ErrRes>(res)).error).toBeTruthy();

    /* Yang penting bukan status 422-nya, tapi ini: urutan lama harus utuh.
       Menerima daftar setengah akan meninggalkan yang tak disebut di
       `sortOrder` lamanya dan bertabrakan dengan yang baru. */
    expect(await names()).toEqual(["Healthcare", "Logistics", "Education"]);
  });

  it("id kembar di dalam satu daftar ditolak", async () => {
    const a = (await create({ name: "Healthcare" })).body.industry;
    await create({ name: "Logistics" });

    const res = await api("/api/industries/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [a.id, a.id] }),
    });
    expect(res.status).toBe(422);
  });

  it("sektor yang sudah dihapus tidak boleh ikut disebut", async () => {
    const a = (await create({ name: "Healthcare" })).body.industry;
    const b = (await create({ name: "Logistics" })).body.industry;
    await api(`/api/industries/${b.id}`, { method: "DELETE" });

    const res = await api("/api/industries/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });
    expect(res.status).toBe(422);
    expect(await names()).toEqual(["Healthcare"]);
  });
});

describe("daftar & ambil satu", () => {
  it("draft ikut di daftar admin", async () => {
    await create();
    await api("/api/industries", {
      method: "POST",
      body: JSON.stringify(industryBody({ name: "Rahasia", state: "draft" })),
    });

    expect(await names()).toEqual(["Healthcare", "Rahasia"]);
  });

  it("sektor yang tidak ada membalas 404, bukan 500", async () => {
    const res = await api("/api/industries/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});

describe("mengubah sektor", () => {
  it("PUT mengganti seluruh isi", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/industries/${dibuat.industry.id}`, {
      method: "PUT",
      body: JSON.stringify(
        industryBody({ tier: "core", state: "draft" }),
      ),
    });
    const body = await json<IndustryRes>(res);

    expect(res.status).toBe(200);
    expect(body.industry.tier).toBe("core");
    expect(body.industry.state).toBe("draft");
  });

  it("updated_at maju — Postgres tidak melakukannya sendiri", async () => {
    const { body: dibuat } = await create();
    const sebelum = new Date(dibuat.industry.updatedAt).getTime();

    await new Promise((r) => setTimeout(r, 5));
    const res = await api(`/api/industries/${dibuat.industry.id}`, {
      method: "PUT",
      body: JSON.stringify(industryBody({ desc: "Kalimatnya diperbarui." })),
    });
    const body = await json<IndustryRes>(res);

    expect(new Date(body.industry.updatedAt).getTime()).toBeGreaterThan(sebelum);
  });

  it("mengubah tidak menggeser urutannya — nomornya ikut diam", async () => {
    await create({ name: "Healthcare" });
    const b = (await create({ name: "Logistics" })).body.industry;
    await create({ name: "Education" });

    await api(`/api/industries/${b.id}`, {
      method: "PUT",
      body: JSON.stringify(industryBody({ name: "Logistics", tier: "core" })),
    });

    expect(await names()).toEqual(["Healthcare", "Logistics", "Education"]);
  });

  it("nama sendiri tidak dihitung bentrok", async () => {
    const { body: dibuat } = await create();
    const res = await api(`/api/industries/${dibuat.industry.id}`, {
      method: "PUT",
      body: JSON.stringify(industryBody({ desc: "Diubah sedikit saja." })),
    });
    expect(res.status).toBe(200);
  });
});

describe("hapus = soft delete", () => {
  it("hilang dari daftar, masih ada di database", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/industries/${dibuat.industry.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    expect((await json<{ deleted: string }>(res)).deleted).toBe("Healthcare");
    expect(await names()).toEqual([]);

    const rows = await db.select().from(industries);
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).not.toBeNull();
  });

  it("namanya bebas lagi dipakai sektor baru", async () => {
    const { body: dibuat } = await create();
    await api(`/api/industries/${dibuat.industry.id}`, { method: "DELETE" });

    const { res } = await create();
    expect(res.status).toBe(201);
  });

  it("menghapus dua kali membalas 404", async () => {
    const { body: dibuat } = await create();
    await api(`/api/industries/${dibuat.industry.id}`, { method: "DELETE" });
    const kedua = await api(`/api/industries/${dibuat.industry.id}`, {
      method: "DELETE",
    });
    expect(kedua.status).toBe(404);
  });
});

describe("audit log", () => {
  it("mencatat siapa melakukan apa, dengan salinan isinya", async () => {
    const { body: dibuat } = await create();
    await api(`/api/industries/${dibuat.industry.id}`, {
      method: "PUT",
      body: JSON.stringify(industryBody({ desc: "Diubah." })),
    });
    await api(`/api/industries/${dibuat.industry.id}`, { method: "DELETE" });

    const rows = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entity, "industry"),
          eq(auditLog.entityId, dibuat.industry.id),
        ),
      );

    expect(rows.map((r) => r.action).sort()).toEqual([
      "create",
      "delete",
      "update",
    ]);
    expect(rows.every((r) => r.userName === "Editor Test")).toBe(true);

    const dihapus = rows.find((r) => r.action === "delete");
    expect((dihapus?.snapshot as { name: string }).name).toBe("Healthcare");
  });
});
