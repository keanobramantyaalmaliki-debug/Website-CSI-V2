/**
 * Penjaga hitungan pin Hero.
 *
 * ── Kenapa membaca berkas sumber ───────────────────────────────────────────
 * Yang dijaga di sini adalah kesepakatan antara dua hal yang tidak pernah
 * bertemu saat runtime: tinggi track/sticky yang ditulis sebagai kelas Tailwind
 * di Hero.tsx, dan CANVAS_EXIT_RANGE yang ditulis sebagai konstanta. Kelasnya
 * tidak bisa disusun dari variabel — pemindai Tailwind membaca teks — jadi
 * satu-satunya cara memeriksanya tanpa merender Hero (yang berarti menyalakan
 * R3F/three di jsdom demi dua angka) adalah membaca teksnya.
 *
 * ── Kenapa perlu dijaga ────────────────────────────────────────────────────
 * Keduanya sudah pernah dilanggar, dan gejalanya tidak pernah menunjuk ke
 * penyebabnya:
 *
 *   track 150dvh (percobaan pertama)  → rasio jadi 0,533; di HP canvas habis
 *                                       memudar ~13dvh SEBELUM lepas pin, jadi
 *                                       ada area kosong yang masih terpaku
 *   fade di [0.6, 1.0]                → canvas masih pekat setelah lepas pin
 *                                       dan muncul lagi di bawah seam
 *                                       ("kepotong saat discroll")
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CANVAS_EXIT_RANGE,
  PIN_HEIGHTS,
  UNPIN_RATIO,
  unpinRatio,
} from "./heroPin";

// Lewat cwd, bukan `import.meta.url`: Vite menyulapnya jadi URL http di graf
// modulnya, dan readFileSync menolak skema itu. Vitest selalu berjalan dari
// akar project.
const SOURCE = readFileSync(
  resolve(process.cwd(), "src/components/sections/Hero.tsx"),
  "utf8",
);

/** `h-[126dvh]` → 126, `md:h-dvh` → 100. */
function dvh(cls: string): number {
  if (/^(md:)?h-dvh$/.test(cls)) return 100;
  const match = /^(?:md:)?h-\[(\d+)dvh\]$/.exec(cls);
  if (!match) throw new Error(`Kelas tinggi tak dikenali di Hero.tsx: "${cls}"`);
  return Number(match[1]);
}

/** Tinggi mobile (kelas dasar) dan desktop (kelas `md:`) dari satu elemen. */
function heightsOf(marker: string) {
  const attribute = Array.from(
    SOURCE.matchAll(/className="([^"]*)"/g),
    (m) => m[1],
  ).find((value) => value.includes(marker));
  if (!attribute) {
    throw new Error(
      `Tidak ada elemen ber-className "${marker}" di Hero.tsx. Susunan ` +
        `pin-nya berubah — test ini ikut perlu disesuaikan.`,
    );
  }
  const parts = attribute.split(/\s+/);
  const base = parts.find((p) => /^h-/.test(p));
  const md = parts.find((p) => /^md:h-/.test(p));
  if (!base || !md) {
    throw new Error(`Elemen "${marker}" tidak punya tinggi dasar + md:`);
  }
  return { mobile: dvh(base), desktop: dvh(md) };
}

describe("hitungan pin Hero", () => {
  it("kelas Tailwind di Hero.tsx sepakat dengan PIN_HEIGHTS", () => {
    const track = heightsOf("relative h-[");
    const sticky = heightsOf("sticky top-0");

    expect(
      {
        desktop: { track: track.desktop, sticky: sticky.desktop },
        mobile: { track: track.mobile, sticky: sticky.mobile },
      },
      "Tinggi track/sticky di Hero.tsx tidak lagi sama dengan PIN_HEIGHTS. " +
        "Salah satunya berubah tanpa pasangannya ikut dihitung ulang.\n",
    ).toEqual(PIN_HEIGHTS);
  });

  it("lepas pin di titik yang sama di desktop dan HP", () => {
    expect(
      unpinRatio(PIN_HEIGHTS.mobile),
      "Rasio lepas pin desktop dan HP berbeda. Satu rentang fade tidak " +
        "mungkin benar untuk keduanya: yang satu selesai terlalu awal " +
        "(area kosong masih terpaku), yang lain terlalu lambat (canvas " +
        "muncul lagi di bawah seam). Hitung ulang: track = sticky / (1 − r).\n",
    ).toBeCloseTo(unpinRatio(PIN_HEIGHTS.desktop), 10);
  });

  it("canvas habis memudar sebelum sticky-nya lepas pin", () => {
    expect(
      CANVAS_EXIT_RANGE[1],
      `Fade canvas baru selesai di ${CANVAS_EXIT_RANGE[1]}, padahal sticky ` +
        `lepas pin di ${UNPIN_RATIO.toFixed(3)}. Sisanya digulir bersama ` +
        `halaman dalam keadaan masih terlihat, jadi canvas muncul lagi di ` +
        `bawah seam HeroHandoff.\n`,
    ).toBeLessThanOrEqual(UNPIN_RATIO);
  });

  it("tidak mengubah ukuran canvas selama surut", () => {
    // Baris `style={{ ... }}`-nya, bukan baris deklarasi canvasOpacity — yang
    // menentukan tampilan adalah apa yang benar-benar dipasang ke elemennya.
    const exitStyle = SOURCE.split("\n").find((line) =>
      line.includes("opacity: canvasOpacity"),
    );

    expect(
      exitStyle,
      "Tidak ada style yang memasang canvasOpacity ke pembungkus canvas. " +
        "Susunannya berubah — test ini ikut perlu disesuaikan.",
    ).toBeDefined();
    expect(
      exitStyle,
      "Ada scale lagi pada pembungkus canvas. Karena canvas-nya `inset-0`, " +
        "mengecilkannya menarik tepinya ke dalam dan memunculkan pita latar " +
        "di sekelilingnya — terbaca sebagai canvas yang tiba-tiba mengecil, " +
        "bukan sebagai surut yang mulus (dilaporkan 6 Agu 2026).\n",
    ).not.toMatch(/\bscale\b/);
  });
});
