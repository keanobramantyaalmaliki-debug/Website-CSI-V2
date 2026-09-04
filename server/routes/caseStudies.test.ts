/**
 * API case study, melawan Postgres sungguhan.
 *
 * Pemeriksa isian punya testnya sendiri di `shared/` dan tidak butuh database.
 * Yang diuji di sini adalah hal-hal yang cuma muncul kalau ada database di
 * belakangnya: urutan blok cerita yang harus stabil, `POST /urutkan` yang
 * menolak daftar setengah, soft delete yang membebaskan judul — dan LINGKUP
 * PEKERJAAN, yang tinggal di tabel anaknya sendiri (`case_study_scopes`) dan
 * karena itu bisa tertinggal, terbalik, atau menumpuk tiap kali disimpan ulang.
 *
 * Satu hal yang tidak dipunyai empat entitas sebelumnya juga diuji di sini:
 * `desc` yang bentuknya dibawa oleh spasi putih, sehingga apa yang tersimpan
 * harus persis apa yang sudah dirapikan pemeriksa isian.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

import { app } from "../app";
import type { CaseStudyRecord } from "../caseStudiesRepo";
import { db, sql } from "../db/client";
import { auditLog, caseStudies, caseStudyScopes } from "../db/schema";
import {
  asEditor,
  caseStudyBody,
  loginAsEditor,
  resetDb,
  type Login,
} from "../test/helpers";

const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;
type StudyRes = { study: CaseStudyRecord };
type ListRes = { studies: CaseStudyRecord[] };
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
  const res = await api("/api/case-studies", {
    method: "POST",
    body: JSON.stringify(caseStudyBody(over)),
  });
  return { res, body: await json<StudyRes & ErrRes>(res) };
};

/** Judul cerita hidup, sesuai urutan yang dibalas API. */
const titles = async () =>
  (await json<ListRes>(await api("/api/case-studies"))).studies.map(
    (s) => s.title,
  );

describe("gerbang login", () => {
  it("tanpa sesi, endpoint case study tertutup — termasuk urutkan", async () => {
    const anon = (path: string, init: RequestInit = {}) =>
      app.request(path, {
        ...init,
        headers: { "content-type": "application/json" },
      });

    expect((await anon("/api/case-studies")).status).toBe(401);
    expect(
      (await anon("/api/case-studies", { method: "POST", body: "{}" })).status,
    ).toBe(401);
    /* Disebut terpisah karena bentuk pathnya beda sendiri: kalau middleware
       dipasang hanya pada "/api/case-studies/*", route tanpa id seperti ini
       gampang lolos tanpa ada yang sadar. */
    expect(
      (await anon("/api/case-studies/urutkan", { method: "POST", body: "{}" }))
        .status,
    ).toBe(401);
    expect(
      (await anon("/api/case-studies/apa-saja", { method: "DELETE" })).status,
    ).toBe(401);
  });
});

describe("membuat case study", () => {
  it("menyimpan isian, lingkup, dan menautkan gambarnya", async () => {
    const { res, body } = await create();

    expect(res.status).toBe(201);
    expect(body.study.title).toBe("Citizen Service Portal");
    expect(body.study.client).toBe("Regional Government");
    expect(body.study.year).toBe("2024");
    expect(body.study.industry).toBe("Public Sector");
    expect(body.study.outcome).toBe("67% faster turnaround");
    expect(body.study.image).toBe("/work/citizen-portal.webp");
    expect(body.study.scope).toEqual(["Web Platform", "Staff Training"]);
    expect(body.study.state).toBe("live");
    /* Belum pernah dipublish, jadi badge "belum terpublish" harus menyala sejak
       detik pertama. */
    expect(body.study.publishedAt).toBeNull();
    expect(body.study.unpublished).toBe(true);
  });

  it("spasi di ujung isian dirapikan sebelum disimpan", async () => {
    const { body } = await create({ title: "  Citizen Service Portal  " });
    expect(body.study.title).toBe("Citizen Service Portal");
  });

  it("draft boleh setengah jadi, tayang tidak", async () => {
    const draft = await api("/api/case-studies", {
      method: "POST",
      body: JSON.stringify({ title: "Belum selesai", state: "draft" }),
    });
    expect(draft.status).toBe(201);

    const { res, body } = await create({
      client: "",
      year: "",
      image: "",
      outcome: "",
    });
    expect(res.status).toBe(422);
    expect(body.errors.client).toBeTruthy();
    expect(body.errors.year).toBeTruthy();
    expect(body.errors.image).toBeTruthy();
    /* Beda dengan kartu proyek: di sini baris hasil dicetak tanpa gerbang, di
       antara judul dan tombol "Read the full story". */
    expect(body.errors.outcome).toBeTruthy();
  });

  it("judul kembar ditolak, tanpa membedakan huruf besar-kecil", async () => {
    await create();
    const { res, body } = await create({ title: "citizen service portal" });

    expect(res.status).toBe(422);
    expect(body.errors.title).toContain("citizen service portal");

    const rows = await db.select().from(caseStudies);
    expect(rows).toHaveLength(1);
  });
});

