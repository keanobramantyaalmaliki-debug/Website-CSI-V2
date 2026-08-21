/**
 * Invarian lipatan waktu debu (Dust.tsx) — penjaga fix "debu patah-patah
 * kalau tab hidup lama" (presisi float32, lihat komentar TIME_WRAP).
 *
 * Lipatan uTime ke [0, TIME_WRAP) hanya TAK TERLIHAT selama dua syarat
 * aritmetika di bawah bertahan. Keduanya menyilang beberapa konstanta yang
 * kelihatannya bebas di-tweak sendiri-sendiri (RISE "cuma laju naik",
 * SWAY_HZ "cuma laju goyang") — padahal menggeser salah satunya tanpa
 * menghitung ulang TIME_WRAP membuat seluruh taburan debu MELOMPAT serempak
 * tiap 13⅓ menit, bug yang baru kelihatan kalau kebetulan menatap layar di
 * detik yang tepat. Pola penjagaan yang sama dengan
 * frameloop.invariant.test.ts: kontraknya antar-baris yang berjauhan.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RISE, SPEED_STEP, SWAY_HZ, TIME_WRAP, Y_MAX, Y_MIN } from "./Dust";

/** Jarak modular ke kelipatan bulat terdekat — toleran galat float64. */
const modDist = (x: number, period: number) => {
  const r = ((x % period) + period) % period;
  return Math.min(r, period - r);
};

describe("invarian TIME_WRAP debu", () => {
  it("sway menempuh putaran bulat dalam satu periode wrap", () => {
    // sin berperiode 1/SWAY_HZ; kalau TIME_WRAP bukan kelipatannya, tiap
    // lipatan menggeser fase SEMUA bintik sekaligus.
    expect(modDist(TIME_WRAP * SWAY_HZ, 1)).toBeLessThan(1e-9);
  });

  it("tiap tingkat laju naik menempuh kelipatan bulat pita Y", () => {
    const band = Y_MAX - Y_MIN;
    // Tingkat lajunya 0,6..1,4 dengan langkah SPEED_STEP — cukup menguji
    // langkah dasarnya: kalau RISE × SPEED_STEP × TIME_WRAP kelipatan pita,
    // semua tingkat (kelipatan bulat langkah itu) otomatis ikut.
    expect(modDist(RISE * SPEED_STEP * TIME_WRAP, band)).toBeLessThan(1e-9);
  });

  it("shader benar-benar mengkuantisasi laju & useFrame benar-benar melipat", () => {
    // Syarat di atas hanya bermakna kalau dua baris ini masih ada:
    // pembulatan seed ke tingkat SPEED_STEP di vertex shader, dan modulo
    // TIME_WRAP di akumulasi waktu. Keduanya satu baris di file panjang —
    // jenis baris yang hilang diam-diam saat resolusi konflik merge.
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "Dust.tsx"),
      "utf8",
    );
    expect(src).toMatch(/floor\(\s*aSeed\.z\s*\*\s*8\.0\s*\+\s*0\.5\s*\)/);
    expect(src).toMatch(/%\s*TIME_WRAP/);
  });
});
