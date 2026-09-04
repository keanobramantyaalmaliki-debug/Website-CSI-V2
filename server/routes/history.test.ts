/**
 * Riwayat perubahan, melawan Postgres sungguhan.
 *
 * Dua hal yang tidak bisa diuji tanpa database:
 *
 * Penurunan isi SEBELUM lewat `lag()`. Kolomnya memang tidak ada di tabel —
 * "sebelum" adalah `snapshot` baris audit sebelumnya untuk benda yang sama —
 * jadi kalau pemartisian atau pengurutannya salah, panel akan menampilkan isi
 * milik benda LAIN sebagai pembanding, dan tidak ada yang meneriakkannya.
 *
 * Dan gerbang Publish. Perubahan hanya muncul di riwayat sesudah Publish
 * ditekan, jadi hampir semua test di berkas ini harus memanggil `terbitkan()`
 * dulu — kalau gerbangnya suatu saat dilepas, test yang lupa memanggilnya
 * tetap hijau, sementara test khusus gerbang di bawah yang akan gagal.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "../app";
import { AUDIT_ACTIONS } from "../audit";
import { sql } from "../db/client";
import {
  AKSI_RIWAYAT,
  type PeristiwaRiwayat,
  type PeristiwaTertahan,
} from "@shared/riwayat";
import {
  asEditor,
  loginAsEditor,
  resetDb,
  valueBody,
  visionBody,
  type Login,
} from "../test/helpers";

const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;
type RiwayatRes = {
  riwayat: PeristiwaRiwayat[];
  adaLagi: boolean;
  jenis: string[];
};
type TertahanRes = { tertahan: PeristiwaTertahan[]; terpotong: boolean };
type ValueRes = { value: { id: string; title: string } };

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

const ambil = async (q = "") =>
  json<RiwayatRes>(await api(`/api/riwayat${q}`));

/** Layar Review: yang BELUM dipublish, gerbangnya kebalikan `ambil()`. */
const ambilTertahan = async () =>
  json<TertahanRes>(await api("/api/riwayat/tertahan"));

/** Buat satu nilai, kembalikan id dan judulnya. */
const buatNilai = async (over: Record<string, unknown> = {}) => {
  const res = await api("/api/values", {
    method: "POST",
    body: JSON.stringify(valueBody(over)),
  });
  return (await json<ValueRes>(res)).value;
};

/**
 * Menandai "sudah di-Publish" dengan menulis baris audit-nya langsung.
 *
 * Bukan memanggil `/api/publish` sungguhan: yang dilihat gerbang riwayat cuma
 * baris audit ini, sedangkan publish sungguhan ikut menulis `dist/content.json`
 * — berkas yang benar-benar disajikan ke pengunjung. Test riwayat tidak punya
 * urusan menyentuhnya.
 */
const terbitkan = () => sql`
  insert into audit_log (entity, action, user_name)
  values ('content', 'publish', 'Editor Test')
`;

const ubahNilai = (id: string, over: Record<string, unknown>) =>
  api(`/api/values/${id}`, {
    method: "PUT",
    body: JSON.stringify(valueBody(over)),
  });

/** Satu peristiwa dari daftar, dicari lewat entitas + aksi. */
const cari = (r: PeristiwaRiwayat[], entitas: string, aksi: string) =>
  r.find((p) => p.entitas === entitas && p.aksi === aksi);

const isi = (n: unknown) => n as Record<string, unknown> | null;

describe("gerbang login", () => {
  it("tanpa sesi, riwayat tertutup", async () => {
    const res = await app.request("/api/riwayat");
    expect(res.status).toBe(401);
  });
});

