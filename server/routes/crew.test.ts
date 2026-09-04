/**
 * API crew, melawan Postgres sungguhan.
 *
 * Bukan mock, alasan yang sama dengan `jobs.test.ts`: yang paling mungkin
 * salah di lapisan ini justru hal-hal yang mock tidak pernah tahu — indeks
 * unik parsial pada nama, transaksi dua tabel saat menyimpan tautan sosial,
 * dan soft delete yang harus menghilangkan baris dari daftar tanpa
 * menghilangkannya dari database.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { app } from "../app";
import type { CrewRecord } from "../crewRepo";
import { db, sql } from "../db/client";
import { auditLog, crewMembers, crewSocials } from "../db/schema";
import {
  asEditor,
  crewBody,
  loginAsEditor,
  resetDb,
  type Login,
} from "../test/helpers";

const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;
type MemberRes = { member: CrewRecord };
type ListRes = { crew: CrewRecord[] };
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
  const res = await api("/api/crew", {
    method: "POST",
    body: JSON.stringify(crewBody(over)),
  });
  return { res, body: await json<MemberRes & ErrRes>(res) };
};

/* ─────────────────────────── pagar ────────────────────────── */

describe("penjaga login", () => {
  it("menolak tanpa cookie sesi", async () => {
    const res = await app.request("/api/crew");
    expect(res.status).toBe(401);
  });

  it("menolak menyimpan tanpa cookie sesi", async () => {
    const res = await app.request("/api/crew", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(crewBody()),
    });
    expect(res.status).toBe(401);

    const rows = await db.select().from(crewMembers);
    expect(rows).toHaveLength(0);
  });
});

/* ────────────────────────── membuat ───────────────────────── */

describe("POST /api/crew", () => {
  it("menyimpan anggota beserta tautan sosialnya", async () => {
    const { res, body } = await create();
    expect(res.status).toBe(201);
    expect(body.member.name).toBe("Bagas Nusantara Nabillah");
    expect(body.member.social).toEqual([
      { platform: "linkedin", url: "https://linkedin.com/in/bagas" },
    ]);
    expect(body.member.photo).toBe("/people/bagas.webp");
  });

  it("menyimpan urutan tautan apa adanya, bukan urutan acak dari Postgres", async () => {
    const { body } = await create({
      social: [
        { platform: "x", url: "https://x.com/bagas" },
        { platform: "linkedin", url: "https://linkedin.com/in/bagas" },
        { platform: "github", url: "https://github.com/bagas" },
      ],
    });

    expect(body.member.social.map((s) => s.platform)).toEqual([
      "x",
      "linkedin",
      "github",
    ]);
  });

  it("mencatat pembuatan ke audit log", async () => {
    const { body } = await create();

    const rows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, body.member.id));

    expect(rows).toHaveLength(1);
    expect(rows[0].entity).toBe("crew");
    expect(rows[0].action).toBe("create");
    expect(rows[0].userName).toBe("Editor Test");
  });

  it("draft boleh setengah jadi", async () => {
    const { res, body } = await create({
      state: "draft",
      role: "",
      photo: "",
      social: [],
    });
    expect(res.status).toBe(201);
    expect(body.member.state).toBe("draft");
  });

  /* Nama tetap wajib walau draft: tanpa nama, barisnya tidak bisa dikenali
     lagi di daftar admin — editor kehilangan satu-satunya cara membukanya. */
  it("menolak draft tanpa nama", async () => {
    const { res, body } = await create({ state: "draft", name: "  " });
    expect(res.status).toBe(422);
    expect(body.errors.name).toBeTruthy();
  });

  it("menolak yang tayang tanpa peran", async () => {
    const { res, body } = await create({ role: "" });
    expect(res.status).toBe(422);
    expect(body.errors.role).toBeTruthy();
  });

  it("menolak departemen di luar daftar", async () => {
    const { res, body } = await create({ category: "Marketing" });
    expect(res.status).toBe(422);
    expect(body.errors.category).toBeTruthy();
  });

  /* Foto BOLEH kosong — situs menggambar avatar inisial. Kalau ini pernah
     berubah jadi wajib, empat orang yang sudah tayang tanpa foto tidak akan
     bisa disimpan lagi. */
  it("menerima yang tayang tanpa foto", async () => {
    const { res, body } = await create({ photo: "" });
    expect(res.status).toBe(201);
    expect(body.member.photo).toBe("");
  });

  it("menolak tautan tanpa http/https", async () => {
    const { res, body } = await create({
      social: [{ platform: "linkedin", url: "linkedin.com/in/bagas" }],
    });
    expect(res.status).toBe(422);
    expect(body.errors.social).toBeTruthy();
  });

  it("menolak dua tautan platform yang sama", async () => {
    const { res, body } = await create({
      social: [
        { platform: "linkedin", url: "https://a.com" },
        { platform: "linkedin", url: "https://b.com" },
      ],
    });
    expect(res.status).toBe(422);
    expect(body.errors.social).toBeTruthy();
  });

  /* Platform asing tidak pernah bisa datang dari form (`<select>` tiga
     pilihan), jadi ia dibuang di parse — bukan ditolak dengan pesan yang cuma
     akan membingungkan orang yang tidak melakukan kesalahan apa pun. */
  it("membuang baris sosial yang platformnya tidak dikenal", async () => {
    const { res, body } = await create({
      social: [
        { platform: "friendster", url: "https://friendster.com/bagas" },
        { platform: "github", url: "https://github.com/bagas" },
      ],
    });
    expect(res.status).toBe(201);
    expect(body.member.social).toEqual([
      { platform: "github", url: "https://github.com/bagas" },
    ]);
  });

  it("menolak nama yang sudah dipakai anggota hidup", async () => {
    await create();
    const { res, body } = await create();
    expect(res.status).toBe(422);
    expect(body.errors.name).toContain("sudah dipakai");
  });

  /* Indeks uniknya parsial (`where deleted_at is null`) justru supaya ini
     mungkin: orang yang keluar lalu bergabung lagi bukan kejadian aneh. */
  it("mengizinkan nama yang sudah dipakai anggota TERHAPUS", async () => {
    const pertama = await create();
    await api(`/api/crew/${pertama.body.member.id}`, { method: "DELETE" });

    const { res } = await create();
    expect(res.status).toBe(201);
  });

  it("tidak membiarkan anggota setengah jadi kalau tautannya ditolak", async () => {
    await create({
      name: "Orang Gagal",
      social: [{ platform: "linkedin", url: "bukan-url" }],
    });

    const rows = await db
      .select()
      .from(crewMembers)
      .where(eq(crewMembers.name, "Orang Gagal"));
    expect(rows).toHaveLength(0);
  });
});

