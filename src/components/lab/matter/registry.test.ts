import { describe, it, expect } from "vitest";
import Matter from "matter-js";
import { SCENES, sceneById } from "./registry";
import { PALETTE, type SceneCtx } from "./sceneKit";

/** Konteks tiruan: engine Matter asli (headless, tanpa Render) + ukuran tetap. */
function makeCtx(): SceneCtx {
  return {
    M: Matter,
    engine: Matter.Engine.create(),
    width: 1200,
    height: 800,
    palette: PALETTE,
  };
}

describe("SCENES registry", () => {
  it("berisi tepat 10 scene", () => {
    expect(SCENES).toHaveLength(10);
  });

  it("setiap scene punya id unik", () => {
    const ids = SCENES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("setiap scene punya label & hint non-kosong", () => {
    for (const s of SCENES) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.hint.length).toBeGreaterThan(0);
    }
  });

  it("sceneById mengembalikan scene yang cocok", () => {
    expect(sceneById("zero-gravity").id).toBe("zero-gravity");
  });

  it("sceneById fallback ke scene pertama untuk id tak dikenal", () => {
    expect(sceneById("tidak-ada").id).toBe(SCENES[0].id);
  });
});

describe("scene.build()", () => {
  it("tiap scene membangun objek tanpa throw dan menghasilkan minimal 1 objek", () => {
    for (const s of SCENES) {
      const ctx = makeCtx();
      const objects = s.build(ctx);
      expect(Array.isArray(objects)).toBe(true);
      expect(objects.length).toBeGreaterThan(0);
    }
  });

  it("objek scene bisa ditambahkan ke world Matter tanpa error", () => {
    for (const s of SCENES) {
      const ctx = makeCtx();
      const objects = s.build(ctx);
      expect(() =>
        Matter.Composite.add(ctx.engine.world, objects as Matter.Body[]),
      ).not.toThrow();
      // World harus benar-benar terisi.
      expect(Matter.Composite.allBodies(ctx.engine.world).length).toBeGreaterThan(0);
    }
  });

  it("scene zero-gravity menyetel gravityY = 0", () => {
    expect(sceneById("zero-gravity").gravityY).toBe(0);
  });
});
