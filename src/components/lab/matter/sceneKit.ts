/**
 * sceneKit — kontrak & helper bersama untuk galeri scene Matter.js.
 *
 * Tiap scene adalah fungsi murni yang MENERIMA konteks (engine, ukuran, palet,
 * factory Matter) lalu MENGEMBALIKAN body/constraint untuk ditambahkan ke world.
 * Scene tidak menyentuh Render/Runner/Mouse — semua lifecycle itu milik hook.
 * Pemisahan ini bikin tiap kasus terisolasi, mudah diuji, dan gampang ditambah.
 */
import type Matter from "matter-js";

/** Palet selaras token tema (src/index.css) — dipakai semua scene. */
export const PALETTE = {
  accent: "#f97316",
  surface: "#262b33",
  surfaceLight: "#3a4049",
  line: "rgba(255, 255, 255, 0.14)",
  muted: "#5f6b7c",
} as const;

/** Konteks yang diberikan hook ke tiap scene builder. */
export interface SceneCtx {
  /** Namespace Matter penuh (Bodies, Composite, Constraint, dll). */
  M: typeof Matter;
  engine: Matter.Engine;
  /** Ukuran area gambar saat ini (px, sudah dikurangi devicePixelRatio). */
  width: number;
  height: number;
  palette: typeof PALETTE;
}

/** Hasil satu scene: apa saja yang harus dimasukkan ke world. */
export type SceneObjects = Array<Matter.Body | Matter.Composite | Matter.Constraint>;

/** Definisi satu scene di registry. */
export interface Scene {
  id: string;
  label: string;
  /** Satu baris petunjuk interaksi, tampil di header. */
  hint: string;
  /** Gravitasi-y untuk scene ini (default 1). Zero-G pakai 0. */
  gravityY?: number;
  /** Bangun isi scene. Dipanggil ulang tiap ganti scene / reset / resize. */
  build: (ctx: SceneCtx) => SceneObjects;
}

/** Render style body dinamis: mayoritas surface, sebagian aksen brand. */
export function bodyRender(M: typeof Matter, accentChance = 0.24) {
  const accent = M.Common.random() < accentChance;
  return {
    fillStyle: accent ? PALETTE.accent : PALETTE.surface,
    strokeStyle: accent ? PALETTE.accent : PALETTE.line,
    lineWidth: 1,
  };
}

/** Render style body statis (dinding, peg, pivot). */
export function staticRender(fill: string = PALETTE.surfaceLight) {
  return { fillStyle: fill, strokeStyle: PALETTE.line, lineWidth: 1 };
}

/**
 * Dinding batas standar: lantai + 2 sisi + langit-langit tinggi, ditaruh di luar
 * viewport supaya body tak lolos. Dipakai mayoritas scene bergravitasi.
 */
export function makeWalls(ctx: SceneCtx, opts?: { ceiling?: boolean }): SceneObjects {
  const { M, width, height } = ctx;
  const t = 120;
  const r = staticRender(PALETTE.surface);
  const walls = [
    M.Bodies.rectangle(width / 2, height + t / 2, width + t * 2, t, { isStatic: true, render: r }),
    M.Bodies.rectangle(-t / 2, height / 2, t, height * 3, { isStatic: true, render: r }),
    M.Bodies.rectangle(width + t / 2, height / 2, t, height * 3, { isStatic: true, render: r }),
  ];
  if (opts?.ceiling) {
    walls.push(
      M.Bodies.rectangle(width / 2, -t / 2, width + t * 2, t, { isStatic: true, render: r }),
    );
  }
  return walls;
}
