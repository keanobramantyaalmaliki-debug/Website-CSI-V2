/**
 * API langkah "Cara kerja", melawan Postgres sungguhan.
 *
 * Yang diuji di sini bukan pemeriksa isian — itu punya testnya sendiri di
 * `shared/validateProcessStep.test.ts` dan tidak butuh database. Yang diuji
 * adalah hal-hal yang cuma muncul saat ada database di belakangnya: urutan
 * yang stabil antar query, soft delete yang membebaskan judul, batas 6 langkah
 * tayang, dan satu hal yang tidak dimiliki entitas lain — ILUSTRASI yang harus
 * tetap menempel pada langkahnya saat urutan berubah.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

import { MAX_LIVE_PROCESS_STEPS } from "@shared/processStep";

import { app } from "../app";
import type { ProcessStepRecord } from "../processStepsRepo";
import { db, sql } from "../db/client";
import { auditLog, processSteps } from "../db/schema";
import {
  asEditor,
  loginAsEditor,
  processStepBody,
  resetDb,
  type Login,
} from "../test/helpers";

const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;
type StepRes = { step: ProcessStepRecord };
type ListRes = { steps: ProcessStepRecord[] };
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
  const res = await api("/api/process-steps", {
    method: "POST",
    body: JSON.stringify(processStepBody(over)),
  });
  return { res, body: await json<StepRes & ErrRes>(res) };
};

/** Judul langkah hidup, sesuai urutan yang dibalas API. */
const titles = async () =>
  (await json<ListRes>(await api("/api/process-steps"))).steps.map(
    (s) => s.title,
  );

describe("gerbang login", () => {
  it("tanpa sesi, endpoint cara kerja tertutup — termasuk urutkan", async () => {
    const anon = (path: string, init: RequestInit = {}) =>
      app.request(path, {
        ...init,
        headers: { "content-type": "application/json" },
      });

    expect((await anon("/api/process-steps")).status).toBe(401);
    expect(
      (await anon("/api/process-steps", { method: "POST", body: "{}" })).status,
    ).toBe(401);
    /* Disebut terpisah karena bentuk pathnya beda sendiri: kalau middleware
       dipasang hanya pada "/api/process-steps/*", route tanpa id seperti ini
       gampang lolos tanpa ada yang sadar. */
    expect(
      (await anon("/api/process-steps/urutkan", { method: "POST", body: "{}" }))
        .status,
    ).toBe(401);
    expect(
      (await anon("/api/process-steps/apa-saja", { method: "DELETE" })).status,
    ).toBe(401);
  });
});

describe("membuat langkah", () => {
  it("menyimpan isian beserta ilustrasinya", async () => {
    const { res, body } = await create();

    expect(res.status).toBe(201);
    expect(body.step.title).toBe("Discovery");
    expect(body.step.kicker).toBe("UNDERSTAND");
    expect(body.step.glyph).toBe("discovery");
    expect(body.step.state).toBe("live");
    /* Belum pernah dipublish, jadi badge "belum terpublish" harus menyala sejak
       detik pertama. */
    expect(body.step.publishedAt).toBeNull();
    expect(body.step.unpublished).toBe(true);
  });

  it("spasi di ujung isian dirapikan sebelum disimpan", async () => {
    const { body } = await create({ title: "  Discovery  " });
    expect(body.step.title).toBe("Discovery");
  });

  it("draft boleh setengah jadi, tayang tidak", async () => {
    const draft = await api("/api/process-steps", {
      method: "POST",
      body: JSON.stringify({
        title: "Belum selesai",
        glyph: "strategy",
        state: "draft",
      }),
    });
    expect(draft.status).toBe(201);

    const { res, body } = await create({ kicker: "", desc: "" });
    expect(res.status).toBe(422);
    expect(body.errors.kicker).toBeTruthy();
    expect(body.errors.desc).toBeTruthy();
  });

  it("ilustrasi di luar enam pilihan ditolak, bukan diam-diam jadi bawaan", async () => {
    /* Kalau `glyph` dijatuhkan ke "discovery" saat namanya tak dikenal, panel
       akan melapor "tersimpan" untuk isian yang tidak tersimpan — dan gambar
       yang salah tidak pernah kelihatan salah. */
    const { res, body } = await create({ glyph: "radar" });
    expect(res.status).toBe(422);
    expect(body.errors.glyph).toBeTruthy();
  });

  it("dua langkah boleh memakai ilustrasi yang sama", async () => {
    await create({ title: "Discovery" });
    /* Sengaja tidak dilarang: menukar ilustrasi dua langkah akan mustahil
       kalau kembar dilarang — salah satunya harus diparkir dulu di gambar
       ketiga. */
    const { res } = await create({ title: "Riset lanjutan" });
    expect(res.status).toBe(201);
  });

  it("judul kembar ditolak, tanpa membedakan huruf besar-kecil", async () => {
    await create();
    const { res, body } = await create({ title: "discovery" });

    expect(res.status).toBe(422);
    expect(body.errors.title).toContain("discovery");

    const rows = await db.select().from(processSteps);
    expect(rows).toHaveLength(1);
  });
});

