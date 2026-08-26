/**
 * Jepitan dpr zoom-out (zoomDpr.ts) — dua kontrak yang dijaga:
 *
 * 1. Di zoom ≥100% TIDAK ADA perubahan piksel: faktor = 1, dan
 *    `zoomAwareDpr` identik dengan perilaku rentang R3F `[min, max]` lama.
 *    Ini syarat persetujuan Keano 26 Agu — fix hanya boleh menyentuh
 *    kondisi zoom-out.
 * 2. Semua EMPAT Canvas memakai jepitannya, dan override `?dpr=` di
 *    Scene.tsx TIDAK ikut dikalikan (angka A/B harus terpasang apa
 *    adanya) — pemeriksaan teks, pola yang sama dengan adaptiveDpr.test.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { zoomAwareDpr, zoomOutFactor } from "./zoomDpr";

const CANVAS_DIR = dirname(fileURLToPath(import.meta.url));

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

describe("zoomOutFactor — hanya aktif saat zoom-out", () => {
  it("zoom ≥100% (dpr 1 / 1.5 / 2 / 3) = 1, nol perubahan", () => {
    for (const dpr of [1, 1.5, 2, 3]) expect(zoomOutFactor(dpr)).toBe(1);
  });

  it("zoom-out (dpr<1) menyusut sebanding", () => {
    expect(zoomOutFactor(0.5)).toBe(0.5); // Retina zoom 50%
    expect(zoomOutFactor(1 / 3)).toBeCloseTo(1 / 3); // Retina zoom 33%
  });
});

describe("zoomAwareDpr — pengganti dpr={[1, 1.5]}", () => {
  it("zoom ≥100% identik dengan clamp rentang R3F lama", () => {
    expect(zoomAwareDpr(1, 1, 1.5)).toBe(1); // layar biasa
    expect(zoomAwareDpr(1.25, 1, 1.5)).toBe(1.25); // di dalam rentang
    expect(zoomAwareDpr(2, 1, 1.5)).toBe(1.5); // Retina, kena plafon
    expect(zoomAwareDpr(3, 1, 1.5)).toBe(1.5);
  });

  it("zoom-out: buffer fisik kembali ~ukuran viewport 100%", () => {
    // Retina zoom 50%: dpr 0.5 → dulu lantai 1 (4× piksel), kini 0.5
    // (piksel fisik = 0.5 × viewport CSS 2× = ukuran semula).
    expect(zoomAwareDpr(0.5, 1, 1.5)).toBe(0.5);
    expect(zoomAwareDpr(1 / 3, 1, 1.5)).toBeCloseTo(1 / 3);
  });
});

describe("pemasangan di keempat Canvas (pemeriksaan teks)", () => {
  const read = (p: string) => stripComments(readFileSync(p, "utf8"));

  it("Scene.tsx: tangga dikalikan faktor zoom, override ?dpr= TIDAK", () => {
    const src = read(join(CANVAS_DIR, "Scene.tsx"));
    expect(src).toContain("useZoomOutFactor");
    // Override menang bulat: saat ?dpr= aktif, prop dpr = angka override
    // tanpa perkalian; selain itu tangga × faktor.
    expect(src).toMatch(
      /dpr=\{DPR_OVERRIDE !== null \? dpr : dpr \* zoomFactor\}/,
    );
  });

  for (const file of [
    join(CANVAS_DIR, "IndustriesStack.tsx"),
    join(CANVAS_DIR, "ServicesTicker.tsx"),
    join(CANVAS_DIR, "..", "motion", "InquiryLaptop.tsx"),
  ]) {
    it(`${file.split("/").slice(-1)[0]}: rentang [1, 1.5] lewat useZoomAwareDpr`, () => {
      const src = read(file);
      expect(src).toContain("useZoomAwareDpr(1, 1.5)");
      // Rentang mati lama tidak boleh kembali — lantai 1-nya yang bikin
      // buffer meledak saat zoom-out.
      expect(src).not.toMatch(/dpr=\{\[/);
    });
  }
});
