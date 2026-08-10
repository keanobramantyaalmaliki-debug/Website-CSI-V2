/**
 * Matematika parallax kursor — diuji tanpa WebGL.
 *
 * Yang dijaga di sini adalah dua sifat yang TIDAK terlihat saat mencoba
 * sendiri di layar, karena keduanya rusaknya halus:
 *
 *  1. Geserannya tegak lurus arah pandang. Kalau bocor ke arah pandang,
 *     kamera maju-mundur mengikuti mouse — bingkai ruangan ikut menyempit dan
 *     melebar, dan di ruangan yang kameranya rapat ke tembok ia bisa menembus.
 *     Cacat itu hanya kelihatan di sebagian dari lima view, jadi mudah lolos.
 *  2. Kursor di tengah = pose persis seperti tanpa parallax. Ini yang membuat
 *     posisi VIEWS yang diambil manual di Blender tetap jadi bingkai acuan.
 */
import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { AMP_X, AMP_Y, applyParallax, dampTowards, TGT_FOLLOW } from "./mouseParallax";

function rig(pos: Vector3, tgt: Vector3) {
  const cam = new PerspectiveCamera(60, 1.6, 0.05, 120);
  cam.position.copy(pos);
  cam.lookAt(tgt);
  // lookAt() cuma menyetel quaternion; matrixWorld baru ikut saat render.
  cam.updateMatrixWorld(true);
  return cam;
}

describe("applyParallax", () => {
  const base = new Vector3(-3.97, 1.13, 2.48);
  // Arah pandang sengaja miring di ketiga sumbu: geseran yang salah sumbu
  // akan lolos kalau kameranya kebetulan menghadap lurus ke salah satu sumbu.
  const tgt = new Vector3(-7.8, 0.79, 3.6);

  it("kursor di tengah = pose apa adanya", () => {
    const cam = rig(base, tgt);
    const out = new Vector3();
    applyParallax(cam, base, tgt, out, 0, 0);
    expect(cam.position.distanceTo(base)).toBeLessThan(1e-9);
    expect(out.distanceTo(tgt)).toBeLessThan(1e-9);
  });

  it("geserannya tegak lurus arah pandang — tidak ada dolly maju/mundur", () => {
    const cam = rig(base, tgt);
    const out = new Vector3();
    const dir = new Vector3().subVectors(tgt, base).normalize();

    for (const [px, py] of [[1, 1], [-1, 0.4], [0.3, -1]] as const) {
      applyParallax(cam, base, tgt, out, px, py);
      const shift = new Vector3().subVectors(cam.position, base);
      expect(Math.abs(shift.dot(dir))).toBeLessThan(1e-9);
    }
  });

  it("besar geseran mengikuti amplitudo, dan tidak lebih", () => {
    const cam = rig(base, tgt);
    const out = new Vector3();
    applyParallax(cam, base, tgt, out, 1, 1);
    const shift = cam.position.distanceTo(base);
    expect(shift).toBeCloseTo(Math.hypot(AMP_X, AMP_Y), 9);
    // Titik pandang ikut hanya sebagian — sisanya jadi rasa orbit.
    expect(out.distanceTo(tgt)).toBeCloseTo(shift * TGT_FOLLOW, 9);
  });

  it("kursor ke kanan menggeser kamera ke kanan LAYAR", () => {
    const cam = rig(base, tgt);
    const out = new Vector3();
    applyParallax(cam, base, tgt, out, 1, 0);
    // Sumbu X kamera = kanan layar; proyeksi geseran ke situ harus positif.
    const right = new Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const shift = new Vector3().subVectors(cam.position, base);
    expect(shift.dot(right)).toBeCloseTo(AMP_X, 6);
  });

  it("aman saat titik pandang berimpit dengan kamera", () => {
    const cam = rig(base, tgt);
    const out = new Vector3();
    applyParallax(cam, base, base, out, 1, 1);
    expect(Number.isFinite(cam.position.x)).toBe(true);
    expect(cam.position.distanceTo(base)).toBe(0);
  });
});

describe("dampTowards", () => {
  it("hasil setelah waktu yang sama tidak bergantung frame rate", () => {
    const step = (n: number, dt: number) => {
      let v = 0;
      for (let i = 0; i < n; i++) v = dampTowards(v, 1, 0.22, dt);
      return v;
    };
    // 1 detik ditempuh dalam 60 langkah vs 120 langkah.
    expect(step(60, 1 / 60)).toBeCloseTo(step(120, 1 / 120), 4);
  });

  it("dt besar (bangun dari frameloop 'never') langsung menyusul", () => {
    expect(dampTowards(0, 1, 0.22, 5)).toBeGreaterThan(0.999);
  });
});
