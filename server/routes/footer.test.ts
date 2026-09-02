/**
 * API kaki halaman, melawan Postgres sungguhan.
 *
 * Bentuknya menyalin `vision.test.ts` — entitas satu baris, jadi yang diuji
 * sama: `GET` kosong membalas `null` bukan 404, `PUT` pertama membuat dan
 * `PUT` berikutnya mengubah baris yang sama, dan route yang sengaja tidak ada
 * memang tidak ada.
 *
 * Yang TIDAK ada di visi dan diuji di sini: tabel anak `footer_socials`.
 * Ditulis ulang-hapus-lalu-sisip setiap simpan, jadi yang perlu dijaga tiga
 * hal — urutannya bertahan persis seperti dikirim, baris lama benar-benar
 * hilang (bukan menumpuk), dan daftar kosong sungguh menghapus semuanya
 * alih-alih diam-diam dianggap "tidak ada perubahan".
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "../app";
import type { FooterRecord } from "../footerRepo";
import { db, sql } from "../db/client";
import { auditLog, footer, footerSocials } from "../db/schema";
import { asEditor, footerBody, loginAsEditor, resetDb, type Login } from "../test/helpers";

const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;
type FooterRes = { footer: FooterRecord | null };
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
  const res = await api("/api/footer", {
    method: "PUT",
    body: JSON.stringify(footerBody(over)),
  });
  return { res, body: await json<FooterRes & ErrRes>(res) };
};

describe("gerbang login", () => {
  it("tanpa sesi, endpoint kaki halaman tertutup — baca maupun tulis", async () => {
    const anon = (path: string, init: RequestInit = {}) =>
      app.request(path, {
        ...init,
        headers: { "content-type": "application/json" },
      });

    expect((await anon("/api/footer")).status).toBe(401);
    expect(
      (
        await anon("/api/footer", {
          method: "PUT",
          body: JSON.stringify(footerBody()),
        })
      ).status,
    ).toBe(401);
  });
});

describe("GET /api/footer", () => {
  /* Alasannya sama seperti visi: panel membuka layar ini untuk MENGISINYA
     pertama kali, jadi database kosong adalah keadaan normal. 404 akan membuat
     panel bilang "tidak ditemukan" persis di layar yang ingin dibuka editor. */
  it("membalas null, bukan 404, saat barisnya belum ada", async () => {
    const res = await api("/api/footer");
    expect(res.status).toBe(200);
    expect((await json<FooterRes>(res)).footer).toBeNull();
  });
});

