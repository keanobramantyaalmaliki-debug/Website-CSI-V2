/**
 * Batal perubahan per konten, melawan Postgres sungguhan.
 *
 * Berkas ini ada karena pembatalan harus mematikan DUA penghitung yang
 * bekerja dengan cara berbeda, dan tidak ada satu pun tempat di kode yang
 * memaksanya konsisten:
 *
 *   angka di bilah Publish  membaca cap waktu BARIS  (`updated_at > published_at`)
 *   daftar layar Review     membaca baris AUDIT_LOG  (sesudah publish terakhir)
 *
 * Kalau cuma satu yang beres, editor melihat bilah bilang "0 menunggu"
 * sementara Review masih memajang barisnya, atau sebaliknya. Keduanya diperiksa
 * di tiap cabang di bawah.
 *
 * Yang kedua: `lag(snapshot)` dihitung atas SELURUH tabel tanpa penyaringan,
 * jadi snapshot baris `revert` akan jadi "isi sebelum" bagi suntingan
 * berikutnya. Test "suntingan berikutnya tetap berantai benar" yang menjaga
 * itu, dan ia satu-satunya alasan snapshot `revert` berisi isi hasil pemulihan
 * alih-alih blob metadata.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "../app";
import { sql } from "../db/client";
import { pendingCount } from "../publish";
import type { PeristiwaRiwayat, PeristiwaTertahan } from "@shared/riwayat";
import {
  asEditor,
  loginAsEditor,
  resetDb,
  sectionTextBody,
  valueBody,
  visionBody,
  type Login,
} from "../test/helpers";

const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;
type TertahanRes = { tertahan: PeristiwaTertahan[]; terpotong: boolean };
type RiwayatRes = { riwayat: PeristiwaRiwayat[] };
type ValueRes = { value: { id: string; title: string } };
type ValuesRes = { values: { id: string; title: string }[] };

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

/* Menandai "sudah di-Publish" lewat baris auditnya saja, sama seperti
   `history.test.ts`: publish sungguhan ikut menulis `dist/content.json`, dan
   test pembatalan tidak punya urusan menyentuh berkas yang disajikan ke
   pengunjung. Cap waktu barisnya diurus `sudahTayang()` di bawah. */
const terbitkan = () => sql`
  insert into audit_log (entity, action, user_name)
  values ('content', 'publish', 'Editor Test')
`;

/**
 * Menyetel cap `published_at` seluruh baris nilai, meniru apa yang dilakukan
 * `publish.ts` sesudah `content.json` ditulis. Diperlukan terpisah dari
 * `terbitkan()` karena angka bilah membaca cap baris, bukan audit.
 */
const sudahTayang = () => sql`
  update people_values set published_at = now(), updated_at = now()
`;

/** Publish palsu yang lengkap: gerbang riwayat DAN cap baris. */
const publishPalsu = async () => {
  await terbitkan();
  await sudahTayang();
};

const buatNilai = async (over: Record<string, unknown> = {}) => {
  const res = await api("/api/values", {
    method: "POST",
    body: JSON.stringify(valueBody(over)),
  });
  return (await json<ValueRes>(res)).value;
};

const ubahNilai = (id: string, over: Record<string, unknown>) =>
  api(`/api/values/${id}`, {
    method: "PUT",
    body: JSON.stringify(valueBody(over)),
  });

const ambilTertahan = async () =>
  json<TertahanRes>(await api("/api/riwayat/tertahan"));

const daftarNilai = async () =>
  (await json<ValuesRes>(await api("/api/values"))).values;

const batalkan = (entitas: string, entitasId: string | null) =>
  api("/api/batal", {
    method: "POST",
    body: JSON.stringify({ entitas, entitasId }),
  });

const isi = (n: unknown) => n as Record<string, unknown> | null;

describe("gerbang login", () => {
  it("tanpa sesi, pembatalan tertutup", async () => {
    const res = await app.request("/api/batal", {
      method: "POST",
      body: JSON.stringify({ entitas: "value", entitasId: null }),
    });
    expect(res.status).toBe(401);
  });
});