describe("isi sebelum diturunkan dari baris sebelumnya", () => {
  it("perubahan pertama tidak punya pembanding, yang kedua punya", async () => {
    const nilai = await buatNilai({ title: "Craft First" });
    await ubahNilai(nilai.id, { title: "Craft Second" });
    await terbitkan();

    const { riwayat } = await ambil();
    const diubah = cari(riwayat, "value", "update");
    const dibuat = cari(riwayat, "value", "create");

    expect(isi(dibuat?.sebelum)).toBeNull();
    expect(isi(dibuat?.sesudah)?.title).toBe("Craft First");

    expect(isi(diubah?.sebelum)?.title).toBe("Craft First");
    expect(isi(diubah?.sesudah)?.title).toBe("Craft Second");
  });

  it("terbaru di atas", async () => {
    const nilai = await buatNilai({ title: "Craft First" });
    await ubahNilai(nilai.id, { title: "Craft Second" });
    await terbitkan();

    const { riwayat } = await ambil("?entitas=value");
    expect(riwayat.map((p) => p.aksi)).toEqual(["update", "create"]);
  });

  /**
   * Inti pemartisiannya. Dua nilai diubah bergantian: kalau `partition by`
   * lupa menyertakan `entity_id`, pembanding perubahan nilai A akan diambil
   * dari perubahan nilai B yang kebetulan tercatat sebelumnya — isi yang
   * kelihatan masuk akal, dan sepenuhnya salah.
   */
  it("dua benda yang diubah bergantian tidak saling meminjam pembanding", async () => {
    const a = await buatNilai({ title: "A satu" });
    const b = await buatNilai({ title: "B satu" });
    await ubahNilai(a.id, { title: "A dua" });
    await ubahNilai(b.id, { title: "B dua" });
    await terbitkan();

    const { riwayat } = await ambil("?entitas=value");
    const ubahA = riwayat.find(
      (p) => p.aksi === "update" && isi(p.sesudah)?.title === "A dua",
    );
    const ubahB = riwayat.find(
      (p) => p.aksi === "update" && isi(p.sesudah)?.title === "B dua",
    );

    expect(isi(ubahA?.sebelum)?.title).toBe("A satu");
    expect(isi(ubahB?.sebelum)?.title).toBe("B satu");
  });

  /**
   * Visi dan footer sengaja dicatat TANPA `entityId` (id-nya bukan uuid).
   * `partition by` menganggap NULL sama dengan NULL yang lain, dan itulah yang
   * membuat keduanya tetap berantai alih-alih jadi baris yatim tanpa
   * pembanding selamanya.
   */
  it("visi yang dicatat tanpa entityId tetap berantai", async () => {
    await api("/api/vision", {
      method: "PUT",
      body: JSON.stringify(visionBody({ statement: "Kalimat pertama." })),
    });
    await api("/api/vision", {
      method: "PUT",
      body: JSON.stringify(visionBody({ statement: "Kalimat kedua." })),
    });
    await terbitkan();

    const { riwayat } = await ambil("?entitas=vision");
    expect(riwayat).toHaveLength(2);
    expect(isi(riwayat[0].sebelum)?.statement).toBe("Kalimat pertama.");
    expect(isi(riwayat[0].sesudah)?.statement).toBe("Kalimat kedua.");
    expect(isi(riwayat[1].sebelum)).toBeNull();
  });

  it("penghapusan menyimpan isi terakhirnya", async () => {
    const nilai = await buatNilai({ title: "Craft First" });
    await api(`/api/values/${nilai.id}`, { method: "DELETE" });
    await terbitkan();

    const { riwayat } = await ambil();
    expect(isi(cari(riwayat, "value", "delete")?.sesudah)?.title).toBe(
      "Craft First",
    );
  });
});

describe("penyaring dan halaman", () => {
  it("menyaring per jenis konten", async () => {
    await buatNilai();
    await terbitkan();

    const { riwayat } = await ambil("?entitas=value");
    expect(riwayat.length).toBeGreaterThan(0);
    expect(riwayat.every((p) => p.entitas === "value")).toBe(true);
  });

  it("jenis berisi apa yang benar-benar tampil, bukan seluruh kamus", async () => {
    await buatNilai();
    await terbitkan();

    const { jenis } = await ambil();
    expect(jenis).toContain("value");
    expect(jenis).not.toContain("job");
    /* Penyaring yang menawarkan "Masuk panel" lalu memberi daftar kosong sama
       menyesatkannya dengan riwayat yang penuh baris login. */
    expect(jenis).not.toContain("session");
    expect(jenis).not.toContain("content");
  });

  it("adaLagi menandai masih ada baris di bawah, dan lewati melompatinya", async () => {
    await buatNilai({ title: "Satu" });
    await buatNilai({ title: "Dua" });
    await terbitkan();

    const halaman1 = await ambil("?entitas=value&limit=1");
    expect(halaman1.riwayat).toHaveLength(1);
    expect(halaman1.adaLagi).toBe(true);

    const halaman2 = await ambil("?entitas=value&limit=1&lewati=1");
    expect(halaman2.riwayat[0].id).not.toBe(halaman1.riwayat[0].id);
    expect(halaman2.adaLagi).toBe(false);
  });

  it("limit yang bukan angka jatuh ke bawaannya, bukan LIMIT NaN", async () => {
    await buatNilai();
    await terbitkan();
    const res = await api("/api/riwayat?limit=banyak");
    expect(res.status).toBe(200);
  });
});