describe("lingkup pekerjaan", () => {
  it("urutan lingkup yang dikirim dipertahankan apa adanya", async () => {
    const { body } = await create({
      scope: ["Zig", "Ada", "Blade"],
    });
    /* Bukan A-Z: urutan lingkup adalah urutan yang dipilih editor, dan itu yang
       dibaca daftar "Scope" di situs. */
    expect(body.study.scope).toEqual(["Zig", "Ada", "Blade"]);
  });

  it("menyimpan ulang mengganti lingkup, bukan menumpuknya", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/case-studies/${dibuat.study.id}`, {
      method: "PUT",
      body: JSON.stringify(caseStudyBody({ scope: ["Web Platform"] })),
    });
    expect((await json<StudyRes>(res)).study.scope).toEqual(["Web Platform"]);

    /* Yang dijaga di baris ini adalah tabelnya sendiri: hapus-lalu-sisipkan
       yang lupa menghapus meninggalkan lingkup lama tanpa terlihat di API. */
    const rows = await db.select().from(caseStudyScopes);
    expect(rows).toHaveLength(1);
  });

  it("cerita tayang tanpa lingkup ditolak — judul 'Scope' tetap dicetak", async () => {
    const { res, body } = await create({ scope: [] });
    expect(res.status).toBe(422);
    expect(body.errors.scope).toBeTruthy();
  });

  it("lingkup kembar ditolak — teksnya dipakai sebagai key React di situs", async () => {
    const { res, body } = await create({
      scope: ["Web Platform", "web platform"],
    });
    expect(res.status).toBe(422);
    expect(body.errors.scope).toBeTruthy();
  });

  it("isian selain teks di dalam daftar lingkup dibuang, bukan disimpan", async () => {
    const res = await api("/api/case-studies", {
      method: "POST",
      body: JSON.stringify(
        caseStudyBody({ scope: ["Web Platform", 7, null] }),
      ),
    });
    expect((await json<StudyRes>(res)).study.scope).toEqual(["Web Platform"]);
  });
});

/**
 * Satu-satunya isian di seluruh CMS ini yang bentuknya dibawa oleh spasi putih.
 * `CaseStudySpotlight.tsx` memisahkan `desc` dengan `split("\n\n")` apa adanya,
 * jadi kalau yang tersimpan tidak sama dengan yang sudah dirapikan pemeriksa
 * isian, paragraf yang tayang tidak sama dengan yang dilihat editor di panel.
 */
describe("cerita berparagraf", () => {
  it("yang tersimpan adalah teks yang sudah dirapikan, bukan ketikan mentah", async () => {
    const { body } = await create({
      desc: "Masalahnya begini.\r\n\r\n\r\nLalu dikerjakan begitu.   ",
    });
    expect(body.study.desc).toBe(
      "Masalahnya begini.\n\nLalu dikerjakan begitu.",
    );
    expect(body.study.desc.split("\n\n")).toHaveLength(2);
  });

  it("perapian juga berlaku saat disimpan ulang, bukan cuma saat dibuat", async () => {
    const { body: dibuat } = await create();
    const res = await api(`/api/case-studies/${dibuat.study.id}`, {
      method: "PUT",
      body: JSON.stringify(
        caseStudyBody({ desc: "Satu.\r\n\r\n\r\n\r\nDua." }),
      ),
    });
    expect((await json<StudyRes>(res)).study.desc).toBe("Satu.\n\nDua.");
  });
});

describe("urutan", () => {
  it("cerita baru mendarat di bawah, bukan di atas", async () => {
    await create({ title: "Citizen Service Portal" });
    await create({ title: "Field Operations Suite" });
    await create({ title: "Grid Monitoring" });

    /* Blok pertama adalah cerita yang pertama dibaca pengunjung halaman Work.
       Cerita baru tidak boleh merebut tempat itu tanpa diminta. */
    expect(await titles()).toEqual([
      "Citizen Service Portal",
      "Field Operations Suite",
      "Grid Monitoring",
    ]);
  });

  it("POST /urutkan menyusun ulang dan menaikkan updated_at", async () => {
    const a = (await create({ title: "Citizen Service Portal" })).body.study;
    const b = (await create({ title: "Field Operations Suite" })).body.study;
    const c = (await create({ title: "Grid Monitoring" })).body.study;

    const sebelum = new Date(a.updatedAt).getTime();
    await new Promise((r) => setTimeout(r, 5));

    const res = await api("/api/case-studies/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [c.id, a.id, b.id] }),
    });
    const body = await json<ListRes>(res);

    expect(res.status).toBe(200);
    expect(body.studies.map((s) => s.title)).toEqual([
      "Grid Monitoring",
      "Citizen Service Portal",
      "Field Operations Suite",
    ]);
    expect(await titles()).toEqual([
      "Grid Monitoring",
      "Citizen Service Portal",
      "Field Operations Suite",
    ]);

    /* Urutan adalah konten yang tayang: memindahkan blok adalah perubahan yang
       menunggu Publish, bukan preferensi tampilan panel admin. */
    const dipindah = body.studies.find((s) => s.id === a.id);
    expect(new Date(dipindah!.updatedAt).getTime()).toBeGreaterThan(sebelum);
  });

  it("memindahkan urutan tidak menghilangkan lingkup", async () => {
    const a = (await create({ title: "Citizen Service Portal" })).body.study;
    const b = (
      await create({
        title: "Grid Monitoring",
        scope: ["Telemetry", "Field App"],
      })
    ).body.study;

    const res = await api("/api/case-studies/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });
    const body = await json<ListRes>(res);
    expect(body.studies[0].scope).toEqual(["Telemetry", "Field App"]);
  });

  it("daftar yang tidak menyebut semua cerita ditolak, tanpa mengubah apa pun", async () => {
    const a = (await create({ title: "Citizen Service Portal" })).body.study;
    await create({ title: "Field Operations Suite" });
    const c = (await create({ title: "Grid Monitoring" })).body.study;

    const res = await api("/api/case-studies/urutkan", {
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
      "Field Operations Suite",
      "Grid Monitoring",
    ]);
  });

  it("id kembar di dalam satu daftar ditolak", async () => {
    const a = (await create({ title: "Citizen Service Portal" })).body.study;
    await create({ title: "Grid Monitoring" });

    const res = await api("/api/case-studies/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [a.id, a.id] }),
    });
    expect(res.status).toBe(422);
  });

  it("cerita yang sudah dihapus tidak boleh ikut disebut", async () => {
    const a = (await create({ title: "Citizen Service Portal" })).body.study;
    const b = (await create({ title: "Grid Monitoring" })).body.study;
    await api(`/api/case-studies/${b.id}`, { method: "DELETE" });

    const res = await api("/api/case-studies/urutkan", {
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
    await api("/api/case-studies", {
      method: "POST",
      body: JSON.stringify(caseStudyBody({ title: "Rahasia", state: "draft" })),
    });

    expect(await titles()).toEqual(["Citizen Service Portal", "Rahasia"]);
  });

  it("cerita yang tidak ada membalas 404, bukan 500", async () => {
    const res = await api(
      "/api/case-studies/00000000-0000-0000-0000-000000000000",
    );
    expect(res.status).toBe(404);
  });

  it("ambil satu membawa lingkupnya juga — form admin mengandalkan ini", async () => {
    const { body: dibuat } = await create();
    const res = await api(`/api/case-studies/${dibuat.study.id}`);
    expect((await json<StudyRes>(res)).study.scope).toEqual([
      "Web Platform",
      "Staff Training",
    ]);
  });
});

describe("mengubah case study", () => {
  it("PUT mengganti seluruh isi", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/case-studies/${dibuat.study.id}`, {
      method: "PUT",
      body: JSON.stringify(
        caseStudyBody({ outcome: "Hasil yang baru", state: "draft" }),
      ),
    });
    const body = await json<StudyRes>(res);

    expect(res.status).toBe(200);
    expect(body.study.outcome).toBe("Hasil yang baru");
    expect(body.study.state).toBe("draft");
  });

  it("updated_at maju — Postgres tidak melakukannya sendiri", async () => {
    const { body: dibuat } = await create();
    const sebelum = new Date(dibuat.study.updatedAt).getTime();

    await new Promise((r) => setTimeout(r, 5));
    const res = await api(`/api/case-studies/${dibuat.study.id}`, {
      method: "PUT",
      body: JSON.stringify(caseStudyBody({ outcome: "Diperbarui." })),
    });
    const body = await json<StudyRes>(res);

    expect(new Date(body.study.updatedAt).getTime()).toBeGreaterThan(sebelum);
  });

  it("mengubah tidak menggeser urutannya", async () => {
    await create({ title: "Citizen Service Portal" });
    const b = (await create({ title: "Field Operations Suite" })).body.study;
    await create({ title: "Grid Monitoring" });

    await api(`/api/case-studies/${b.id}`, {
      method: "PUT",
      body: JSON.stringify(
        caseStudyBody({ title: "Field Operations Suite", outcome: "Baru" }),
      ),
    });

    expect(await titles()).toEqual([
      "Citizen Service Portal",
      "Field Operations Suite",
      "Grid Monitoring",
    ]);
  });

  it("judul sendiri tidak dihitung bentrok", async () => {
    const { body: dibuat } = await create();
    const res = await api(`/api/case-studies/${dibuat.study.id}`, {
      method: "PUT",
      body: JSON.stringify(caseStudyBody({ outcome: "Diubah sedikit saja." })),
    });
    expect(res.status).toBe(200);
  });
});