/* ────────────────────────── membaca ───────────────────────── */

describe("GET /api/crew", () => {
  it("menyertakan draft — panel admin harus melihatnya", async () => {
    await create({ state: "draft", name: "Masih Draft", role: "" });

    const body = await json<ListRes>(await api("/api/crew"));
    expect(body.crew.map((m) => m.name)).toContain("Masih Draft");
  });

  /* Enum Postgres diurutkan menurut urutan deklarasi, jadi Management datang
     sebelum Developer — persis urutan kolom di situs. */
  it("urut departemen lalu nama, dan urutannya tetap antar pemanggilan", async () => {
    await create({ name: "Zulfa", category: "Developer" });
    await create({ name: "Andi", category: "Developer" });
    await create({ name: "Jun", category: "Management" });

    const sekali = await json<ListRes>(await api("/api/crew"));
    const dua = await json<ListRes>(await api("/api/crew"));

    expect(sekali.crew.map((m) => m.name)).toEqual(["Jun", "Andi", "Zulfa"]);
    expect(dua.crew.map((m) => m.name)).toEqual(sekali.crew.map((m) => m.name));
  });

  it("404 untuk id yang tidak ada", async () => {
    const res = await api("/api/crew/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});

/* ────────────────────────── mengubah ──────────────────────── */

describe("PUT /api/crew/:id", () => {
  it("menulis ulang tautan sosial, bukan menumpuknya", async () => {
    const { body } = await create();

    const ubah = await api(`/api/crew/${body.member.id}`, {
      method: "PUT",
      body: JSON.stringify(
        crewBody({ social: [{ platform: "github", url: "https://github.com/b" }] }),
      ),
    });
    const hasil = await json<MemberRes>(ubah);

    expect(hasil.member.social).toEqual([
      { platform: "github", url: "https://github.com/b" },
    ]);

    const rows = await db
      .select()
      .from(crewSocials)
      .where(eq(crewSocials.memberId, body.member.id));
    expect(rows).toHaveLength(1);
  });

  /* Postgres tidak menyentuh `default now()` saat UPDATE. Kalau `updatedAt`
     tidak diisi manual di repo, badge "belum terpublish" tidak pernah menyala dan
     editor mengira perubahannya sudah tayang. */
  it("menaikkan updatedAt supaya badge belum-tayang menyala", async () => {
    const { body } = await create();
    const sebelum = body.member.updatedAt;

    await new Promise((r) => setTimeout(r, 5));
    const ubah = await api(`/api/crew/${body.member.id}`, {
      method: "PUT",
      body: JSON.stringify(crewBody({ role: "Lead Developer" })),
    });
    const hasil = await json<MemberRes>(ubah);

    expect(hasil.member.updatedAt > sebelum).toBe(true);
    expect(hasil.member.unpublished).toBe(true);
  });

  it("membiarkan nama sendiri lewat saat menyunting", async () => {
    const { body } = await create();
    const res = await api(`/api/crew/${body.member.id}`, {
      method: "PUT",
      body: JSON.stringify(crewBody({ role: "Lead Developer" })),
    });
    expect(res.status).toBe(200);
  });

  it("404 untuk id yang tidak ada", async () => {
    const res = await api("/api/crew/00000000-0000-0000-0000-000000000000", {
      method: "PUT",
      body: JSON.stringify(crewBody()),
    });
    expect(res.status).toBe(404);
  });
});

/* ────────────────────────── menghapus ─────────────────────── */

describe("DELETE /api/crew/:id", () => {
  it("menghilangkan dari daftar tapi TIDAK dari database", async () => {
    const { body } = await create();

    const res = await api(`/api/crew/${body.member.id}`, { method: "DELETE" });
    expect(res.status).toBe(200);

    const daftar = await json<ListRes>(await api("/api/crew"));
    expect(daftar.crew).toHaveLength(0);

    const rows = await db
      .select()
      .from(crewMembers)
      .where(eq(crewMembers.id, body.member.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).not.toBeNull();
  });

  /* Isi lengkapnya disimpan di audit log justru supaya hapus yang keliru bisa
     disusun kembali tanpa membongkar backup. */
  it("menyimpan isi lengkapnya di audit log", async () => {
    const { body } = await create();
    await api(`/api/crew/${body.member.id}`, { method: "DELETE" });

    const rows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, body.member.id));

    const hapus = rows.find((r) => r.action === "delete");
    expect(hapus).toBeTruthy();
    expect((hapus?.snapshot as CrewRecord).name).toBe(
      "Bagas Nusantara Nabillah",
    );
  });

  it("404 untuk id yang tidak ada", async () => {
    const res = await api("/api/crew/00000000-0000-0000-0000-000000000000", {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
  });
});