/**
 * Batas 6 — bukan geometri seperti batas 13 industri (talinya melayani berapa
 * pun kartu), melainkan panjang halaman: "How We Work" sudah jadi seksi
 * terpanjang di halaman depan, dan gambar yang tersedia memang cuma enam.
 */
describe(`batas ${MAX_LIVE_PROCESS_STEPS} langkah tayang`, () => {
  /** Isi daftar sampai penuh. */
  const penuhi = async (jumlah = MAX_LIVE_PROCESS_STEPS) => {
    for (let i = 0; i < jumlah; i += 1) {
      const { res } = await create({ title: `Langkah ${i + 1}` });
      expect(res.status).toBe(201);
    }
  };

  it("langkah ke-7 yang tayang ditolak, dan alasannya terbaca manusia", async () => {
    await penuhi();

    const { res, body } = await create({ title: "Satu Lagi" });
    expect(res.status).toBe(422);
    /* Dilaporkan di isian `state`, bukan `title`: yang salah bukan judulnya
       melainkan keputusan menayangkannya. */
    expect(body.errors.state).toContain(String(MAX_LIVE_PROCESS_STEPS));
    expect(body.errors.title).toBeUndefined();

    const rows = await db.select().from(processSteps);
    expect(rows).toHaveLength(MAX_LIVE_PROCESS_STEPS);
  });

  it("draft ke-7 tetap boleh — yang dibatasi cuma yang tayang", async () => {
    await penuhi();

    const res = await api("/api/process-steps", {
      method: "POST",
      body: JSON.stringify(
        processStepBody({ title: "Disiapkan Dulu", state: "draft" }),
      ),
    });
    expect(res.status).toBe(201);
  });

  it("langkah yang sudah tayang tidak menghitung dirinya sendiri saat disunting", async () => {
    await penuhi(MAX_LIVE_PROCESS_STEPS - 1);
    const { body } = await create({ title: "Yang Terakhir" });

    /* Daftar sudah penuh. Menyunting salah satunya tanpa mengubah status
       tidak boleh ditolak — kalau `exceptId` lupa, seluruh daftar membeku. */
    const res = await api(`/api/process-steps/${body.step.id}`, {
      method: "PUT",
      body: JSON.stringify(
        processStepBody({
          title: "Yang Terakhir",
          desc: "Kalimatnya diperbaiki sedikit saja.",
        }),
      ),
    });
    expect(res.status).toBe(200);
  });

  it("menaikkan draft jadi tayang di daftar yang penuh ditolak", async () => {
    await penuhi();
    const { body } = await create({ title: "Antre", state: "draft" });

    const res = await api(`/api/process-steps/${body.step.id}`, {
      method: "PUT",
      body: JSON.stringify(processStepBody({ title: "Antre", state: "live" })),
    });
    expect(res.status).toBe(422);
    expect((await json<ErrRes>(res)).errors.state).toBeTruthy();
  });

  it("menghapus satu langkah membuka satu tempat lagi", async () => {
    await penuhi();
    const semua = (await json<ListRes>(await api("/api/process-steps"))).steps;

    await api(`/api/process-steps/${semua[0].id}`, { method: "DELETE" });

    const { res } = await create({ title: "Pengganti" });
    expect(res.status).toBe(201);
  });
});