describe("hapus = soft delete", () => {
  it("hilang dari daftar, masih ada di database", async () => {
    const { body: dibuat } = await create();

    const res = await api(`/api/case-studies/${dibuat.study.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    expect((await json<{ deleted: string }>(res)).deleted).toBe(
      "Citizen Service Portal",
    );
    expect(await titles()).toEqual([]);

    const rows = await db.select().from(caseStudies);
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).not.toBeNull();
  });

  it("judulnya bebas lagi dipakai cerita baru", async () => {
    const { body: dibuat } = await create();
    await api(`/api/case-studies/${dibuat.study.id}`, { method: "DELETE" });

    const { res } = await create();
    expect(res.status).toBe(201);
  });

  it("menghapus dua kali membalas 404", async () => {
    const { body: dibuat } = await create();
    await api(`/api/case-studies/${dibuat.study.id}`, { method: "DELETE" });
    const kedua = await api(`/api/case-studies/${dibuat.study.id}`, {
      method: "DELETE",
    });
    expect(kedua.status).toBe(404);
  });
});

describe("audit log", () => {
  it("mencatat siapa melakukan apa, dengan salinan isinya", async () => {
    const { body: dibuat } = await create();
    await api(`/api/case-studies/${dibuat.study.id}`, {
      method: "PUT",
      body: JSON.stringify(caseStudyBody({ outcome: "Diubah." })),
    });
    await api(`/api/case-studies/${dibuat.study.id}`, { method: "DELETE" });

    const rows = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entity, "case_study"),
          eq(auditLog.entityId, dibuat.study.id),
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
