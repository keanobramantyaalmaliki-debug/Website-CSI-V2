/**
 * fieldConfig — parameter bersama untuk semua engine physics di /lab.
 *
 * Dipakai dua-duanya (cannon-es sekarang, rapier nanti) supaya perbandingan
 * apple-to-apple: jumlah objek, gravitasi, dan bentuk ruang IDENTIK, yang beda
 * cuma enginenya. Pure & tanpa dependency biar bisa diuji tanpa WebGL.
 *
 * Sumbu mengikuti konvensi three (y = atas). Semua satuan meter.
 */

import { mulberry32 } from "@/lib/field/fieldMath";

export type EngineKind = "cannon" | "rapier";

export type BodyShape = "sphere" | "box";

/** Satu objek yang dilempar ke world — bentuk, ukuran, posisi awal, warna. */
export interface BodySpec {
  shape: BodyShape;
  /** Radius (sphere) atau setengah-sisi (box), meter. */
  size: number;
  position: [number, number, number];
  /** Warna hex untuk material — dari palet, deterministik per seed. */
  color: string;
}

/** Parameter simulasi yang bisa diubah dari panel kontrol. */
export interface FieldParams {
  /** Jumlah objek. Di-clamp ke [MIN_COUNT, MAX_COUNT]. */
  count: number;
  /** Gravitasi sumbu-y (negatif = ke bawah). 0 = melayang. Di-clamp. */
  gravityY: number;
  /** Seed RNG — layout stabil antar reload & bisa diuji. */
  seed: number;
}

/**
 * Batas aman. MAX_COUNT dijaga rendah: ini background dekoratif, bukan simulasi
 * utama — puluhan body sudah "terasa", ratusan cuma buang CPU di layer yang
 * seharusnya ringan.
 */
export const MIN_COUNT = 4;
export const MAX_COUNT = 80;
export const MIN_GRAVITY = -20;
export const MAX_GRAVITY = 0;

export const DEFAULT_PARAMS: FieldParams = {
  count: 25,
  gravityY: -1.5, // gravitasi lemah: melayang tenang, bukan jatuh keras
  seed: 7,
};

/** Setengah-dimensi ruang tertutup (dinding tak terlihat), meter. */
export const BOUNDS = { x: 4, y: 2.5, z: 2 } as const;

/** Rentang ukuran objek (radius/half-extent), meter. */
const SIZE_MIN = 0.18;
const SIZE_MAX = 0.42;

/**
 * Palet: netral dingin + satu aksen brand (orange 249,115,22 → #f97316),
 * senada NetworkField. Aksen muncul jarang biar jadi titik fokus, bukan ramai.
 */
const PALETTE = ["#b4becd", "#8b95a5", "#5f6b7c", "#f97316"] as const;
const ACCENT_INDEX = 3;

/** Clamp helper — ekspor untuk diuji langsung. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Rapikan param mentah dari UI ke rentang aman. count dibulatkan. */
export function normalizeParams(raw: Partial<FieldParams>): FieldParams {
  return {
    count: Math.round(clamp(raw.count ?? DEFAULT_PARAMS.count, MIN_COUNT, MAX_COUNT)),
    gravityY: clamp(raw.gravityY ?? DEFAULT_PARAMS.gravityY, MIN_GRAVITY, MAX_GRAVITY),
    seed: (raw.seed ?? DEFAULT_PARAMS.seed) >>> 0,
  };
}

/**
 * Bangun daftar objek deterministik dari seed. Objek disebar merata di dalam
 * bounds (sedikit di atas tengah biar sempat "jatuh" saat gravitasi aktif).
 *
 * Deterministik: seed sama → susunan sama. Ini yang membuat layout stabil antar
 * reload dan bisa di-assert di test.
 */
export function generateBodies(params: FieldParams): BodySpec[] {
  const { count, seed } = normalizeParams(params);
  const rng = mulberry32(seed);
  const out: BodySpec[] = [];

  for (let i = 0; i < count; i++) {
    const shape: BodyShape = rng() < 0.5 ? "sphere" : "box";
    const size = SIZE_MIN + rng() * (SIZE_MAX - SIZE_MIN);
    // Sebar dalam bounds dengan margin selebar ukuran objek biar tak mulai nembus dinding.
    const mx = BOUNDS.x - size;
    const my = BOUNDS.y - size;
    const mz = BOUNDS.z - size;
    const position: [number, number, number] = [
      (rng() * 2 - 1) * mx,
      (rng() * 2 - 1) * my,
      (rng() * 2 - 1) * mz,
    ];
    // Aksen brand hanya ~1 dari 7 objek — sisanya netral.
    const useAccent = rng() < 1 / 7;
    const color = useAccent
      ? PALETTE[ACCENT_INDEX]
      : PALETTE[Math.floor(rng() * ACCENT_INDEX)];
    out.push({ shape, size, position, color });
  }

  return out;
}
