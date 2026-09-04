/**
 * API Judul seksi, melawan Postgres sungguhan.
 *
 * Aturan isiannya sudah punya testnya sendiri di
 * `shared/validateSectionText.test.ts` dan tidak butuh database. Yang diuji di
 * sini cuma yang muncul kalau ada database di belakangnya, dan bentuk ketiga
 * ini punya beberapa yang khas:
 *
 * - `GET` pada database kosong membalas daftar kosong, BUKAN 404;
 * - urutan balasannya urutan SEKSI DI SITUS, bukan abjad kunci;
 * - kunci di luar sebelas itu 404 (salah alamat), bukan 422 (salah isi);
 * - riwayatnya dicatat dengan uuid baris, karena `audit_log.entity_id` uuid —
 *   itulah alasan tabel ini punya `id` sendiri padahal `key` sudah unik;
 * - route yang sengaja tidak ada (`POST`, `DELETE`, `/urutkan`) memang tidak
 *   ada, supaya seksinya tidak bisa dihapus atau digandakan lewat jalur mana pun.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { SECTION_TEXT_KEYS } from "@shared/sectionText";
import { app } from "../app";
import type { SectionTextRecord } from "../sectionTextRepo";
import { db, sql } from "../db/client";
import { auditLog, sectionTexts } from "../db/schema";
import {
  asEditor,
  loginAsEditor,
  resetDb,
  sectionTextBody,
  type Login,
} from "../test/helpers";

const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;
type DaftarRes = { sectionTexts: SectionTextRecord[] };
type SatuRes = { sectionText: SectionTextRecord };
type ErrRes = { errors: Record<string, string>; pesan?: string };

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

const simpan = async (key: string, over: Record<string, unknown> = {}) => {
  const res = await api(`/api/section-text/${key}`, {
    method: "PUT",
    body: JSON.stringify(sectionTextBody(over)),
  });
  return { res, body: await json<SatuRes & ErrRes>(res) };
};

describe("gerbang login", () => {
  it("tanpa sesi, endpoint judul seksi tertutup — baca maupun tulis", async () => {
    const anon = (path: string, init: RequestInit = {}) =>
      app.request(path, {
        ...init,
        headers: { "content-type": "application/json" },
      });

    expect((await anon("/api/section-text")).status).toBe(401);
    expect(
      (
        await anon("/api/section-text/csi-hero", {
          method: "PUT",
          body: JSON.stringify(sectionTextBody()),
        })
      ).status,
    ).toBe(401);
  });
});

describe("GET /api/section-text", () => {
  /* Database kosong adalah keadaan yang bisa terjadi (seed belum jalan di
     mesin baru). Situs tetap punya judulnya lewat cadangan bundle, jadi ini
     bukan galat — dan 404 di sini akan membuat SELURUH `muat()` panel
     dianggap gagal, bukan cuma layar judul seksi. */
  it("membalas daftar kosong, bukan 404, saat tabelnya masih kosong", async () => {
    const res = await api("/api/section-text");
    expect(res.status).toBe(200);
    expect((await json<DaftarRes>(res)).sectionTexts).toEqual([]);
  });

  /**
   * Urutannya urutan seksi di situs, bukan `order by key`.
   *
   * Kalau ini jatuh ke abjad, kolom "#" di panel akan menjanjikan urutan
   * gulir yang sebenarnya bukan itu — "careers" duluan, "csi-hero" di tengah.
   */
  it("urut seperti pengunjung menemuinya, bukan urut abjad kunci", async () => {
    await simpan("the-crew");
    await simpan("csi-hero");
    await simpan("careers");

    const { sectionTexts: rows } = await json<DaftarRes>(await api("/api/section-text"));
    const urutanKontrak = SECTION_TEXT_KEYS.filter((k) =>
      rows.some((r) => r.key === k),
    );

    expect(rows.map((r) => r.key)).toEqual(urutanKontrak);
    expect(rows.map((r) => r.key)).not.toEqual([...rows.map((r) => r.key)].sort());
  });
});

