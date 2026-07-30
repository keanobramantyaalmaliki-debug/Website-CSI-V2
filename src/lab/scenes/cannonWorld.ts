/**
 * cannonWorld — dunia physics melayang untuk CannonField (/lab).
 *
 * Meniru pola billiard/physics.ts: konstanta di satu tempat, world dibuat sekali,
 * di-step di useFrame. Bedanya ini dekoratif — bukan gameplay — jadi koefisien
 * dipilih untuk "rasa tenang", bukan akurasi meja billiard.
 *
 * Ruang tertutup 6 dinding statis (box tebal, bukan Plane: Plane cannon-es tak
 * berhingga & lebih gampang bikin body lolos di sudut). Objek melayang dengan
 * gravitasi lemah + damping tinggi supaya gerak lambat dan settle, tidak liar.
 */
import * as CANNON from "cannon-es";
import { BOUNDS, type BodySpec, type FieldParams } from "../shared/fieldConfig";

export interface CannonField {
  world: CANNON.World;
  /** Body dinamis, urutannya sama dengan `specs` yang dipakai membuatnya. */
  bodies: CANNON.Body[];
  /** Majukan simulasi `dt` detik nyata (di-clamp di pemanggil). */
  step: (dt: number) => void;
  /** Terapkan dorongan menjauh dari titik pointer (koordinat dunia x,y,z). */
  repelFrom: (x: number, y: number, z: number) => void;
}

const WALL_T = 0.5; // setengah tebal dinding (meter) — tebal biar tak tertembus
const REPEL_RADIUS = 1.6; // jangkauan pengaruh pointer (meter)
const REPEL_STRENGTH = 14; // puncak impuls saat pointer tepat di objek

const material = new CANNON.Material("body");

/** Tambah satu dinding box statis. */
function addWall(
  world: CANNON.World,
  half: [number, number, number],
  pos: [number, number, number],
) {
  const body = new CANNON.Body({ mass: 0, material });
  body.addShape(new CANNON.Box(new CANNON.Vec3(half[0], half[1], half[2])));
  body.position.set(pos[0], pos[1], pos[2]);
  world.addBody(body);
}

/** Bangun dunia + body dinamis dari daftar spec. */
export function createCannonField(
  specs: BodySpec[],
  params: FieldParams,
): CannonField {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, params.gravityY, 0),
  });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;

  // Sedikit memantul, gesekan rendah — objek meluncur lembut, tidak lengket.
  world.addContactMaterial(
    new CANNON.ContactMaterial(material, material, {
      friction: 0.1,
      restitution: 0.4,
    }),
  );

  // 6 dinding: ±x, ±y, ±z. Diletakkan tepat di luar bounds sejauh WALL_T.
  const { x, y, z } = BOUNDS;
  addWall(world, [WALL_T, y + WALL_T, z + WALL_T], [x + WALL_T, 0, 0]);
  addWall(world, [WALL_T, y + WALL_T, z + WALL_T], [-(x + WALL_T), 0, 0]);
  addWall(world, [x + WALL_T, WALL_T, z + WALL_T], [0, y + WALL_T, 0]);
  addWall(world, [x + WALL_T, WALL_T, z + WALL_T], [0, -(y + WALL_T), 0]);
  addWall(world, [x + WALL_T, y + WALL_T, WALL_T], [0, 0, z + WALL_T]);
  addWall(world, [x + WALL_T, y + WALL_T, WALL_T], [0, 0, -(z + WALL_T)]);

  const bodies = specs.map((s) => {
    const shape =
      s.shape === "sphere"
        ? new CANNON.Sphere(s.size)
        : new CANNON.Box(new CANNON.Vec3(s.size, s.size, s.size));
    const body = new CANNON.Body({
      mass: 1,
      shape,
      material,
      position: new CANNON.Vec3(...s.position),
    });
    // Damping tinggi = gerak melambat sendiri, kesan "melayang di zat kental".
    body.linearDamping = 0.4;
    body.angularDamping = 0.4;
    // Dorongan awal pelan supaya adegan hidup sejak frame pertama.
    body.velocity.set(
      (s.position[0] / x) * 0.3,
      (s.position[1] / y) * 0.3,
      (s.position[2] / z) * 0.3,
    );
    body.allowSleep = true;
    body.sleepSpeedLimit = 0.08;
    body.sleepTimeLimit = 1;
    world.addBody(body);
    return body;
  });

  const tmp = new CANNON.Vec3();

  return {
    world,
    bodies,
    // Langkah tetap 1/120 s, maks 4 substep — cukup halus untuk objek lambat,
    // jauh lebih murah dari 1/180 s billiard karena kecepatan di sini rendah.
    step: (dt: number) => world.step(1 / 120, dt, 4),
    repelFrom: (px: number, py: number, pz: number) => {
      for (const b of bodies) {
        const dx = b.position.x - px;
        const dy = b.position.y - py;
        const dz = b.position.z - pz;
        const dist = Math.hypot(dx, dy, dz);
        if (dist >= REPEL_RADIUS || dist < 1e-4) continue;
        const falloff = (1 - dist / REPEL_RADIUS) ** 2;
        const mag = (REPEL_STRENGTH * falloff) / dist;
        tmp.set(dx * mag, dy * mag, dz * mag);
        b.wakeUp();
        b.applyImpulse(tmp, b.position);
      }
    },
  };
}