describe("PUT /api/footer", () => {
  it("PUT pertama membuat barisnya beserta tautannya", async () => {
    const { res, body } = await simpan();
    expect(res.status).toBe(200);
    expect(body.footer?.email).toBe("hello@cogniti.id");
    expect(body.footer?.socials.map((s) => s.label)).toEqual([
      "Instagram",
      "LinkedIn",
    ]);

    const dibaca = await json<FooterRes>(await api("/api/footer"));
    expect(dibaca.footer?.socials).toEqual(body.footer?.socials);
  });

  it("PUT berulang mengubah baris yang sama, tidak pernah menambah", async () => {
    await simpan();
    await simpan({ email: "halo@cogniti.id" });
    await simpan({ email: "hi@cogniti.id" });

    const rows = await db.select().from(footer);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(1);
    expect(rows[0].email).toBe("hi@cogniti.id");
  });

  /**
   * Urutan tautan BUKAN detail: ia urutan tampil dari kiri ke kanan di kaki
   * halaman, dan satu-satunya yang menjaganya kolom `position`. Kalau
   * penyisipannya kehilangan indeks — misalnya berubah jadi insert paralel —
   * urutannya jadi urutan balasan database, yang tidak dijanjikan siapa pun.
   */
  it("urutan tautan bertahan persis seperti dikirim", async () => {
    const { body } = await simpan({
      socials: [
        { label: "Facebook", href: "https://facebook.com/cogniti" },
        { label: "Instagram", href: "https://instagram.com/cogniti.id" },
        { label: "LinkedIn", href: "https://linkedin.com/company/cogniti" },
      ],
    });
    expect(body.footer?.socials.map((s) => s.label)).toEqual([
      "Facebook",
      "Instagram",
      "LinkedIn",
    ]);

    const rows = await db.select().from(footerSocials);
    expect(rows).toHaveLength(3);
    expect([...rows].sort((a, b) => a.position - b.position).map((r) => r.label)).toEqual([
      "Facebook",
      "Instagram",
      "LinkedIn",
    ]);
  });

  /* Tulis ulang = hapus lalu sisip. Kalau hapusnya terlewat, tautan lama
     menumpuk di bawah yang baru dan kaki halaman perlahan penuh duplikat —
     tanpa satu pun galat. */
  it("menulis ulang daftar, bukan menumpuk di atas yang lama", async () => {
    await simpan();
    const { body } = await simpan({
      socials: [{ label: "Instagram", href: "https://instagram.com/cogniti.id" }],
    });

    expect(body.footer?.socials).toHaveLength(1);
    expect(await db.select().from(footerSocials)).toHaveLength(1);
  });

  /* Menghapus SEMUA tautan harus benar-benar bisa. Ini yang gagal kalau daftar
     kosong diperlakukan sebagai "tidak ada yang dikirim" dan dilewati. */
  it("daftar kosong menghapus semua tautan", async () => {
    await simpan();
    const { res, body } = await simpan({ socials: [] });

    expect(res.status).toBe(200);
    expect(body.footer?.socials).toEqual([]);
    expect(await db.select().from(footerSocials)).toHaveLength(0);
  });

  it("menolak isian kosong dengan 422 dan tidak menyentuh baris yang ada", async () => {
    await simpan({ email: "halo@cogniti.id" });

    const { res, body } = await simpan({ email: "   " });
    expect(res.status).toBe(422);
    expect(body.errors.email).toBeTruthy();

    const rows = await db.select().from(footer);
    expect(rows[0].email).toBe("halo@cogniti.id");
  });

  it("menolak tautan tanpa https:// — dan tautan lama tetap utuh", async () => {
    await simpan();

    const { res, body } = await simpan({
      socials: [{ label: "Instagram", href: "instagram.com/cogniti.id" }],
    });
    expect(res.status).toBe(422);
    expect(body.errors.socials).toBeTruthy();
    expect(await db.select().from(footerSocials)).toHaveLength(2);
  });

  /* Badge "belum tayang" hidup dari `updatedAt > publishedAt`. Postgres tidak
     menyentuh `default now()` saat UPDATE, jadi lupa menaikkannya sendiri di
     repo = badge tidak pernah menyala. */
  it("menaikkan updatedAt sehingga tandanya belum tayang", async () => {
    const { body } = await simpan();
    expect(body.footer?.unpublished).toBe(true);
    expect(body.footer?.publishedAt).toBeNull();
  });

  it("mencatat perubahan ke audit log", async () => {
    await simpan();
    const rows = await db.select().from(auditLog);
    const baris = rows.filter((r) => r.entity === "footer");
    expect(baris).toHaveLength(1);
    expect(baris[0].action).toBe("update");
    expect(baris[0].userId).toBe(login.userId);
  });
});

/**
 * Route yang SENGAJA tidak ada — alasan sama seperti visi: kaki halaman ikut
 * setiap halaman situs, jadi ia tidak boleh bisa dihapus atau digandakan lewat
 * jalur mana pun.
 */
describe("bentuknya satu baris", () => {
  it("tidak ada POST, DELETE, maupun /urutkan", async () => {
    const post = await api("/api/footer", {
      method: "POST",
      body: JSON.stringify(footerBody()),
    });
    expect(post.status).toBe(404);

    const urutkan = await api("/api/footer/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [] }),
    });
    expect(urutkan.status).toBe(404);

    const hapus = await api("/api/footer/1", { method: "DELETE" });
    expect(hapus.status).toBe(404);
  });
});