describe("PUT /api/section-text/:key", () => {
  it("PUT pertama membuat barisnya", async () => {
    const { res, body } = await simpan("csi-hero");
    expect(res.status).toBe(200);
    expect(body.sectionText.key).toBe("csi-hero");
    expect(body.sectionText.heading).toBe("Judul Baru");

    const { sectionTexts: rows } = await json<DaftarRes>(await api("/api/section-text"));
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(body.sectionText.id);
  });

  /**
   * Inti berkas ini, sama seperti di visi: kalau upsert-nya keliru jadi insert
   * biasa, PUT kedua menabrak unique `key` — atau, lebih buruk, menambah baris
   * kedua yang membuat judul seksi berganti-ganti antar publish tanpa satu pun
   * galat yang bisa dilacak.
   */
  it("PUT berulang mengubah baris yang sama, tidak pernah menambah", async () => {
    const { body: pertama } = await simpan("csi-hero");
    await simpan("csi-hero", { heading: "Judul Kedua" });
    const { body: ketiga } = await simpan("csi-hero", { heading: "Judul Ketiga" });

    const rows = await db.select().from(sectionTexts);
    expect(rows).toHaveLength(1);
    expect(rows[0].heading).toBe("Judul Ketiga");
    /* Uuid-nya TETAP: kalau berubah, tautan riwayat ke baris ini jadi buntu. */
    expect(ketiga.sectionText.id).toBe(pertama.sectionText.id);
  });

  it("baris baru dalam judul tersimpan apa adanya, bukan disambung jadi satu baris", async () => {
    const { body } = await simpan("csi-hero", {
      heading: "Think beyond software.\nBuild intelligence.",
    });

    expect(body.sectionText.heading).toBe(
      "Think beyond software.\nBuild intelligence.",
    );
  });

  /* 404, bukan 422: yang salah alamatnya, bukan isinya. Kunci di luar daftar
     berarti panel menunjuk seksi yang tidak ada di situs ini. */
  it("kunci yang tidak dikenal 404, dan tidak membuat baris apa pun", async () => {
    const { res } = await simpan("seksi-karangan");
    expect(res.status).toBe(404);
    expect(await db.select().from(sectionTexts)).toHaveLength(0);
  });

  it("menolak judul kosong dengan 422 dan tidak menyentuh baris yang ada", async () => {
    await simpan("csi-hero", { heading: "Judul Sah" });

    const { res, body } = await simpan("csi-hero", { heading: "   " });
    expect(res.status).toBe(422);
    expect(body.errors.heading).toBeTruthy();

    const rows = await db.select().from(sectionTexts);
    expect(rows[0].heading).toBe("Judul Sah");
  });

  /* Penolakan bersuara. Panel tidak merender isian ini untuk seksi tanpa sub,
     jadi jalur ini cuma tersentuh permintaan yang dikarang — dan menerimanya
     berarti menyimpan teks yang tak pernah tampil di situs. */
  it("menolak subteks di seksi yang tidak menampilkannya", async () => {
    const { res, body } = await simpan("deployments", { subheading: "Tidak akan tampil." });
    expect(res.status).toBe(422);
    expect(body.errors.subheading).toBeTruthy();
  });

  /* Badge "belum terpublish" hidup dari `updatedAt > publishedAt`. Lupa
     menaikkan `updatedAt` di repo = badge tidak pernah menyala, dan editor
     menyimpan lalu pulang tanpa menekan Publish. */
  it("menaikkan updatedAt sehingga tandanya belum terpublish", async () => {
    const { body } = await simpan("csi-hero");
    expect(body.sectionText.unpublished).toBe(true);
    expect(body.sectionText.publishedAt).toBeNull();
  });

  /**
   * Entitas riwayatnya ikut HALAMAN seksinya, bukan satu nama bersama.
   *
   * Empat nama, karena `RUTE_ENTITAS` memetakan satu nama entitas ke satu rute
   * panel: satu nama bersama akan membuat baris riwayat judul The Crew
   * mendarat di layar Judul seksi halaman Home.
   */
  it("mencatat ke audit log dengan entitas per halaman dan uuid barisnya", async () => {
    const { body: home } = await simpan("csi-hero");
    const { body: people } = await simpan("the-crew");

    const rows = await db.select().from(auditLog);
    const baris = rows.filter((r) => r.entity.startsWith("section_text_"));
    expect(baris).toHaveLength(2);

    const perEntitas = new Map(baris.map((r) => [r.entity, r]));
    expect(perEntitas.get("section_text_home")?.entityId).toBe(home.sectionText.id);
    expect(perEntitas.get("section_text_people")?.entityId).toBe(people.sectionText.id);
    expect(perEntitas.get("section_text_home")?.action).toBe("update");
    expect(perEntitas.get("section_text_home")?.userId).toBe(login.userId);
  });
});

/**
 * Route yang SENGAJA tidak ada.
 *
 * Ditulis sebagai test, bukan cuma komentar, karena inilah yang menjaga janji
 * bentuknya: sebelas seksi, tidak bertambah dan tidak berkurang. Kalau suatu
 * hari ada yang menyalin route entitas lain ke sini, ini yang berteriak duluan.
 */
describe("bentuknya sebelas baris tetap", () => {
  it("tidak ada POST, DELETE, maupun /urutkan", async () => {
    const post = await api("/api/section-text", {
      method: "POST",
      body: JSON.stringify(sectionTextBody()),
    });
    expect(post.status).toBe(404);

    const urutkan = await api("/api/section-text/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [] }),
    });
    expect(urutkan.status).toBe(404);

    const { body } = await simpan("csi-hero");
    const hapus = await api(`/api/section-text/${body.sectionText.id}`, {
      method: "DELETE",
    });
    expect(hapus.status).toBe(404);
  });
});
