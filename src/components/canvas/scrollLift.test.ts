/**
 * Matematika lift scroll — diuji tanpa WebGL.
 *
 * Tiga sifat yang dijaga, urut dari yang paling mahal kalau rusak:
 *
 *  1. Y kamera tidak pernah turun di bawah LIFT_MIN_CAM_Y. Ini penjamin void
 *     tidak terlihat. Kamera di bawah lantai memperlihatkan kolong scene, dan
 *     backface culling membuat tembok/lantai tembus pandang dari sisi itu.
 *  2. Progres 0 = pose persis seperti tanpa lift. Pengunjung yang tidak
 *     menggulir tidak boleh melihat perubahan sepiksel pun dari framing VIEWS
 *     yang diambil manual di Blender.
 *  3. applyLift HANYA menyentuh Y kamera. Titik pandang dikelola pemanggil dan
 *     sengaja dibiarkan terkunci (pilihan Keano, 21 Agu) — kalau fungsi ini
 *     mulai menyentuh sumbu lain atau menerima aim lagi, desainnya berubah
 *     diam-diam.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import {
  applyLift,
  liftDrop01,
  LIFT_DROP_MAX,
  LIFT_MIN_CAM_Y,
} from "./scrollLift";

/** Y pose Office dari VIEWS — angka nyata, bukan karangan. */
const CAM_Y = 1.13;

const lifted = (p: number, camY = CAM_Y) => {
  const cam = new Vector3(-3.97, camY, 2.48);
  applyLift(cam, p);
  return cam;
};

describe("applyLift", () => {
  it("progres 0 = pose apa adanya", () => {
    expect(lifted(0).y).toBe(CAM_Y);
  });

  it("hanya menyentuh Y — X/Z tidak berubah", () => {
    const cam = lifted(0.7);
    expect(cam.x).toBe(-3.97);
    expect(cam.z).toBe(2.48);
  });

  it("Y tidak pernah di bawah LIFT_MIN_CAM_Y — penjamin void", () => {
    // Sapu progres rapat + semua Y pose ruangan di VIEWS (1,13–1,60), plus
    // satu pose rendah imajiner yang memaksa jepitannya bekerja.
    for (const camY of [1.13, 1.37, 1.6, LIFT_MIN_CAM_Y + 0.1]) {
      for (let i = 0; i <= 100; i++) {
        expect(lifted(i / 100, camY).y).toBeGreaterThanOrEqual(
          LIFT_MIN_CAM_Y - 1e-9,
        );
      }
    }
  });

  it("turun monoton — tidak ada pantulan di tengah kurva", () => {
    let prev = Infinity;
    for (let i = 0; i <= 100; i++) {
      const y = lifted(i / 100).y;
      expect(y).toBeLessThanOrEqual(prev + 1e-9);
      prev = y;
    }
  });

  it("progres penuh turun tepat LIFT_DROP_MAX — dangkal, jauh dari lantai", () => {
    expect(lifted(1).y).toBeCloseTo(CAM_Y - LIFT_DROP_MAX, 9);
    // Kedalamannya sendiri harus menyisakan ruang di atas jepitan untuk pose
    // terendah di VIEWS (1,13) — kalau tweak LIFT_DROP_MAX melanggar ini,
    // jepitan mulai memotong kurva dan laju turun antar ruangan tak seragam.
    expect(CAM_Y - LIFT_DROP_MAX).toBeGreaterThan(LIFT_MIN_CAM_Y);
  });

  it("pose yang sudah di bawah MIN tidak didorong lebih rendah", () => {
    const cam = lifted(1, LIFT_MIN_CAM_Y - 0.1);
    expect(cam.y).toBeCloseTo(LIFT_MIN_CAM_Y - 0.1, 9);
  });
});

describe("liftDrop01", () => {
  it("terjepit 0…1 termasuk di luar rentang progres", () => {
    for (const p of [-1, 0, 0.5, 1, 2]) {
      expect(liftDrop01(p)).toBeGreaterThanOrEqual(0);
      expect(liftDrop01(p)).toBeLessThanOrEqual(1);
    }
  });

  it("landai di kedua ujung, penuh tepat di progres 1", () => {
    expect(liftDrop01(0)).toBe(0);
    expect(liftDrop01(1)).toBe(1);
    // Turunan smoothstep nol di ujung: langkah awal & akhir jauh lebih kecil
    // dari langkah tengah — itu yang membuat mulai/berhenti tanpa sentakan.
    expect(liftDrop01(0.05)).toBeLessThan(0.05);
    expect(1 - liftDrop01(0.95)).toBeLessThan(0.05);
  });
});