describe("tiga cabang pembatalan", () => {
  it("yang baru dibuat dan belum pernah tayang, dibuang", async () => {
    const nilai = await buatNilai({ title: "Salah ketik" });
    expect(await pendingCount()).toBeGreaterThan(0);

    const res = await batalkan("value", nilai.id);
    expect(res.status).toBe(200);

    const { tertahan } = await ambilTertahan();
    expect(tertahan).toHaveLength(0);
    expect(await pendingCount()).toBe(0);
    expect((await daftarNilai()).some((v) => v.id === nilai.id)).toBe(false);
  });

  it("suntingan dikembalikan ke isi yang sekarang tayang", async () => {
    const nilai = await buatNilai({ title: "Judul tayang" });
    await publishPalsu();
    await ubahNilai(nilai.id, { title: "Judul salah" });
    expect(await pendingCount()).toBe(1);

    expect((await batalkan("value", nilai.id)).status).toBe(200);

    const { tertahan } = await ambilTertahan();
    expect(tertahan).toHaveLength(0);
    expect(await pendingCount()).toBe(0);
    const kini = (await daftarNilai()).find((v) => v.id === nilai.id);
    expect(kini?.title).toBe("Judul tayang");
  });

  it("penghapusan dikembalikan, bendanya hidup lagi", async () => {
    const nilai = await buatNilai({ title: "Masih dipakai" });
    await publishPalsu();
    await api(`/api/values/${nilai.id}`, { method: "DELETE" });
    expect(await pendingCount()).toBe(1);

    expect((await batalkan("value", nilai.id)).status).toBe(200);

    const { tertahan } = await ambilTertahan();
    expect(tertahan).toHaveLength(0);
    expect(await pendingCount()).toBe(0);
    const kini = (await daftarNilai()).find((v) => v.id === nilai.id);
    expect(kini?.title).toBe("Masih dipakai");
  });

  it("singleton tanpa entitasId ikut bisa dibatalkan", async () => {
    await api("/api/vision", {
      method: "PUT",
      body: JSON.stringify(visionBody({ statement: "Yang tayang" })),
    });
    await terbitkan();
    await sql`update vision set published_at = now(), updated_at = now()`;
    await api("/api/vision", {
      method: "PUT",
      body: JSON.stringify(visionBody({ statement: "Yang salah" })),
    });

    expect((await batalkan("vision", null)).status).toBe(200);

    const { tertahan } = await ambilTertahan();
    expect(tertahan.some((t) => t.entitas === "vision")).toBe(false);
    const visi = isi(await json(await api("/api/vision")));
    expect(isi(visi?.vision)?.statement).toBe("Yang tayang");
  });
});

describe("hanya satu benda yang tersentuh", () => {
  it("perubahan lain tetap menunggu Publish", async () => {
    const a = await buatNilai({ title: "A tayang" });
    const b = await buatNilai({ title: "B tayang" });
    await publishPalsu();
    await ubahNilai(a.id, { title: "A salah" });
    await ubahNilai(b.id, { title: "B benar" });
    expect(await pendingCount()).toBe(2);

    await batalkan("value", a.id);

    const { tertahan } = await ambilTertahan();
    expect(tertahan).toHaveLength(1);
    expect(tertahan[0].entitasId).toBe(b.id);
    expect(await pendingCount()).toBe(1);
    const daftar = await daftarNilai();
    expect(daftar.find((v) => v.id === a.id)?.title).toBe("A tayang");
    expect(daftar.find((v) => v.id === b.id)?.title).toBe("B benar");
  });
});

describe("jejaknya tidak bocor ke Riwayat", () => {
  it("baris draf yang dibatalkan dan baris revert-nya sama-sama tak tampil", async () => {
    const nilai = await buatNilai({ title: "Judul tayang" });
    await publishPalsu();
    await ubahNilai(nilai.id, { title: "Judul salah" });
    await batalkan("value", nilai.id);
    await publishPalsu();

    const { riwayat } = await json<RiwayatRes>(await api("/api/riwayat"));
    const nilaiIni = riwayat.filter((p) => p.entitasId === nilai.id);
    expect(nilaiIni.map((p) => p.aksi)).toEqual(["create"]);
    expect(riwayat.some((p) => p.aksi === "revert")).toBe(false);
  });

  it("perubahan SESUDAH pembatalan tetap tampil", async () => {
    const nilai = await buatNilai({ title: "Judul tayang" });
    await publishPalsu();
    await ubahNilai(nilai.id, { title: "Judul salah" });
    await batalkan("value", nilai.id);
    await ubahNilai(nilai.id, { title: "Judul benar" });
    await publishPalsu();

    const { riwayat } = await json<RiwayatRes>(await api("/api/riwayat"));
    const terakhir = riwayat.find((p) => p.entitasId === nilai.id);
    expect(terakhir?.aksi).toBe("update");
    expect(isi(terakhir?.sesudah)?.title).toBe("Judul benar");
  });
});

