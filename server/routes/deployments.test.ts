/**
 * API kartu deployment, melawan Postgres sungguhan.
 *
 * Yang diuji di sini bukan pemeriksa isian — itu sudah punya testnya sendiri di
 * `shared/validateDeployment.test.ts` dan tidak butuh database. Yang diuji
 * adalah hal-hal yang cuma muncul saat ada database di belakangnya: urutan yang
 * harus stabil antar query, soft delete yang membebaskan kembali sebuah
 * pasangan, dan — yang paling khas entitas ini — KEMBAR YANG DIUKUR DARI
 * PASANGAN sektor+wilayah, bukan dari sektornya sendiri.
 *
 * Aturan pasangan itu satu-satunya di seluruh CMS ini, dan ia gampang sekali
 * berbalik jadi "nama unik" biasa saat seseorang menyalin `industriesRepo.ts`
 * di kemudian hari. Karena itu ia diuji dari dua sisi: yang bentrok ditolak,
 * DAN yang sektornya sama tapi wilayahnya beda tetap diterima.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

import { app } from "../app";
import type { DeploymentRecord } from "../deploymentsRepo";
import { db, sql } from "../db/client";
import { auditLog, deployments } from "../db/schema";
import {
  asEditor,
  deploymentBody,
  loginAsEditor,
  resetDb,
  type Login,
} from "../test/helpers";

const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;
type DeploymentRes = { deployment: DeploymentRecord };
type ListRes = { deployments: DeploymentRecord[] };
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
  const res = await api("/api/deployments", {
    method: "POST",
    body: JSON.stringify(deploymentBody(over)),
  });
  return { res, body: await json<DeploymentRes & ErrRes>(res) };
};

/** Pasangan sektor · wilayah yang hidup, sesuai urutan yang dibalas API. */
const pasangan = async () =>
  (await json<ListRes>(await api("/api/deployments"))).deployments.map(
    (d) => `${d.sector} · ${d.region}`,
  );

describe("gerbang login", () => {
  it("tanpa sesi, endpoint deployment tertutup — termasuk urutkan", async () => {
    const anon = (path: string, init: RequestInit = {}) =>
      app.request(path, {
        ...init,
        headers: { "content-type": "application/json" },
      });

    expect((await anon("/api/deployments")).status).toBe(401);
    expect(
      (await anon("/api/deployments", { method: "POST", body: "{}" })).status,
    ).toBe(401);
    /* Disebut terpisah karena bentuk pathnya beda sendiri: kalau middleware
       dipasang hanya pada "/api/deployments/*", route tanpa id seperti ini
       gampang lolos tanpa ada yang sadar. */
    expect(
      (await anon("/api/deployments/urutkan", { method: "POST", body: "{}" }))
        .status,
    ).toBe(401);
    expect(
      (await anon("/api/deployments/apa-saja", { method: "DELETE" })).status,
    ).toBe(401);
  });
});

describe("membuat kartu", () => {
  it("menyimpan isian dan menautkan fotonya", async () => {
    const { res, body } = await create();

    expect(res.status).toBe(201);
    expect(body.deployment.sector).toBe("Logistics");
    expect(body.deployment.region).toBe("Indonesia");
    expect(body.deployment.image).toBe("/deployments/logistics.webp");
    expect(body.deployment.state).toBe("live");
    /* Belum pernah dipublish, jadi badge "belum tayang" harus menyala sejak
       detik pertama. */
    expect(body.deployment.publishedAt).toBeNull();
    expect(body.deployment.unpublished).toBe(true);
  });

  it("spasi di ujung isian dirapikan sebelum disimpan", async () => {
    const { body } = await create({ sector: "  Logistics  ", region: "  Indonesia  " });
    expect(body.deployment.sector).toBe("Logistics");
    expect(body.deployment.region).toBe("Indonesia");
  });

  it("draft boleh setengah jadi, tayang tidak", async () => {
    const draft = await api("/api/deployments", {
      method: "POST",
      body: JSON.stringify({ sector: "Belum selesai", state: "draft" }),
    });
    expect(draft.status).toBe(201);

    const { res, body } = await create({ region: "", desc: "", image: "" });
    expect(res.status).toBe(422);
    expect(body.errors.region).toBeTruthy();
    expect(body.errors.desc).toBeTruthy();
    /* Foto wajib untuk yang tayang: kartu tanpa foto tidak rusak, tapi ia
       berdiri bersebelahan dengan kartu berfoto dan terbaca seperti gambar
       yang gagal dimuat. */
    expect(body.errors.image).toBeTruthy();
  });

  it("status di luar dua pilihan jatuh ke draft, bukan diterima apa adanya", async () => {
    /* Beda dari `tier` di industri, yang ditolak. Di sini tidak ada isian
       berpilihan tertutup selain status, dan "draft" adalah keadaan paling
       aman — yang tidak tayang. */
    const { res, body } = await create({ state: "tayang-dong" });
    expect(res.status).toBe(201);
    expect(body.deployment.state).toBe("draft");
  });
});

