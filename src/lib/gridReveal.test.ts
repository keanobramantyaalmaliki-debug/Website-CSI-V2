/**
 * Matematika tirai kotak-kotak.
 *
 * Yang dijaga di sini bukan "fungsinya jalan", melainkan dua sifat yang justru
 * TIDAK kentara dari membaca kodenya: bahwa hasilnya permutasi utuh (tidak ada
 * kotak yang kehilangan giliran, tidak ada yang dapat dua), dan bahwa jumlah
 * node-nya tetap terkendali di layar besar. Keduanya rusak dalam senyap —
 * yang pertama jadi "kok ada kotak yang tidak pernah muncul", yang kedua jadi
 * transisi yang tersendat cuma di monitor tertentu.
 */
import { describe, expect, it } from "vitest";
import {
  JITTER_MS,
  MAX_TILES,
  TILE_PX,
  bandGrid,
  shuffledDelays,
  tileGrid,
} from "./gridReveal";

/** RNG deterministik — LCG kecil, cukup untuk memberi urutan yang bisa diulang. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("shuffledDelays", () => {
  it("memberi tepat satu delay untuk tiap kotak", () => {
    const delays = shuffledDelays(120, 380, seeded(7));
    expect(delays).toHaveLength(120);
    expect(delays.every((d) => Number.isFinite(d))).toBe(true);
  });

  it("posisi antreannya permutasi utuh — tidak ada kotak yang telat sendirian", () => {
    // Buktinya lewat delay-nya: kalau urutannya permutasi, delay yang diurutkan
    // harus naik dengan langkah ~durasi/count, bukan bergerombol.
    const count = 200;
    const duration = 380;
    const sorted = [...shuffledDelays(count, duration, seeded(11))].sort((a, b) => a - b);

    const step = duration / count;
    for (let i = 1; i < sorted.length; i++) {
      // Jarak antar-delay berurutan = satu langkah ± dua kali jitter (jitter
      // bisa menarik yang satu maju dan yang lain mundur).
      expect(sorted[i] - sorted[i - 1]).toBeLessThanOrEqual(step + 2 * JITTER_MS + 1e-6);
    }
  });

  it("tidak pernah negatif, dan tidak melewati durasi + jitter", () => {
    const delays = shuffledDelays(64, 450, seeded(3));
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...delays)).toBeLessThanOrEqual(450 + JITTER_MS);
  });

  it("rng berbeda memberi urutan berbeda — buka tidak mengulang tutup", () => {
    const a = shuffledDelays(100, 380, seeded(1));
    const b = shuffledDelays(100, 380, seeded(999));
    expect(a).not.toEqual(b);
  });

  it("count 0 memberi array kosong, bukan lemparan", () => {
    expect(shuffledDelays(0, 380, seeded(1))).toEqual([]);
  });
});

describe("tileGrid", () => {
  it("membulat KE ATAS supaya kisi menutupi layar sepenuhnya", () => {
    const { cols, rows, tile } = tileGrid(1000, 700);
    expect(tile).toBe(TILE_PX);
    expect(cols * tile).toBeGreaterThanOrEqual(1000);
    expect(rows * tile).toBeGreaterThanOrEqual(700);
  });

  it("menahan jumlah node di layar besar dengan MEMBESARKAN kotak", () => {
    const big = tileGrid(2560, 1440);
    expect(big.cols * big.rows).toBeLessThanOrEqual(MAX_TILES);
    expect(big.tile).toBeGreaterThan(TILE_PX);
    // Tetap menutupi layarnya — itu yang tidak boleh ikut dikorbankan.
    expect(big.cols * big.tile).toBeGreaterThanOrEqual(2560);
    expect(big.rows * big.tile).toBeGreaterThanOrEqual(1440);
  });

  it("viewport mungil tetap memberi minimal satu kotak", () => {
    const tiny = tileGrid(0, 0);
    expect(tiny.cols).toBeGreaterThanOrEqual(1);
    expect(tiny.rows).toBeGreaterThanOrEqual(1);
  });
});

describe("bandGrid", () => {
  it("di desktop (hero setinggi layar) pita sisanya lenyap sama sekali", () => {
    const g = bandGrid(1440, 900, 900);
    expect(g.rowsStrip).toBe(0);
    // Tanpa pita, hasilnya wajib sama persis dengan kisi biasa — kalau tidak,
    // desktop diam-diam mendapat kisi yang berbeda dari yang sudah disetel.
    const plain = tileGrid(1440, 900);
    expect(g.cols).toBe(plain.cols);
    expect(g.rowsBand).toBe(plain.rows);
    expect(g.tile).toBe(plain.tile);
  });

  it("membelah hero 70dvh jadi pita + sisa, keduanya tertutup penuh", () => {
    const vh = 844; // iPhone 14-ish
    const bandH = Math.round(vh * 0.7);
    const g = bandGrid(390, vh, bandH);

    expect(g.rowsStrip).toBeGreaterThan(0);
    expect(g.cols * g.tile).toBeGreaterThanOrEqual(390);
    expect(g.rowsBand * g.tile).toBeGreaterThanOrEqual(bandH);
    expect(g.rowsStrip * g.tile).toBeGreaterThanOrEqual(vh - bandH);
  });

  it("anggaran node dihitung atas TOTAL pita + sisa, bukan per bagian", () => {
    // Layar besar yang dibelah: dua pembulatan ke atas menggantikan satu, jadi
    // pembelahan bisa menambah satu baris penuh. Yang dijaga di sini persis
    // itu — kalau anggarannya diperiksa per bagian, angka ini lewat.
    const g = bandGrid(2560, 1440, 1010);
    expect(g.cols * (g.rowsBand + g.rowsStrip)).toBeLessThanOrEqual(MAX_TILES);
    expect(g.tile).toBeGreaterThan(TILE_PX);
  });

  it("bandH lebih besar dari viewport tidak menghasilkan pita negatif", () => {
    // Bisa terjadi sekejap saat bilah URL browser HP menyusut: getBoundingClientRect
    // hero terbaca lebih tinggi dari innerHeight.
    const g = bandGrid(390, 800, 900);
    expect(g.rowsStrip).toBe(0);
    expect(g.rowsBand).toBeGreaterThanOrEqual(1);
  });
});