/**
 * Inilah alasan snapshot baris `revert` berisi isi hasil pemulihan.
 *
 * `lag()` tidak tahu apa-apa soal saringan yang dipakai layar; ia melihat
 * seluruh tabel. Kalau baris `revert` menyimpan `{ dibatalkan: true }` atau
 * `null`, suntingan berikutnya akan memajang blob itu di kolom "Sebelum" dan
 * seluruh tabel perbandingan jadi omong kosong, tanpa satu pun galat.
 */
describe("rantai isi sebelum tidak putus", () => {
  it("suntingan sesudah pembatalan membandingkan diri dengan isi yang dipulihkan", async () => {
    const nilai = await buatNilai({ title: "Judul tayang" });
    await publishPalsu();
    await ubahNilai(nilai.id, { title: "Judul salah" });
    await batalkan("value", nilai.id);
    await ubahNilai(nilai.id, { title: "Judul baru" });

    const { tertahan } = await ambilTertahan();
    const t = tertahan.find((x) => x.entitasId === nilai.id);
    expect(isi(t?.sebelum)?.title).toBe("Judul tayang");
    expect(isi(t?.sesudah)?.title).toBe("Judul baru");
  });
});

describe("permintaan yang ditolak dengan pesan, bukan ditebak", () => {
  it("benda yang sudah tidak menunggu Publish, 404", async () => {
    const nilai = await buatNilai();
    await publishPalsu();

    const res = await batalkan("value", nilai.id);
    expect(res.status).toBe(404);
  });

  it("pembatalan yang sama dikirim dua kali, yang kedua ditolak", async () => {
    const nilai = await buatNilai({ title: "Judul tayang" });
    await publishPalsu();
    await ubahNilai(nilai.id, { title: "Judul salah" });

    expect((await batalkan("value", nilai.id)).status).toBe(200);
    expect((await batalkan("value", nilai.id)).status).toBe(404);
  });

  it("entitas tak dikenal, 400", async () => {
    const res = await batalkan("entitas_karangan", "abc");
    expect(res.status).toBe(400);
  });

  /* Panel menyembunyikan tombolnya lewat `barisUrutan`, jadi jawaban ini
     seharusnya tidak pernah terlihat editor. Diuji tetap: kalau suatu saat
     penyembunyiannya lepas, yang terjadi harus penolakan berpesan, bukan
     pemulihan yang menebak urutan dari daftar judul. */
  it("baris urutan ditolak dengan saran menyusun ulang, 400", async () => {
    const a = await buatNilai({ title: "A" });
    const b = await buatNilai({ title: "B" });
    await publishPalsu();
    await api("/api/values/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });

    const res = await batalkan("value", null);
    expect(res.status).toBe(400);
    const { error } = await json<{ error: string }>(res);
    expect(error).toMatch(/susun ulang/i);
  });

  it("permintaan tanpa entitas, 400", async () => {
    const res = await api("/api/batal", {
      method: "POST",
      body: JSON.stringify({ entitasId: "abc" }),
    });
    expect(res.status).toBe(400);
  });

  it("judul yang sudah dipakai benda lain, 409 dan tidak ada yang berubah", async () => {
    const a = await buatNilai({ title: "Judul asal" });
    await publishPalsu();
    await api(`/api/values/${a.id}`, { method: "DELETE" });
    /* Judul yang tadi dipegang A sekarang dipakai B. Menghidupkan A akan
       menabrak indeks unik, jadi pembatalannya harus berhenti dengan pesan,
       bukan melempar galat 500 dari Postgres. */
    await buatNilai({ title: "Judul asal" });

    const res = await batalkan("value", a.id);
    expect(res.status).toBe(409);
    expect((await daftarNilai()).some((v) => v.id === a.id)).toBe(false);
  });
});

/**
 * Bentuk ketiga: berkunci tetap.
 *
 * Judul seksi bukan "daftar" (tidak ada yang bisa dibuat atau dihapus, jadi
 * tidak ada cabang buang maupun bangunkan) dan bukan "tunggal" (barisnya ber-id,
 * dan satu entitas riwayat menaungi beberapa baris sekaligus). Karena itu ia
 * punya pemulihnya sendiri di `pemulih.ts`, dan karena itu pula ia diuji di
 * sini: satu-satunya cabang yang boleh terjadi adalah "tulis balik isi lama".
 */
describe("pembatalan judul seksi", () => {
  const simpanJudul = (key: string, over: Record<string, unknown> = {}) =>
    api(`/api/section-text/${key}`, {
      method: "PUT",
      body: JSON.stringify(sectionTextBody(over)),
    });

  const daftarJudul = async () =>
    (
      await json<{ sectionTexts: { id: string; key: string; heading: string }[] }>(
        await api("/api/section-text"),
      )
    ).sectionTexts;

  /** Publish palsu untuk tabel ini: gerbang riwayat DAN cap barisnya. */
  const publishJudul = async () => {
    await terbitkan();
    await sql`update section_texts set published_at = now(), updated_at = now()`;
  };

  it("mengembalikan judul ke isi yang tayang, tanpa menghapus barisnya", async () => {
    await simpanJudul("csi-hero", { heading: "Judul tayang" });
    await publishJudul();
    await simpanJudul("csi-hero", { heading: "Judul salah" });

    const sebelum = (await daftarJudul())[0];
    const res = await batalkan("section_text_home", sebelum.id);
    expect(res.status).toBe(200);

    const sesudah = await daftarJudul();
    /* Barisnya TETAP satu dan ber-id sama: pemulihan judul tidak boleh punya
       cabang "buang yang belum pernah tayang", karena seksi tanpa judul
       adalah seksi yang tayang dengan kepala kosong. */
    expect(sesudah).toHaveLength(1);
    expect(sesudah[0].id).toBe(sebelum.id);
    expect(sesudah[0].heading).toBe("Judul tayang");
  });

  it("mematikan kedua penghitung sekaligus, bilah Publish dan layar Review", async () => {
    await simpanJudul("csi-hero", { heading: "Judul tayang" });
    await publishJudul();
    await simpanJudul("csi-hero", { heading: "Judul salah" });

    const { id } = (await daftarJudul())[0];
    await batalkan("section_text_home", id);

    expect(await pendingCount()).toBe(0);
    const { tertahan } = await ambilTertahan();
    expect(tertahan.filter((t) => t.entitas === "section_text_home")).toEqual([]);
  });

  /**
   * Yang dijaga di sini kenapa `updateSectionTextById()` membaca kuncinya dari
   * BARIS, bukan dari snapshot: dua seksi di halaman yang sama berbagi satu
   * nama entitas riwayat, jadi salah baca kunci berarti pembatalan judul satu
   * seksi menimpa judul tetangganya tanpa satu pun galat.
   */
  it("hanya seksi yang ditunjuk yang tersentuh, bukan tetangganya sehalaman", async () => {
    await simpanJudul("csi-hero", { heading: "Hero tayang" });
    await simpanJudul("deployments", { heading: "Deploy tayang" });
    await publishJudul();
    await simpanJudul("csi-hero", { heading: "Hero salah" });
    await simpanJudul("deployments", { heading: "Deploy salah" });

    const hero = (await daftarJudul()).find((r) => r.key === "csi-hero")!;
    await batalkan("section_text_home", hero.id);

    const sesudah = await daftarJudul();
    expect(sesudah.find((r) => r.key === "csi-hero")?.heading).toBe("Hero tayang");
    expect(sesudah.find((r) => r.key === "deployments")?.heading).toBe("Deploy salah");
  });
});