/**
 * Aturan kembar entitas ini — satu-satunya di CMS yang diukur dari PASANGAN
 * dua isian, bukan dari satu nama.
 */
describe("kembar diukur dari pasangan sektor + wilayah", () => {
  it("pasangan yang sama persis ditolak, tanpa membedakan huruf besar-kecil", async () => {
    await create();
    const { res, body } = await create({ sector: "logistics", region: "INDONESIA" });

    expect(res.status).toBe(422);
    /* Dilaporkan di isian WILAYAH: sektornya tidak salah, dan editor yang
       membaca galat ini di isian sektor akan mengira sektornya terlarang. */
    expect(body.errors.region).toBeTruthy();
    expect(body.errors.sector).toBeUndefined();

    const rows = await db.select().from(deployments);
    expect(rows).toHaveLength(1);
  });

  it("sektor yang sama dengan wilayah berbeda DITERIMA", async () => {
    await create({ sector: "Logistics", region: "Indonesia" });
    const { res } = await create({ sector: "Logistics", region: "International" });

    /* Inti seluruh keputusan desain entitas ini. Kalau suatu hari test ini
       merah karena seseorang menyalin `industriesRepo.ts` dan menjaga nama
       saja, CMS-nya memaksa editor mengarang nama sektor palsu untuk mencatat
       kenyataan yang sah. */
    expect(res.status).toBe(201);
    expect(await pasangan()).toEqual([
      "Logistics · Indonesia",
      "Logistics · International",
    ]);
  });

  it("wilayah yang sama dengan sektor berbeda juga diterima", async () => {
    await create({ sector: "Logistics", region: "Indonesia" });
    const { res } = await create({ sector: "Hospitality", region: "Indonesia" });
    expect(res.status).toBe(201);
  });

  it("dua draf yang wilayahnya sama-sama kosong bukan kartu kembar", async () => {
    /* Draf yang baru diketik sektornya belum punya wilayah. Menolak yang kedua
       berarti editor tidak bisa menyiapkan dua kartu sekaligus. */
    const a = await api("/api/deployments", {
      method: "POST",
      body: JSON.stringify({ sector: "Logistics", state: "draft" }),
    });
    const b = await api("/api/deployments", {
      method: "POST",
      body: JSON.stringify({ sector: "Logistics", state: "draft" }),
    });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
  });

  it("pasangan sendiri tidak dihitung bentrok saat disunting", async () => {
    const { body: dibuat } = await create();
    const res = await api(`/api/deployments/${dibuat.deployment.id}`, {
      method: "PUT",
      body: JSON.stringify(deploymentBody({ desc: "Kalimatnya diperbaiki." })),
    });
    expect(res.status).toBe(200);
  });

  it("PUT yang menabrak pasangan kartu lain ditolak", async () => {
    await create({ sector: "Logistics", region: "Indonesia" });
    const { body: kedua } = await create({
      sector: "Logistics",
      region: "International",
    });

    const res = await api(`/api/deployments/${kedua.deployment.id}`, {
      method: "PUT",
      body: JSON.stringify(
        deploymentBody({ sector: "Logistics", region: "Indonesia" }),
      ),
    });
    expect(res.status).toBe(422);
    expect((await json<ErrRes>(res)).errors.region).toBeTruthy();
  });
});

