import { describe, it, expect } from "vitest";
import { beltX, motionIntensity } from "./servicesBelt";

const SLOT = 3.6;
const COUNT = 9;
const L = SLOT * COUNT;

describe("beltX", () => {
  it("selalu jatuh di [-L/2, L/2) untuk offset apa pun, termasuk negatif dan jauh", () => {
    for (const offset of [0, 0.1, SLOT, L - 0.001, L, L * 7.3, -0.1, -L * 2.5]) {
      for (let i = 0; i < COUNT; i++) {
        const x = beltX(i, SLOT, COUNT, offset);
        expect(x).toBeGreaterThanOrEqual(-L / 2);
        expect(x).toBeLessThan(L / 2);
      }
    }
  });

  it("periodik: offset + L menghasilkan posisi identik (inti 'tak berujung')", () => {
    for (let i = 0; i < COUNT; i++) {
      expect(beltX(i, SLOT, COUNT, 123.456 + L)).toBeCloseTo(
        beltX(i, SLOT, COUNT, 123.456),
        10,
      );
    }
  });

  it("menjaga jarak antar item: tetangga selalu berjarak SLOT (mod L)", () => {
    const offset = 42.7;
    for (let i = 0; i < COUNT; i++) {
      const a = beltX(i, SLOT, COUNT, offset);
      const b = beltX((i + 1) % COUNT, SLOT, COUNT, offset);
      // Selisihnya SLOT persis, kecuali tepat di sambungan wrap (selisih L - SLOT).
      const gap = ((b - a) % L + L) % L;
      expect(gap).toBeCloseTo(SLOT, 10);
    }
  });

  it("offset naik menggeser item ke kiri (arah baca)", () => {
    const before = beltX(4, SLOT, COUNT, 0);
    const after = beltX(4, SLOT, COUNT, 1);
    expect(after).toBeCloseTo(before - 1, 10);
  });
});

describe("motionIntensity", () => {
  it("0 saat diam, menjepit ke 1 di atas velFull, simetris terhadap arah", () => {
    expect(motionIntensity(0, 6)).toBe(0);
    expect(motionIntensity(3, 6)).toBeCloseTo(0.5, 10);
    expect(motionIntensity(60, 6)).toBe(1);
    expect(motionIntensity(-60, 6)).toBe(1);
  });

  it("velFull tak sah (0 / negatif) tidak membagi nol — jatuh ke 0", () => {
    expect(motionIntensity(5, 0)).toBe(0);
    expect(motionIntensity(5, -1)).toBe(0);
  });
});