/**
 * Gerbangnya. Riwayat menjawab "apa yang berubah di situs", bukan "apa yang
 * sedang dikerjakan di panel", jadi yang tampil hanya perubahan konten yang
 * sudah dilewati satu Publish.
 */
describe("gerbang publish", () => {
  it("perubahan yang belum dipublish belum tampil", async () => {
    await buatNilai({ title: "Masih draf" });

    const { riwayat, adaLagi } = await ambil();
    expect(riwayat).toEqual([]);
    expect(adaLagi).toBe(false);
  });

  it("Publish ditekan, perubahan sejak Publish sebelumnya masuk sekaligus", async () => {
    const nilai = await buatNilai({ title: "Satu" });
    await ubahNilai(nilai.id, { title: "Dua" });
    expect((await ambil()).riwayat).toHaveLength(0);

    await terbitkan();

    expect((await ambil()).riwayat.map((p) => p.aksi)).toEqual([
      "update",
      "create",
    ]);
  });

  it("perubahan sesudah Publish terakhir menunggu Publish berikutnya", async () => {
    const nilai = await buatNilai({ title: "Sudah tayang" });
    await terbitkan();
    await ubahNilai(nilai.id, { title: "Belum tayang" });

    /* Yang lama tetap ada; yang baru menunggu. Kalau gerbangnya salah arah,
       yang terjadi justru kebalikannya dan riwayat malah kehilangan masa
       lalunya tiap kali seseorang menyimpan sesuatu. */
    const { riwayat } = await ambil();
    expect(riwayat).toHaveLength(1);
    expect(isi(riwayat[0].sesudah)?.title).toBe("Sudah tayang");

    await terbitkan();
    expect((await ambil()).riwayat).toHaveLength(2);
  });

  it("masuk panel tidak pernah jadi baris riwayat", async () => {
    await buatNilai();
    await terbitkan();

    /* Login-nya benar-benar tercatat (`beforeEach` memanggil loginAsEditor),
       jadi yang diuji penyaringnya, bukan ketiadaan datanya. */
    const [{ jumlah }] = await sql<{ jumlah: string }[]>`
      select count(*) as jumlah from audit_log where action = 'login'
    `;
    expect(Number(jumlah)).toBeGreaterThan(0);

    const { riwayat } = await ambil();
    expect(riwayat.some((p) => p.aksi === "login")).toBe(false);
    expect(riwayat.some((p) => p.entitas === "session")).toBe(false);
  });

  it("Publish sendiri jadi penanda waktu, bukan baris riwayat", async () => {
    await buatNilai();
    await terbitkan();

    const { riwayat } = await ambil();
    expect(riwayat.some((p) => p.aksi === "publish")).toBe(false);
    expect(riwayat.every((p) => p.entitas === "value")).toBe(true);
  });
});

/**
 * Layar Review: gerbangnya persis kebalikan riwayat, dan dicerminkan dengan
 * sengaja. Satu perubahan harus selalu ada di salah satu dari dua layar —
 * kalau kedua gerbang bergeser sendiri-sendiri, akan ada perubahan yang tidak
 * muncul di mana pun, dan tidak ada yang meneriakkannya.
 */