describe("urutan", () => {
  it("kartu baru mendarat di bawah, bukan di atas", async () => {
    await create({ sector: "Public Services" });
    await create({ sector: "Infrastructure" });
    await create({ sector: "Logistics" });

    /* Urutan di sini adalah urutan kartu di grid SEKALIGUS nomor 01–05 yang
       tercetak di situs, jadi kartu baru tidak boleh menggeser nomor kartu
       lain tanpa diminta. */
    expect(await pasangan()).toEqual([
      "Public Services · Indonesia",
      "Infrastructure · Indonesia",
      "Logistics · Indonesia",
    ]);
  });

  it("POST /urutkan menyusun ulang dan menaikkan updated_at", async () => {
    const a = (await create({ sector: "Public Services" })).body.deployment;
    const b = (await create({ sector: "Infrastructure" })).body.deployment;
    const c = (await create({ sector: "Logistics" })).body.deployment;

    const sebelum = new Date(a.updatedAt).getTime();
    await new Promise((r) => setTimeout(r, 5));

    const res = await api("/api/deployments/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [c.id, a.id, b.id] }),
    });
    const body = await json<ListRes>(res);

    expect(res.status).toBe(200);
    expect(body.deployments.map((d) => d.sector)).toEqual([
      "Logistics",
      "Public Services",
      "Infrastructure",
    ]);

    /* Urutan adalah konten yang tayang — ia memindahkan kartu DAN mengganti
       nomornya — jadi ia perubahan yang menunggu Publish, bukan preferensi
       tampilan panel admin. */
    const dipindah = body.deployments.find((d) => d.id === a.id);
    expect(new Date(dipindah!.updatedAt).getTime()).toBeGreaterThan(sebelum);
  });

  it("daftar yang tidak menyebut semua kartu ditolak, tanpa mengubah apa pun", async () => {
    const a = (await create({ sector: "Public Services" })).body.deployment;
    await create({ sector: "Infrastructure" });
    const c = (await create({ sector: "Logistics" })).body.deployment;

    const res = await api("/api/deployments/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [c.id, a.id] }),
    });
    expect(res.status).toBe(422);
    expect((await json<ErrRes>(res)).error).toBeTruthy();

    /* Yang penting bukan status 422-nya, tapi ini: urutan lama harus utuh.
       Menerima daftar setengah akan meninggalkan yang tak disebut di
       `sortOrder` lamanya dan bertabrakan dengan yang baru. */
    expect(await pasangan()).toEqual([
      "Public Services · Indonesia",
      "Infrastructure · Indonesia",
      "Logistics · Indonesia",
    ]);
  });

  it("id kembar di dalam satu daftar ditolak", async () => {
    const a = (await create({ sector: "Public Services" })).body.deployment;
    await create({ sector: "Infrastructure" });

    const res = await api("/api/deployments/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [a.id, a.id] }),
    });
    expect(res.status).toBe(422);
  });

  it("kartu yang sudah dihapus tidak boleh ikut disebut", async () => {
    const a = (await create({ sector: "Public Services" })).body.deployment;
    const b = (await create({ sector: "Infrastructure" })).body.deployment;
    await api(`/api/deployments/${b.id}`, { method: "DELETE" });

    const res = await api("/api/deployments/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });
    expect(res.status).toBe(422);
    expect(await pasangan()).toEqual(["Public Services · Indonesia"]);
  });
});

describe("daftar & ambil satu", () => {
  it("draft ikut di daftar admin", async () => {
    await create();
    await api("/api/deployments", {
      method: "POST",
      body: JSON.stringify(
        deploymentBody({ sector: "Rahasia", state: "draft" }),
      ),
    });

    expect(await pasangan()).toEqual([
      "Logistics · Indonesia",
      "Rahasia · Indonesia",
    ]);
  });

  it("kartu yang tidak ada membalas 404, bukan 500", async () => {
    const res = await api(
      "/api/deployments/00000000-0000-0000-0000-000000000000",
    );
    expect(res.status).toBe(404);
  });
});

