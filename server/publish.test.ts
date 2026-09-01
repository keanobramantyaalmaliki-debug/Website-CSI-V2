/**
 * Publish — dari database ke berkas yang benar-benar dibaca pengunjung.
 *
 * Seluruh berkas ini memakai impor dinamis, dan itu disengaja: `CONTENT_PATH`
 * dihitung dari `process.cwd()` SAAT modulnya dimuat. Impor statis akan
 * dievaluasi sebelum baris `chdir` di bawah sempat jalan, dan test ini akan
 * menimpa `dist/content.json` sungguhan — berkas yang sedang disajikan ke
 * pengunjung.
 */

import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

const cwdAsal = process.cwd();
/* `realpath`: di macOS `tmpdir()` itu /var/... yang sebenarnya symlink ke
   /private/var/..., dan `path.resolve` di publish.ts mengembalikan bentuk
   panjangnya. Tanpa ini pemeriksaan di bawah menuduh bocor padahal aman. */
const kotakPasir = await realpath(
  await mkdtemp(path.join(tmpdir(), "cogniti-publish-")),
);
process.chdir(kotakPasir);

const { publish, pendingCount, CONTENT_PATH } = await import("./publish");
const { sql } = await import("./db/client");
const { asEditor, jobBody, loginAsEditor, resetDb } = await import(
  "./test/helpers"
);

/* Pastikan chdir-nya benar-benar kena sebelum ada satu pun berkas ditulis. */
if (!CONTENT_PATH.startsWith(kotakPasir)) {
  throw new Error(`CONTENT_PATH bocor ke luar kotak pasir: ${CONTENT_PATH}`);
}

/** `res.json()` mengembalikan `unknown`; bentuknya diberikan di titik pakai. */
const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;

type Api = ReturnType<typeof asEditor>;
let api: Api;
let aktor: { id: string; name: string };

beforeEach(async () => {
  await resetDb();
  const login = await loginAsEditor();
  api = asEditor(login);
  aktor = { id: login.userId, name: "Editor Test" };
});

afterAll(async () => {
  process.chdir(cwdAsal);
  await rm(kotakPasir, { recursive: true, force: true });
  await sql.end();
});

const buat = async (over: Record<string, unknown> = {}) => {
  const res = await api("/api/jobs", {
    method: "POST",
    body: JSON.stringify(jobBody(over)),
  });
  return (await json<{ job: { id: string; slug: string } }>(res)).job;
};

const bacaContent = async () =>
  JSON.parse(await readFile(CONTENT_PATH, "utf8"));

describe("isi content.json", () => {
  it("hanya yang tayang — draft tidak pernah ikut", async () => {
    await buat({ title: "Data Engineer", state: "open" });
    await buat({ title: "Product Builder", state: "closed" });
    await buat({ title: "Masih Digodok", state: "draft" });

    const hasil = await publish(aktor);
    expect(hasil.jobs).toBe(2);

    const isi = await bacaContent();
    expect(isi.version).toBe(1);
    expect(isi.jobs.map((j: { title: string }) => j.title).sort()).toEqual([
      "Data Engineer",
      "Product Builder",
    ]);
  });

  it("tidak membocorkan kolom yang cuma urusan admin", async () => {
    await buat();
    await publish(aktor);

    const [job] = (await bacaContent()).jobs;
    expect(job).not.toHaveProperty("updatedAt");
    expect(job).not.toHaveProperty("publishedAt");
    expect(job).not.toHaveProperty("unpublished");
    /* Yang dipakai situs tetap utuh. */
    expect(Object.keys(job).sort()).toEqual([
      "askGithub",
      "department",
      "detail",
      "id",
      "overview",
      "photo",
      "skills",
      "slug",
      "sortOrder",
      "state",
      "title",
    ]);
  });

  it("lowongan yang dihapus lenyap di publish berikutnya", async () => {
    const job = await buat();
    await publish(aktor);
    expect((await bacaContent()).jobs).toHaveLength(1);

    await api(`/api/jobs/${job.id}`, { method: "DELETE" });
    await publish(aktor);
    expect((await bacaContent()).jobs).toHaveLength(0);
  });

  it("tidak meninggalkan berkas sementara", async () => {
    await buat();
    await publish(aktor);

    const { readdir } = await import("node:fs/promises");
    const berkas = await readdir(path.dirname(CONTENT_PATH));
    expect(berkas.filter((f) => f.includes(".tmp-"))).toEqual([]);
  });
});

describe("badge perubahan belum tayang", () => {
  it("nol sesudah publish", async () => {
    await buat();
    expect(await pendingCount()).toBe(1);
    await publish(aktor);
    expect(await pendingCount()).toBe(0);
  });

  it("naik lagi begitu ada yang diubah", async () => {
    const job = await buat();
    await publish(aktor);

    await api(`/api/jobs/${job.id}`, {
      method: "PUT",
      body: JSON.stringify(jobBody({ overview: "Ringkasan baru." })),
    });
    expect(await pendingCount()).toBe(1);
  });

  it("menghitung yang dihapus tapi masih tayang", async () => {
    const job = await buat();
    await publish(aktor);

    await api(`/api/jobs/${job.id}`, { method: "DELETE" });
    /* Barisnya masih terlihat pengunjung sampai Publish ditekan lagi — kalau
       badge-nya nol di sini, editor menyimpulkan tidak perlu menekan apa-apa
       dan lowongan yang sudah ditutup terus menerima lamaran. */
    expect(await pendingCount()).toBe(1);
  });

  it("berhenti menghitung yang dihapus sesudah penghapusannya tayang", async () => {
    const job = await buat();
    await publish(aktor);
    await api(`/api/jobs/${job.id}`, { method: "DELETE" });
    await publish(aktor);

    /* Baris terhapus dulu tidak pernah ikut ditandai `publishedAt`, jadi ia
       tetap dihitung selamanya: setiap lowongan yang pernah dihapus menambah
       satu ke badge, permanen, dan angkanya cuma bisa naik. Editor melihat
       "10 perubahan belum tayang" tanpa pernah menyentuh apa pun — dan begitu
       angka itu berbohong sekali, ia tidak berguna lagi untuk seterusnya. */
    expect(await pendingCount()).toBe(0);
  });

  it("angkanya tetap nol sesudah publish beruntun tanpa suntingan", async () => {
    await buat();
    await publish(aktor);
    await publish(aktor);
    expect(await pendingCount()).toBe(0);
  });

  it("draft yang belum pernah tayang tidak dihitung dua kali", async () => {
    await buat({ state: "open" });
    await publish(aktor);
    expect(await pendingCount()).toBe(0);

    await buat({ title: "Masih Digodok", state: "draft" });
    /* Draft baru memang menghitung 1: dia belum pernah tayang. Yang penting
       angkanya tidak ikut naik untuk lowongan lain yang tidak disentuh. */
    expect(await pendingCount()).toBe(1);
  });
});

describe("endpoint publish", () => {
  it("POST /api/publish menayangkan dan melaporkan jumlahnya", async () => {
    await buat();
    const res = await api("/api/publish", { method: "POST" });
    const body = await json<{ jobs: number; generatedAt: string }>(res);

    expect(res.status).toBe(200);
    expect(body.jobs).toBe(1);
    expect(body.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect((await bacaContent()).jobs).toHaveLength(1);
  });

  it("GET /api/publish/status memberi angka badge", async () => {
    await buat();
    const body = await json<{ pending: number }>(
      await api("/api/publish/status"),
    );
    expect(body.pending).toBe(1);
  });
});