describe("urutan", () => {
  it("langkah baru mendarat di bawah, bukan di atas", async () => {
    await create({ title: "Discovery" });
    await create({ title: "Design" });
    await create({ title: "Deployment" });

    /* Urutan di sini adalah alur kerja yang dibaca dari atas ke bawah
       SEKALIGUS nomor 01–06 yang tercetak di kartunya. */
    expect(await titles()).toEqual(["Discovery", "Design", "Deployment"]);
  });

  it("POST /urutkan menyusun ulang dan menaikkan updated_at", async () => {
    const a = (await create({ title: "Discovery" })).body.step;
    const b = (await create({ title: "Design" })).body.step;
    const c = (await create({ title: "Deployment" })).body.step;

    const sebelum = new Date(a.updatedAt).getTime();
    await new Promise((r) => setTimeout(r, 5));

    const res = await api("/api/process-steps/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [c.id, a.id, b.id] }),
    });
    const body = await json<ListRes>(res);

    expect(res.status).toBe(200);
    expect(body.steps.map((s) => s.title)).toEqual([
      "Deployment",
      "Discovery",
      "Design",
    ]);
    expect(await titles()).toEqual(["Deployment", "Discovery", "Design"]);

    /* Urutan adalah konten yang tayang — ia memindahkan kartu DAN mengganti
       nomornya — jadi ia perubahan yang menunggu Publish. */
    const dipindah = body.steps.find((s) => s.id === a.id);
    expect(new Date(dipindah!.updatedAt).getTime()).toBeGreaterThan(sebelum);
  });

  it("ilustrasi ikut pindah bersama langkahnya", async () => {
    const a = (await create({ title: "Discovery", glyph: "discovery" })).body
      .step;
    const b = (await create({ title: "Design", glyph: "design" })).body.step;

    const res = await api("/api/process-steps/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });

    /* Inti seluruh slice ini: dulu gambar dipilih `PROCESS_GLYPHS[i]`, jadi
       menukar urutan menukar gambar tanpa ada yang meminta. Sekarang gambar
       MILIK langkahnya. */
    expect((await json<ListRes>(res)).steps.map((s) => [s.title, s.glyph])).toEqual(
      [
        ["Design", "design"],
        ["Discovery", "discovery"],
      ],
    );
  });

  it("daftar yang tidak menyebut semua langkah ditolak, tanpa mengubah apa pun", async () => {
    const a = (await create({ title: "Discovery" })).body.step;
    await create({ title: "Design" });
    const c = (await create({ title: "Deployment" })).body.step;

    const res = await api("/api/process-steps/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [c.id, a.id] }),
    });
    expect(res.status).toBe(422);
    expect((await json<ErrRes>(res)).error).toBeTruthy();

    /* Yang penting bukan status 422-nya, tapi ini: urutan lama harus utuh. */
    expect(await titles()).toEqual(["Discovery", "Design", "Deployment"]);
  });

  it("id kembar di dalam satu daftar ditolak", async () => {
    const a = (await create({ title: "Discovery" })).body.step;
    await create({ title: "Design" });

    const res = await api("/api/process-steps/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [a.id, a.id] }),
    });
    expect(res.status).toBe(422);
  });

  it("langkah yang sudah dihapus tidak boleh ikut disebut", async () => {
    const a = (await create({ title: "Discovery" })).body.step;
    const b = (await create({ title: "Design" })).body.step;
    await api(`/api/process-steps/${b.id}`, { method: "DELETE" });

    const res = await api("/api/process-steps/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });
    expect(res.status).toBe(422);
    expect(await titles()).toEqual(["Discovery"]);
  });
});

