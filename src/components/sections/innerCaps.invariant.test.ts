import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Plafon dalam ala basement (27 Agu) — penjaga invarian.
 *
 * `section-shell` (1920) baru menjepit saat viewport CSS > 1920 — di layar
 * 1280 itu = zoom <67%. Supaya zoom-out MENENGAH (100–67%) tetap terasa
 * "situs ikut mengecil", konten yang duduk di kolom fr diberi ukuran
 * intrinsiknya sendiri: teks dipatok ukuran baca (65ch), blok/foto dipatok px
 * sesuai ukurannya di viewport ±1400 (di bawah itu tak ada yang berubah).
 * Persis resep basement.studio: `.grid-layout` mereka 120rem + paragraf 65ch
 * + blok 846px — yang tumbuh di viewport lebar cuma ruang kosong.
 *
 * Yang dijaga KELAS-nya per berkas, bukan angkanya — angka boleh di-tweak,
 * disiplinnya jangan hilang diam-diam saat refactor. Section yang TIDAK ada
 * di daftar ini bukan lolos: mereka sudah punya plafon bawaan (max-w-xl/3xl,
 * clamp(), min(20rem,68vw), max-h kartu) atau memang grid flush yang
 * dibiarkan ikut kolom (CaseGrid, TheCrew, PeopleValues) — lihat memori/docs.
 */
const CAPS: Record<string, RegExp[]> = {
  "CaseStudySpotlight.tsx": [/max-w-\[1400px\]/],
  "CareersRoles.tsx": [/max-w-\[65ch\]/],
  "MissionShowcase.tsx": [/max-w-\[65ch\]/],
  "TestimonialSpotlight.tsx": [/mx-auto w-full max-w-\[\d+px\]/],
  "DeploymentCard.tsx": [/max-w-\[65ch\]/],
  "DeploymentCta.tsx": [/max-w-\[65ch\]/],
};

describe("plafon dalam ala basement", () => {
  for (const [file, patterns] of Object.entries(CAPS)) {
    it(`${file} masih membawa plafon dalamnya`, () => {
      const src = readFileSync(join(HERE, file), "utf8");
      for (const pattern of patterns) {
        expect(src).toMatch(pattern);
      }
    });
  }
});