describe("tertahan — gerbang publish dibalik", () => {
  it("tanpa sesi, tertutup", async () => {
    const res = await app.request("/api/riwayat/tertahan");
    expect(res.status).toBe(401);
  });

  it("belum pernah Publish sama sekali: semuanya tertahan", async () => {
    /* Bukan kasus pinggiran yang jarang: inilah keadaan database baru. Kalau
       gerbangnya ditulis `at > (select max(at) …)` tanpa cabang `is null`,
       perbandingannya jadi NULL dan layar Review justru kosong persis ketika
       semua isinya menunggu. */
    await buatNilai({ title: "Belum pernah tayang" });

    const { tertahan } = await ambilTertahan();
    expect(tertahan).toHaveLength(1);
    expect(tertahan[0].aksi).toBe("create");
    expect(tertahan[0].judul).toBe("Belum pernah tayang");
  });

  it("yang sudah dipublish keluar dari daftar", async () => {
    await buatNilai({ title: "Satu" });
    expect((await ambilTertahan()).tertahan).toHaveLength(1);

    await terbitkan();
    expect((await ambilTertahan()).tertahan).toEqual([]);
    /* Dan pindah ke layar sebelah, bukan hilang. */
    expect((await ambil()).riwayat).toHaveLength(1);
  });

  it("beberapa suntingan atas satu benda jadi satu baris, dari tayang ke sekarang", async () => {
    const nilai = await buatNilai({ title: "Tayang" });
    await terbitkan();
    await ubahNilai(nilai.id, { title: "Sekali" });
    await ubahNilai(nilai.id, { title: "Dua kali" });

    const { tertahan } = await ambilTertahan();
    expect(tertahan).toHaveLength(1);
    expect(tertahan[0].kali).toBe(2);
    expect(tertahan[0].aksi).toBe("update");
    /* Pembandingnya keadaan sewaktu Publish terakhir, bukan keadaan sesaat
       sebelum penyimpanan terakhir. Yang di tengah tidak pernah tayang. */
    expect(isi(tertahan[0].sebelum)?.title).toBe("Tayang");
    expect(isi(tertahan[0].sesudah)?.title).toBe("Dua kali");
  });

  it("dibuat lalu dihapus sebelum sempat tayang tidak muncul", async () => {
    const nilai = await buatNilai({ title: "Salah buat" });
    await api(`/api/values/${nilai.id}`, { method: "DELETE" });

    /* Publish tidak akan mengubah apa pun untuk benda ini, dan bar publish
       juga tidak menghitungnya. */
    expect((await ambilTertahan()).tertahan).toEqual([]);
  });

  it("dihapus sesudah pernah tayang: sesudah kosong, judulnya dari isi terakhir", async () => {
    const nilai = await buatNilai({ title: "Pernah tayang" });
    await terbitkan();
    await api(`/api/values/${nilai.id}`, { method: "DELETE" });

    const { tertahan } = await ambilTertahan();
    expect(tertahan).toHaveLength(1);
    expect(tertahan[0].aksi).toBe("delete");
    expect(tertahan[0].judul).toBe("Pernah tayang");
    expect(tertahan[0].sesudah).toBeNull();
    expect(isi(tertahan[0].sebelum)?.title).toBe("Pernah tayang");
  });

  it("masuk panel dan Publish sendiri tidak ikut tertahan", async () => {
    await buatNilai();

    const { tertahan } = await ambilTertahan();
    expect(tertahan.every((t) => t.entitas === "value")).toBe(true);
  });

  it("visi yang dicatat tanpa entityId tetap dapat pembanding", async () => {
    await api("/api/vision", {
      method: "PUT",
      body: JSON.stringify(visionBody({ statement: "Yang tayang" })),
    });
    await terbitkan();
    await api("/api/vision", {
      method: "PUT",
      body: JSON.stringify(visionBody({ statement: "Yang menunggu" })),
    });

    const { tertahan } = await ambilTertahan();
    const visi = tertahan.find((t) => t.entitas === "vision");
    expect(visi).toBeDefined();
    expect(isi(visi?.sebelum)?.statement).toBe("Yang tayang");
    expect(isi(visi?.sesudah)?.statement).toBe("Yang menunggu");
  });

  it("dua benda berbeda tidak saling meminjam pembanding", async () => {
    const a = await buatNilai({ title: "A tayang" });
    const b = await buatNilai({ title: "B tayang" });
    await terbitkan();
    await ubahNilai(a.id, { title: "A baru" });
    await ubahNilai(b.id, { title: "B baru" });

    const { tertahan } = await ambilTertahan();
    expect(tertahan).toHaveLength(2);
    const cariId = (id: string) => tertahan.find((t) => t.entitasId === id);
    expect(isi(cariId(a.id)?.sebelum)?.title).toBe("A tayang");
    expect(isi(cariId(b.id)?.sebelum)?.title).toBe("B tayang");
  });
});

/**
 * `shared/riwayat.ts` menyalin daftar aksi alih-alih mengimpornya, karena
 * berkas `shared/` tidak boleh menarik `server/` ke dalam bundel browser.
 * Salinan yang melenceng berarti aksi baru muncul di panel tanpa label.
 */
describe("daftar aksi", () => {
  it("salinan di shared sama dengan yang dicatat server", () => {
    expect([...AKSI_RIWAYAT]).toEqual([...AUDIT_ACTIONS]);
  });
});