describe("mengubah kartu", () => {
  it("PUT mengganti seluruh isi", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/deployments/${dibuat.deployment.id}`, {
      method: "PUT",
      body: JSON.stringify(
        deploymentBody({ region: "International", state: "draft" }),
      ),
    });
    const body = await json<DeploymentRes>(res);

    expect(res.status).toBe(200);
    expect(body.deployment.region).toBe("International");
    expect(body.deployment.state).toBe("draft");
  });

  it("updated_at maju — Postgres tidak melakukannya sendiri", async () => {
    const { body: dibuat } = await create();
    const sebelum = new Date(dibuat.deployment.updatedAt).getTime();

    await new Promise((r) => setTimeout(r, 5));
    const res = await api(`/api/deployments/${dibuat.deployment.id}`, {
      method: "PUT",
      body: JSON.stringify(deploymentBody({ desc: "Kalimatnya diperbarui." })),
    });
    const body = await json<DeploymentRes>(res);

    expect(new Date(body.deployment.updatedAt).getTime()).toBeGreaterThan(
      sebelum,
    );
  });

  it("mengubah tidak menggeser urutannya — nomornya ikut diam", async () => {
    await create({ sector: "Public Services" });
    const b = (await create({ sector: "Infrastructure" })).body.deployment;
    await create({ sector: "Logistics" });

    await api(`/api/deployments/${b.id}`, {
      method: "PUT",
      body: JSON.stringify(
        deploymentBody({ sector: "Infrastructure", desc: "Diubah." }),
      ),
    });

    expect(await pasangan()).toEqual([
      "Public Services · Indonesia",
      "Infrastructure · Indonesia",
      "Logistics · Indonesia",
    ]);
  });
});

describe("hapus = soft delete", () => {
  it("hilang dari daftar, masih ada di database", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/deployments/${dibuat.deployment.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    /* Sektor DAN wilayah: "Logistics" saja tidak cukup memberitahu kartu mana
       yang barusan hilang kalau ada dua. */
    expect((await json<{ deleted: string }>(res)).deleted).toBe(
      "Logistics · Indonesia",
    );
    expect(await pasangan()).toEqual([]);

    const rows = await db.select().from(deployments);
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).not.toBeNull();
  });

  it("pasangannya bebas lagi dipakai kartu baru", async () => {
    const { body: dibuat } = await create();
    await api(`/api/deployments/${dibuat.deployment.id}`, { method: "DELETE" });

    const { res } = await create();
    expect(res.status).toBe(201);
  });

  it("menghapus dua kali membalas 404", async () => {
    const { body: dibuat } = await create();
    await api(`/api/deployments/${dibuat.deployment.id}`, { method: "DELETE" });
    const kedua = await api(`/api/deployments/${dibuat.deployment.id}`, {
      method: "DELETE",
    });
    expect(kedua.status).toBe(404);
  });
});

describe("audit log", () => {
  it("mencatat siapa melakukan apa, dengan salinan isinya", async () => {
    const { body: dibuat } = await create();
    await api(`/api/deployments/${dibuat.deployment.id}`, {
      method: "PUT",
      body: JSON.stringify(deploymentBody({ desc: "Diubah." })),
    });
    await api(`/api/deployments/${dibuat.deployment.id}`, { method: "DELETE" });

    const rows = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entity, "deployment"),
          eq(auditLog.entityId, dibuat.deployment.id),
        ),
      );

    expect(rows.map((r) => r.action).sort()).toEqual([
      "create",
      "delete",
      "update",
    ]);
    expect(rows.every((r) => r.userName === "Editor Test")).toBe(true);

    const dihapus = rows.find((r) => r.action === "delete");
    expect((dihapus?.snapshot as { sector: string }).sector).toBe("Logistics");
  });
});
