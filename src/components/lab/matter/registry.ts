/**
 * registry — daftar semua scene galeri Matter.js, urut tampil di dropdown.
 * Re-export only (index pattern): scene didefinisikan di scenesBasic/Advanced.
 */
import { BASIC_SCENES } from "./scenesBasic";
import { ADVANCED_SCENES } from "./scenesAdvanced";
import type { Scene } from "./sceneKit";

export const SCENES: Scene[] = [...BASIC_SCENES, ...ADVANCED_SCENES];

/** Cari scene by id; fallback ke scene pertama kalau id tak dikenal. */
export function sceneById(id: string): Scene {
  return SCENES.find((s) => s.id === id) ?? SCENES[0];
}

export type { Scene };
