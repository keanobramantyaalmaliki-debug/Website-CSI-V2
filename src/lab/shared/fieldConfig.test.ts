import { describe, it, expect } from "vitest";
import {
  clamp,
  normalizeParams,
  generateBodies,
  BOUNDS,
  MIN_COUNT,
  MAX_COUNT,
  MIN_GRAVITY,
  MAX_GRAVITY,
  DEFAULT_PARAMS,
} from "./fieldConfig";

describe("clamp", () => {
  it("keeps values inside range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it("returns min for NaN", () => {
    expect(clamp(Number.NaN, 2, 8)).toBe(2);
  });
});

describe("normalizeParams", () => {
  it("clamps count into [MIN_COUNT, MAX_COUNT] and rounds it", () => {
    expect(normalizeParams({ count: 1000 }).count).toBe(MAX_COUNT);
    expect(normalizeParams({ count: 0 }).count).toBe(MIN_COUNT);
    expect(normalizeParams({ count: 25.7 }).count).toBe(26);
  });

  it("clamps gravity into [MIN_GRAVITY, MAX_GRAVITY]", () => {
    expect(normalizeParams({ gravityY: 5 }).gravityY).toBe(MAX_GRAVITY);
    expect(normalizeParams({ gravityY: -999 }).gravityY).toBe(MIN_GRAVITY);
  });

  it("falls back to defaults when fields are missing", () => {
    const p = normalizeParams({});
    expect(p.count).toBe(DEFAULT_PARAMS.count);
    expect(p.gravityY).toBe(DEFAULT_PARAMS.gravityY);
  });

  it("coerces seed to an unsigned 32-bit int", () => {
    expect(normalizeParams({ seed: -1 }).seed).toBe(0xffffffff);
  });
});

describe("generateBodies", () => {
  it("produces exactly `count` bodies", () => {
    const bodies = generateBodies({ count: 30, gravityY: -1, seed: 3 });
    expect(bodies).toHaveLength(30);
  });

  it("is deterministic for a given seed", () => {
    const a = generateBodies({ count: 20, gravityY: -1, seed: 42 });
    const b = generateBodies({ count: 20, gravityY: -1, seed: 42 });
    expect(a).toEqual(b);
  });

  it("differs across seeds", () => {
    const a = generateBodies({ count: 20, gravityY: -1, seed: 1 });
    const b = generateBodies({ count: 20, gravityY: -1, seed: 2 });
    expect(a).not.toEqual(b);
  });

  it("keeps every body inside the bounds", () => {
    const bodies = generateBodies({ count: MAX_COUNT, gravityY: -1, seed: 9 });
    for (const b of bodies) {
      const [x, y, z] = b.position;
      expect(Math.abs(x)).toBeLessThanOrEqual(BOUNDS.x);
      expect(Math.abs(y)).toBeLessThanOrEqual(BOUNDS.y);
      expect(Math.abs(z)).toBeLessThanOrEqual(BOUNDS.z);
    }
  });

  it("respects the clamped count when given an out-of-range value", () => {
    expect(generateBodies({ count: 5000, gravityY: -1, seed: 1 })).toHaveLength(
      MAX_COUNT,
    );
  });
});