describe("daftar & ambil satu", () => {
  it("draft ikut di daftar admin", async () => {
    await create();
    await api("/api/process-steps", {
      method: "POST",
      body: JSON.stringify(processStepBody({ title: "Rahasia", state: "draft" })),
    });

    expect(await titles()).toEqual(["Discovery", "Rahasia"]);
  });

  it("langkah yang tidak ada membalas 404, bukan 500", async () => {
    const res = await api(
      "/api/process-steps/00000000-0000-0000-0000-000000000000",
    );
    expect(res.status).toBe(404);
  });
});

describe("mengubah langkah", () => {
  it("PUT mengganti seluruh isi", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/process-steps/${dibuat.step.id}`, {
      method: "PUT",
      body: JSON.stringify(
        processStepBody({ glyph: "testing", state: "draft" }),
      ),
    });
    const body = await json<StepRes>(res);

    expect(res.status).toBe(200);
    expect(body.step.glyph).toBe("testing");
    expect(body.step.state).toBe("draft");
  });

  it("updated_at maju — Postgres tidak melakukannya sendiri", async () => {
    const { body: dibuat } = await create();
    const sebelum = new Date(dibuat.step.updatedAt).getTime();

    await new Promise((r) => setTimeout(r, 5));
    const res = await api(`/api/process-steps/${dibuat.step.id}`, {
      method: "PUT",
      body: JSON.stringify(processStepBody({ desc: "Kalimatnya diperbarui." })),
    });
    const body = await json<StepRes>(res);

    expect(new Date(body.step.updatedAt).getTime()).toBeGreaterThan(sebelum);
  });

  it("mengubah tidak menggeser urutannya — nomornya ikut diam", async () => {
    await create({ title: "Discovery" });
    const b = (await create({ title: "Design" })).body.step;
    await create({ title: "Deployment" });

    await api(`/api/process-steps/${b.id}`, {
      method: "PUT",
      body: JSON.stringify(processStepBody({ title: "Design", glyph: "design" })),
    });

    expect(await titles()).toEqual(["Discovery", "Design", "Deployment"]);
  });

  it("judul sendiri tidak dihitung bentrok", async () => {
    const { body: dibuat } = await create();
    const res = await api(`/api/process-steps/${dibuat.step.id}`, {
      method: "PUT",
      body: JSON.stringify(processStepBody({ desc: "Diubah sedikit saja." })),
    });
    expect(res.status).toBe(200);
  });
});

describe("hapus = soft delete", () => {
  it("hilang dari daftar, masih ada di database", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/process-steps/${dibuat.step.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    expect((await json<{ deleted: string }>(res)).deleted).toBe("Discovery");
    expect(await titles()).toEqual([]);

    const rows = await db.select().from(processSteps);
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).not.toBeNull();
  });

  it("judulnya bebas lagi dipakai langkah baru", async () => {
    const { body: dibuat } = await create();
    await api(`/api/process-steps/${dibuat.step.id}`, { method: "DELETE" });

    const { res } = await create();
    expect(res.status).toBe(201);
  });

  it("menghapus dua kali membalas 404", async () => {
    const { body: dibuat } = await create();
    await api(`/api/process-steps/${dibuat.step.id}`, { method: "DELETE" });
    const kedua = await api(`/api/process-steps/${dibuat.step.id}`, {
      method: "DELETE",
    });
    expect(kedua.status).toBe(404);
  });
});

describe("audit log", () => {
  it("mencatat siapa melakukan apa, dengan salinan isinya", async () => {
    const { body: dibuat } = await create();
    await api(`/api/process-steps/${dibuat.step.id}`, {
      method: "PUT",
      body: JSON.stringify(processStepBody({ desc: "Diubah seperlunya." })),
    });
    await api(`/api/process-steps/${dibuat.step.id}`, { method: "DELETE" });

    const rows = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entity, "process-step"),
          eq(auditLog.entityId, dibuat.step.id),
        ),
      );

    expect(rows.map((r) => r.action).sort()).toEqual([
      "create",
      "delete",
      "update",
    ]);
    expect(rows.every((r) => r.userName === "Editor Test")).toBe(true);

    const dihapus = rows.find((r) => r.action === "delete");
    expect((dihapus?.snapshot as { title: string }).title).toBe("Discovery");
  });
});
