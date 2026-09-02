/**
 * API visi, melawan Postgres sungguhan.
 *
 * Yang diuji di sini bukan pemeriksa isian — itu sudah punya testnya sendiri
 * di `shared/validateVision.test.ts` dan tidak butuh database. Yang diuji
 * adalah hal-hal yang cuma muncul saat ada database di belakangnya, dan di
 * entitas satu-baris ini semuanya berbeda dari tetangganya:
 *
 * - `GET` pada database kosong membalas `null`, BUKAN 404;
 * - `PUT` pertama MEMBUAT barisnya, `PUT` kedua mengubah baris yang sama —
 *   tidak pernah bertambah jadi dua;
 * - route yang sengaja tidak ada (`POST`, `DELETE`, `/urutkan`) memang tidak
 *   ada, supaya seksinya tidak bisa dihapus lewat jalur mana pun.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "../app";
import type { VisionRecord } from "../visionRepo";
import { db, sql } from "../db/client";
import { auditLog, vision } from "../db/schema";
import { asEditor, loginAsEditor, resetDb, visionBody, type Login } from "../test/helpers";

const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;
type VisionRes = { vision: VisionRecord | null };
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

const simpan = async (over: Record<string, unknown> = {}) => {
  const res = await api("/api/vision", {
    method: "PUT",
    body: JSON.stringify(visionBody(over)),
  });
  return { res, body: await json<VisionRes & ErrRes>(res) };
};

describe("gerbang login", () => {
  it("tanpa sesi, endpoint visi tertutup — baca maupun tulis", async () => {
    const anon = (path: string, init: RequestInit = {}) =>
      app.request(path, {
        ...init,
        headers: { "content-type": "application/json" },
      });

    expect((await anon("/api/vision")).status).toBe(401);
    expect(
      (
        await anon("/api/vision", {
          method: "PUT",
          body: JSON.stringify(visionBody()),
        })
      ).status,
    ).toBe(401);
  });
});

describe("GET /api/vision", () => {
  /**
   * Ini yang membedakan visi dari entitas lain, dan kenapa ia diuji lebih
   * dulu: panel membuka layar visi untuk MENGISINYA pertama kali, jadi
   * database kosong adalah keadaan normal — bukan alamat yang salah. 404 akan
   * membuat panel menampilkan "tidak ditemukan" persis di layar yang ingin
   * dibuka editor.
   */
  it("membalas null, bukan 404, saat barisnya belum ada", async () => {
    const res = await api("/api/vision");
    expect(res.status).toBe(200);
    expect((await json<VisionRes>(res)).vision).toBeNull();
  });
});

describe("PUT /api/vision", () => {
  it("PUT pertama membuat barisnya", async () => {
    const { res, body } = await simpan();
    expect(res.status).toBe(200);
    expect(body.vision?.statement).toContain("trusted technology partner");
    expect(body.vision?.photo).toBe("/home/P1330392_velocity.webp");

    const dibaca = await json<VisionRes>(await api("/api/vision"));
    expect(dibaca.vision?.statement).toBe(body.vision?.statement);
  });

  /**
   * Inti dari seluruh berkas ini.
   *
   * Kalau upsert-nya keliru jadi insert biasa, PUT kedua akan menabrak primary
   * key ATAU — kalau id-nya acak — menambah baris kedua diam-diam. Yang kedua
   * itu yang berbahaya: `getVision()` lalu memilih salah satunya tanpa aturan,
   * dan kalimat di halaman depan berganti-ganti antar publish tanpa satu pun
   * galat yang bisa dilacak.
   */
  it("PUT berulang mengubah baris yang sama, tidak pernah menambah", async () => {
    await simpan();
    await simpan({ statement: "Kalimat kedua." });
    await simpan({ statement: "Kalimat ketiga." });

    const rows = await db.select().from(vision);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(1);
    expect(rows[0].statement).toBe("Kalimat ketiga.");
  });

  it("menolak isian kosong dengan 422 dan tidak menyentuh baris yang ada", async () => {
    await simpan({ statement: "Kalimat yang sah." });

    const { res, body } = await simpan({ statement: "   " });
    expect(res.status).toBe(422);
    expect(body.errors.statement).toBeTruthy();

    const rows = await db.select().from(vision);
    expect(rows[0].statement).toBe("Kalimat yang sah.");
  });

  it("foto wajib — kalimat tanpa foto ditolak", async () => {
    const { res, body } = await simpan({ photo: "" });
    expect(res.status).toBe(422);
    expect(body.errors.photo).toBeTruthy();
  });

  /* Badge "belum tayang" hidup dari `updatedAt > publishedAt`. Lupa menaikkan
     `updatedAt` di repo = badge tidak pernah menyala, dan editor menyimpan lalu
     pulang tanpa menekan Publish. */
  it("menaikkan updatedAt sehingga tandanya belum tayang", async () => {
    const { body } = await simpan();
    expect(body.vision?.unpublished).toBe(true);
    expect(body.vision?.publishedAt).toBeNull();
  });

  it("mencatat perubahan ke audit log", async () => {
    await simpan();
    const rows = await db.select().from(auditLog);
    const baris = rows.filter((r) => r.entity === "vision");
    expect(baris).toHaveLength(1);
    expect(baris[0].action).toBe("update");
    expect(baris[0].userId).toBe(login.userId);
  });
});

/**
 * Route yang SENGAJA tidak ada.
 *
 * Ditulis sebagai test, bukan cuma komentar, karena inilah yang menjaga janji
 * bentuknya: seksi Visi tidak boleh bisa dihapus atau digandakan. Kalau suatu
 * hari ada yang menambahkan `POST /` atau `DELETE /:id` ke `routes/vision.ts`
 * dengan menyalin route lain, test ini yang berteriak lebih dulu.
 */
describe("bentuknya satu baris", () => {
  it("tidak ada POST, DELETE, maupun /urutkan", async () => {
    const post = await api("/api/vision", {
      method: "POST",
      body: JSON.stringify(visionBody()),
    });
    expect(post.status).toBe(404);

    const urutkan = await api("/api/vision/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [] }),
    });
    expect(urutkan.status).toBe(404);

    const hapus = await api("/api/vision/1", { method: "DELETE" });
    expect(hapus.status).toBe(404);
  });
});
