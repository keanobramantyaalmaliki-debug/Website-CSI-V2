import { describe, expect, it } from "vitest";
import {
  BALL_R,
  FELT,
  HEAD_SPOT,
  KITCHEN_Z0,
  clampFreeBall,
} from "./table";

/**
 * Free ball hanya boleh ditaruh di zona kitchen — 35% panjang meja dari ujung
 * head. Clamp-nya murni geometri, jadi diuji sebagai fungsi murni; interaksi
 * drag-nya sendiri diverifikasi mata lewat scripts/drive.mjs.
 */
describe("clampFreeBall", () => {
  it("zona = 35% panjang meja, dan head spot (posisi respot) ada di dalamnya", () => {
    expect(KITCHEN_Z0).toBeCloseTo(FELT.z1 - 0.35 * (FELT.z1 - FELT.z0), 10);
    const [x, z] = clampFreeBall(HEAD_SPOT[0], HEAD_SPOT[2]);
    expect(x).toBe(HEAD_SPOT[0]);
    expect(z).toBe(HEAD_SPOT[2]);
  });

  it("posisi di dalam zona tidak diubah", () => {
    const [x, z] = clampFreeBall(0.4, -0.9);
    expect(x).toBe(0.4);
    expect(z).toBe(-0.9);
  });

  it("tarikan melewati garis batas dijepit dengan SELURUH bola di dalam zona", () => {
    const [, z] = clampFreeBall(0.4, -2.0);
    expect(z).toBe(KITCHEN_Z0 + BALL_R);
  });

  it("tidak pernah menembus bantalan: tepi dikurangi radius bola", () => {
    const [xLo] = clampFreeBall(-9, -0.9);
    const [xHi] = clampFreeBall(9, -0.9);
    const [, zHi] = clampFreeBall(0.4, 9);
    expect(xLo).toBe(FELT.x0 + BALL_R);
    expect(xHi).toBe(FELT.x1 - BALL_R);
    expect(zHi).toBe(FELT.z1 - BALL_R);
  });
});
