import { describe, expect, it } from "vitest";
import { CONTENT_GROUPS, findEntry } from "@shared/contentMap";
import {
  bandingkan,
  barisUrutan,
  judulIsi,
  LABEL_AKSI,
  kelompokkanTertahan,
  namaEntitas,
  namaIsian,
  nilaiJadiTeks,
  urutkanTertahan,
  RUTE_ENTITAS,
  type PeristiwaRiwayat,
  type PeristiwaTertahan,
} from "@shared/riwayat";

describe("bandingkan — cuma isian yang berubah", () => {
  it("mengembalikan isian yang berubah saja, bukan seluruh isi", () => {
    const baris = bandingkan(
      { title: "Backend Engineer", department: "Engineering", state: "live" },
      { title: "Backend Developer", department: "Engineering", state: "live" },
    );

    expect(baris).toEqual([
      {
        key: "title",
        label: "Judul",
        sebelum: "Backend Engineer",
        sesudah: "Backend Developer",
      },
    ]);
  });

  it("isi yang sama persis tidak menghasilkan baris apa pun", () => {
    expect(bandingkan({ title: "Sama" }, { title: "Sama" })).toEqual([]);
  });

  it("membuang unpublished, yang dihitung API dan bukan isian yang diketik", () => {
    const baris = bandingkan(
      { title: "Judul", unpublished: false },
      { title: "Judul", unpublished: true },
    );

    expect(baris).toEqual([]);
  });

  it("membuang isian pembukuan, terutama updatedAt yang berubah tiap kali", () => {
    const baris = bandingkan(
      { id: "a1", title: "Lama", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
      { id: "a1", title: "Baru", createdAt: "2026-01-01", updatedAt: "2026-09-03" },
    );

    expect(baris.map((b) => b.key)).toEqual(["title"]);
  });

  it("sebelum null berarti pembuatan: kolom sebelum kosong", () => {
    const baris = bandingkan(null, { title: "Lowongan baru", state: "draft" });

    expect(baris).toEqual([
      { key: "title", label: "Judul", sebelum: "", sesudah: "Lowongan baru" },
      { key: "state", label: "Status", sebelum: "", sesudah: "draft" },
    ]);
  });

  it("sesudah null berarti penghapusan: isi terakhirnya tetap terbaca", () => {
    const baris = bandingkan({ title: "Yang dihapus" }, null);

    expect(baris).toEqual([
      { key: "title", label: "Judul", sebelum: "Yang dihapus", sesudah: "" },
    ]);
  });

  it("isian yang cuma ada di isi lama ikut muncul, bukan hilang diam-diam", () => {
    const baris = bandingkan({ tagline: "Baris lama" }, { title: "Judul" });

    expect(baris.map((b) => b.key).sort()).toEqual(["tagline", "title"]);
  });

  it("urutan barisnya mengikuti bentuk isi yang sekarang lebih dulu", () => {
    const baris = bandingkan(
      { lamaSaja: "x", title: "A" },
      { title: "B", state: "live" },
    );

    expect(baris.map((b) => b.key)).toEqual(["title", "state", "lamaSaja"]);
  });
});

describe("bandingkan — bentuk isi yang aneh tidak melempar", () => {
  it("dua-duanya null menghasilkan daftar kosong", () => {
    expect(bandingkan(null, null)).toEqual([]);
  });

  it("isi yang bukan objek dianggap kosong", () => {
    expect(bandingkan("bukan objek", 42)).toEqual([]);
  });
});

describe("nilaiJadiTeks — isi jadi teks yang dibaca editor", () => {
  it("daftar teks jadi baris bernomor supaya perpindahan posisi terlihat", () => {
    expect(nilaiJadiTeks(["Riset", "Desain", "Bangun"])).toBe(
      "1. Riset\n2. Desain\n3. Bangun",
    );
  });

  it("daftar yang cuma bertukar posisi menghasilkan teks yang berbeda", () => {
    const a = nilaiJadiTeks(["Riset", "Desain"]);
    const b = nilaiJadiTeks(["Desain", "Riset"]);

    expect(a).not.toBe(b);
    expect(bandingkan({ subs: ["Riset", "Desain"] }, { subs: ["Desain", "Riset"] }))
      .toHaveLength(1);
  });

  it("daftar objek jadi baris ringkas berlabel, bukan JSON", () => {
    expect(
      nilaiJadiTeks([
        { platform: "linkedin", url: "https://linkedin.com/company/cogniti" },
      ]),
    ).toBe("1. Layanan: linkedin, Tautan: https://linkedin.com/company/cogniti");
  });

  it("objek tunggal jadi satu baris berlabel", () => {
    expect(nilaiJadiTeks({ sector: "Energi", region: "Kalimantan" })).toBe(
      "Sektor: Energi, Wilayah: Kalimantan",
    );
  });

  it("boolean jadi Ya / Tidak, bukan true / false", () => {
    expect(nilaiJadiTeks(true)).toBe("Ya");
    expect(nilaiJadiTeks(false)).toBe("Tidak");
  });

  it("kosong dan daftar kosong jadi teks kosong", () => {
    expect(nilaiJadiTeks(null)).toBe("");
    expect(nilaiJadiTeks(undefined)).toBe("");
    expect(nilaiJadiTeks([])).toBe("");
  });

  it("angka nol tetap tercetak, tidak dianggap kosong", () => {
    expect(nilaiJadiTeks(0)).toBe("0");
  });

  it("isian pembukuan di dalam objek bersarang ikut dibuang", () => {
    expect(nilaiJadiTeks({ id: "x1", title: "Judul", updatedAt: "2026-09-03" }))
      .toBe("Judul: Judul");
  });
});

describe("kamus label", () => {
  it("nama tabel diterjemahkan ke bahasa yang dipakai menu sisi", () => {
    expect(namaEntitas("work_project")).toBe("Selected work");
    expect(namaEntitas("process-step")).toBe("Cara kerja");
  });

  it("entitas yang belum ada di kamus tampil apa adanya", () => {
    expect(namaEntitas("entitas_baru")).toBe("entitas_baru");
  });

  it("tiap aksi yang dicatat punya label, termasuk pembatalan", () => {
    expect(LABEL_AKSI.revert).toBe("Dibatalkan");
  });

  it("isian yang belum diterjemahkan tampil apa adanya, tidak disembunyikan", () => {
    expect(namaIsian("isianBaru")).toBe("isianBaru");
    expect(
      bandingkan({ isianBaru: "lama" }, { isianBaru: "baru" }).map((b) => b.label),
    ).toEqual(["isianBaru"]);
  });
});

describe("RUTE_ENTITAS — tiap jenis menunjuk layar yang benar-benar ada", () => {
  /* Penjaga untuk tombol "Buka" di layar Review. Salah ketik di peta ini tidak
     menimbulkan galat apa pun: tombolnya mendarat di hash yang tidak dikenali,
     `bacaRute` melemparkannya ke beranda, dan editor mengira dia salah klik. */
  it("tiap key punya entri siap di peta konten", () => {
    for (const [entitas, key] of Object.entries(RUTE_ENTITAS)) {
      const entri = findEntry(key);
      expect(entri, `${entitas} → ${key}`).not.toBeNull();
      expect(entri?.entry.status, `${entitas} → ${key}`).toBe("siap");
    }
  });

  /* `image` dan `session` sengaja TIDAK ada: unggahan dan sesi masuk tidak
     punya layar untuk dibuka. Kalau suatu hari salah satunya ditambahkan, ini
     yang lebih dulu berbunyi. */
  it("jenis tanpa layar tidak ikut terdaftar", () => {
    expect(RUTE_ENTITAS.image).toBeUndefined();
    expect(RUTE_ENTITAS.session).toBeUndefined();
  });
});

describe("judulIsi — nama benda diturunkan dari isinya", () => {
  it("memakai title, lalu name, lalu quote", () => {
    expect(judulIsi("job", { title: "Backend Engineer" })).toBe("Backend Engineer");
    expect(judulIsi("crew", { name: "Nico" })).toBe("Nico");
    expect(judulIsi("testimonial", { quote: "Kerjanya rapi" })).toBe("Kerjanya rapi");
  });

  it("deployment disebut lengkap dengan wilayahnya, karena itu identitasnya", () => {
    expect(judulIsi("deployment", { sector: "Mining", region: "Kalimantan" })).toBe(
      "Mining, Kalimantan",
    );
  });

  it("baris urutan bukan satu benda, jadi namanya menyebut jenisnya", () => {
    expect(judulIsi("value", { urutan: ["a", "b"] })).toBe("Urutan nilai");
  });

  it("isi pertama yang kosong dilewati, bukan bikin judul kosong", () => {
    /* Terjadi tiap penghapusan: `sesudah` null, judulnya harus datang dari
       isi terakhir yang masih tercatat. */
    expect(judulIsi("job", null, { title: "Yang dihapus" })).toBe("Yang dihapus");
  });

  it("tanpa isian judul sama sekali, jatuh ke nama jenisnya", () => {
    expect(judulIsi("footer", { tagline: "apa saja" })).toBe(namaEntitas("footer"));
  });

  it("judul panjang dipotong supaya tidak mendorong kolom lain keluar layar", () => {
    const panjang = "a".repeat(200);
    const hasil = judulIsi("testimonial", { quote: panjang });
    expect(hasil.length).toBeLessThanOrEqual(64);
    expect(hasil.endsWith("…")).toBe(true);
  });
});

describe("kelompokkanTertahan — satu benda, bukan satu penyimpanan", () => {
  const p = (
    id: string,
    entitas: string,
    entitasId: string | null,
    aksi: "create" | "update" | "delete",
    pada: string,
    sebelum: unknown,
    sesudah: unknown,
  ): PeristiwaRiwayat => ({
    id,
    pada,
    siapa: "keano",
    entitas,
    entitasId,
    aksi,
    sebelum,
    sesudah,
  });

  it("tiga suntingan atas satu lowongan jadi satu baris, dari tayang ke sekarang", () => {
    const hasil = kelompokkanTertahan([
      p("3", "job", "j1", "update", "2026-09-03T03:00:00Z", { title: "B" }, { title: "C" }),
      p("2", "job", "j1", "update", "2026-09-03T02:00:00Z", { title: "A" }, { title: "B" }),
      p("1", "job", "j1", "update", "2026-09-03T01:00:00Z", { title: "Tayang" }, { title: "A" }),
    ]);

    expect(hasil).toHaveLength(1);
    expect(hasil[0].kali).toBe(3);
    expect(hasil[0].aksi).toBe("update");
    /* Yang dilihat pengunjung: "Tayang" → "C". Dua keadaan di tengah tidak
       pernah tayang dan tidak boleh muncul di perbandingan. */
    expect(hasil[0].sebelum).toEqual({ title: "Tayang" });
    expect(hasil[0].sesudah).toEqual({ title: "C" });
    expect(hasil[0].pada).toBe("2026-09-03T03:00:00Z");
  });

  it("dibuat lalu disunting tetap terbaca Dibuat, karena belum pernah tayang", () => {
    const hasil = kelompokkanTertahan([
      p("2", "value", "v1", "update", "2026-09-03T02:00:00Z", { title: "A" }, { title: "B" }),
      p("1", "value", "v1", "create", "2026-09-03T01:00:00Z", null, { title: "A" }),
    ]);

    expect(hasil[0].aksi).toBe("create");
    expect(hasil[0].sebelum).toBeNull();
    expect(hasil[0].sesudah).toEqual({ title: "B" });
  });

  it("dihapus: sesudah jadi null supaya perbandingannya memperlihatkan yang hilang", () => {
    const hasil = kelompokkanTertahan([
      p("2", "crew", "c1", "delete", "2026-09-03T02:00:00Z", { name: "Nico" }, { name: "Nico" }),
    ]);

    expect(hasil[0].aksi).toBe("delete");
    expect(hasil[0].sebelum).toEqual({ name: "Nico" });
    expect(hasil[0].sesudah).toBeNull();
    expect(hasil[0].judul).toBe("Nico");
  });

  it("dibuat LALU dihapus sebelum terpublish tidak muncul sama sekali", () => {
    /* Publish tidak akan mengubah apa pun untuk benda ini, dan bar publish
       juga tidak menghitungnya. Menampilkannya membuat dua angka di layar
       yang sama saling membantah. */
    const hasil = kelompokkanTertahan([
      p("2", "job", "j9", "delete", "2026-09-03T02:00:00Z", { title: "Salah buat" }, { title: "Salah buat" }),
      p("1", "job", "j9", "create", "2026-09-03T01:00:00Z", null, { title: "Salah buat" }),
    ]);

    expect(hasil).toEqual([]);
  });

  it("benda berbeda tidak tercampur walau jenisnya sama", () => {
    const hasil = kelompokkanTertahan([
      p("2", "job", "j2", "update", "2026-09-03T02:00:00Z", { title: "X" }, { title: "Y" }),
      p("1", "job", "j1", "update", "2026-09-03T01:00:00Z", { title: "A" }, { title: "B" }),
    ]);

    expect(hasil).toHaveLength(2);
    expect(hasil.map((h) => h.entitasId).sort()).toEqual(["j1", "j2"]);
  });

  it("baris urutan (tanpa id) tetap punya kunci sendiri", () => {
    const hasil = kelompokkanTertahan([
      p("1", "value", null, "update", "2026-09-03T01:00:00Z", null, { urutan: ["b", "a"] }),
    ]);

    expect(hasil).toHaveLength(1);
    expect(hasil[0].key).toBe("value|");
    expect(hasil[0].judul).toBe("Urutan nilai");
  });
});

describe("urutkanTertahan — urut halaman situs, bukan urut waktu", () => {
  const t = (entitas: string, pada: string): PeristiwaTertahan => ({
    key: `${entitas}|x`,
    entitas,
    entitasId: "x",
    aksi: "update",
    judul: entitas,
    siapa: null,
    pada,
    kali: 1,
    sebelum: null,
    sesudah: null,
  });

  const urutanHalaman = CONTENT_GROUPS.flatMap((g) => g.entries.map((e) => e.key));

  it("jenis yang lebih dulu di situs tampil lebih dulu, walau disentuh lebih lama", () => {
    const hasil = urutkanTertahan(
      [t("job", "2026-09-03T09:00:00Z"), t("deployment", "2026-09-03T01:00:00Z")],
      urutanHalaman,
    );

    /* Deployment ada di Home, lowongan di People — dan Home lebih dulu. */
    expect(hasil.map((h) => h.entitas)).toEqual(["deployment", "job"]);
  });

  it("di dalam satu jenis, yang terbaru di atas", () => {
    const hasil = urutkanTertahan(
      [t("job", "2026-09-03T01:00:00Z"), t("job", "2026-09-03T09:00:00Z")],
      urutanHalaman,
    );

    expect(hasil.map((h) => h.pada)).toEqual([
      "2026-09-03T09:00:00Z",
      "2026-09-03T01:00:00Z",
    ]);
  });

  it("jenis yang tidak ada di peta halaman jatuh ke belakang, bukan hilang", () => {
    const hasil = urutkanTertahan(
      [t("entah-apa", "2026-09-03T09:00:00Z"), t("job", "2026-09-03T01:00:00Z")],
      urutanHalaman,
    );

    expect(hasil.map((h) => h.entitas)).toEqual(["job", "entah-apa"]);
  });
});

/**
 * Penjaga tombol "Batalkan" di layar Review.
 *
 * Baris urutan tidak dapat tombol, karena snapshot-nya menyimpan JUDUL bukan
 * id, jadi pemulihannya cuma bisa menebak. Yang berbahaya adalah salah kenal
 * ke ARAH SEBALIKNYA: visi dan footer juga dicatat tanpa `entitasId`, dan
 * kalau keduanya ikut terbaca sebagai baris urutan, dua entitas yang sebetulnya
 * bisa dibatalkan akan kehilangan tombolnya diam-diam.
 */
describe("barisUrutan — dikenali dari bentuk isi, bukan dari entitasId kosong", () => {
  it("snapshot berisi daftar urutan dikenali", () => {
    expect(
      barisUrutan({ entitasId: null, sesudah: { urutan: ["A", "B"] } }),
    ).toBe(true);
  });

  it("singleton tanpa entitasId bukan baris urutan", () => {
    expect(
      barisUrutan({ entitasId: null, sesudah: { statement: "Visi kami" } }),
    ).toBe(false);
    expect(barisUrutan({ entitasId: null, sesudah: null })).toBe(false);
  });

  it("benda ber-id tidak pernah jadi baris urutan", () => {
    expect(
      barisUrutan({ entitasId: "abc", sesudah: { urutan: ["A"] } }),
    ).toBe(false);
  });
});
