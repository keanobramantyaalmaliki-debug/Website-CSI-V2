import { describe, it, expect } from "vitest";
import {
  mulberry32,
  generateHomePositions,
  repelForce,
  stepAxis,
  distance2,
  linkOpacity,
  driftOffset,
  type FieldVariant,
} from "./fieldMath";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  it("produces values within [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("generateHomePositions", () => {
  const variants: FieldVariant[] = ["scatter", "grid", "flow", "gather"];

  it("returns a flat array of length count*2 for every variant", () => {
    for (const v of variants) {
      const arr = generateHomePositions(v, 50, mulberry32(1));
      expect(arr).toBeInstanceOf(Float32Array);
      expect(arr.length).toBe(100);
    }
  });

  it("keeps all coordinates inside a sane [-0.1, 1.1] band", () => {
    // gather/grid can nudge slightly past edges; renderer clamps visually.
    for (const v of variants) {
      const arr = generateHomePositions(v, 200, mulberry32(3));
      for (let i = 0; i < arr.length; i++) {
        expect(arr[i]).toBeGreaterThanOrEqual(-0.1);
        expect(arr[i]).toBeLessThanOrEqual(1.1);
      }
    }
  });

  it("grid variant is more ordered than scatter (lower x-variance per row band)", () => {
    // Sanity: grid rows share y; scatter does not. Compare unique-ish y spread.
    const grid = generateHomePositions("grid", 64, mulberry32(5));
    const scatter = generateHomePositions("scatter", 64, mulberry32(5));
    const ys = (a: Float32Array) => {
      const set = new Set<number>();
      for (let i = 1; i < a.length; i += 2) set.add(Math.round(a[i] * 20));
      return set.size;
    };
    // Grid collapses onto few row bands → fewer distinct y buckets than scatter.
    expect(ys(grid)).toBeLessThan(ys(scatter));
  });

  it("is deterministic given the same seed", () => {
    const a = generateHomePositions("gather", 30, mulberry32(9));
    const b = generateHomePositions("gather", 30, mulberry32(9));
    expect(Array.from(a)).toEqual(Array.from(b));
  });
});

describe("repelForce", () => {
  it("returns zero force outside the radius", () => {
    const [fx, fy] = repelForce(0, 0, 1, 1, 0.5, 1);
    expect(fx).toBe(0);
    expect(fy).toBe(0);
  });

  it("returns zero when particle sits exactly on the pointer (no divide-by-zero)", () => {
    const [fx, fy] = repelForce(0.5, 0.5, 0.5, 0.5, 0.3, 1);
    expect(fx).toBe(0);
    expect(fy).toBe(0);
  });

  it("pushes the particle away from the pointer (sign points outward)", () => {
    // particle to the right of pointer → positive fx
    const [fx] = repelForce(0.6, 0.5, 0.5, 0.5, 0.3, 1);
    expect(fx).toBeGreaterThan(0);
    // particle above pointer (smaller y) → negative fy
    const [, fy] = repelForce(0.5, 0.4, 0.5, 0.5, 0.3, 1);
    expect(fy).toBeLessThan(0);
  });

  it("is stronger closer to the pointer (falloff decreases with distance)", () => {
    const near = repelForce(0.55, 0.5, 0.5, 0.5, 0.4, 1);
    const far = repelForce(0.85, 0.5, 0.5, 0.5, 0.4, 1);
    expect(Math.abs(near[0])).toBeGreaterThan(Math.abs(far[0]));
  });
});

describe("stepAxis", () => {
  it("relaxes toward home and settles (spring converges)", () => {
    let pos = 1;
    let vel = 0;
    const home = 0;
    for (let i = 0; i < 2000; i++) {
      const r = stepAxis(pos, vel, home, 0, 8, 0.9, 1 / 60);
      pos = r.pos;
      vel = r.vel;
    }
    expect(Math.abs(pos - home)).toBeLessThan(0.01);
    expect(Math.abs(vel)).toBeLessThan(0.01);
  });

  it("an external force displaces the resting position away from home", () => {
    // With a constant outward force, the settled position should overshoot home.
    let pos = 0;
    let vel = 0;
    for (let i = 0; i < 500; i++) {
      const r = stepAxis(pos, vel, 0, 2, 8, 1.2, 1 / 60);
      pos = r.pos;
      vel = r.vel;
    }
    expect(pos).toBeGreaterThan(0);
  });
});

describe("distance2", () => {
  it("is zero for identical points", () => {
    expect(distance2(0.3, 0.7, 0.3, 0.7)).toBe(0);
  });

  it("returns the squared euclidean distance", () => {
    // 3-4-5 triangle → squared = 25
    expect(distance2(0, 0, 3, 4)).toBe(25);
  });
});

describe("linkOpacity", () => {
  it("is 0 at or beyond the threshold", () => {
    expect(linkOpacity(1, 1)).toBe(0);
    expect(linkOpacity(2, 1)).toBe(0);
  });

  it("is 1 when points coincide", () => {
    expect(linkOpacity(0, 0.25)).toBe(1);
  });

  it("fades linearly between 0 and the threshold", () => {
    // halfway in squared space → 0.5 opacity
    expect(linkOpacity(0.125, 0.25)).toBeCloseTo(0.5, 5);
  });
});

describe("driftOffset", () => {
  it("stays within the amplitude bound on both axes", () => {
    for (let i = 0; i < 100; i++) {
      const [ox, oy] = driftOffset(i * 0.37, i * 1.1, 0.02, 0.5);
      expect(Math.abs(ox)).toBeLessThanOrEqual(0.02 + 1e-9);
      expect(Math.abs(oy)).toBeLessThanOrEqual(0.02 + 1e-9);
    }
  });

  it("is deterministic for the same inputs", () => {
    expect(driftOffset(1.5, 0.8, 0.03, 0.4)).toEqual(
      driftOffset(1.5, 0.8, 0.03, 0.4)
    );
  });

  it("actually moves over time (not static)", () => {
    const a = driftOffset(0, 0.5, 0.02, 0.5);
    const b = driftOffset(1.2, 0.5, 0.02, 0.5);
    expect(a[0]).not.toBe(b[0]);
  });
});
