"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { Vector3 } from "three";
import { createCannonField } from "./cannonWorld";
import { generateBodies, type FieldParams } from "../shared/fieldConfig";

/**
 * CannonField — isi 3D dari lab: objek melayang bersimulasi cannon-es.
 *
 * Mesh disinkron ke body cannon setiap frame (posisi + rotasi). Pointer
 * diproyeksikan ke bidang z=0 lalu jadi sumber gaya tolak, meniru interaksi
 * "nodes flee" di NetworkField tapi dalam 3D.
 *
 * Guardrail hidup/mati dikelola induk (LabApp): saat `paused` true — off-screen,
 * tab hidden, atau reduced-motion — useFrame tidak melangkahkan world.
 */
export interface CannonFieldProps {
  params: FieldParams;
  paused: boolean;
}

export default function CannonField({ params, paused }: CannonFieldProps) {
  const groupRef = useRef<Group>(null);
  const meshRefs = useRef<Mesh[]>([]);
  const { camera, pointer } = useThree();

  // World dibuat ulang hanya ketika parameter berubah — bukan tiap render.
  const { field, specs } = useMemo(() => {
    const s = generateBodies(params);
    return { field: createCannonField(s, params), specs: s };
  }, [params]);

  // Vektor kerja dialokasikan sekali, dipakai ulang tiap frame (hindari GC).
  const ray = useRef(new Vector3());
  const origin = useRef(new Vector3());

  useFrame((_, dt) => {
    if (paused) return;

    // Pointer NDC → titik pada bidang z=0 (tempat mayoritas objek berada).
    // unproject memberi titik di ruang dunia pada NDC.z yang dipilih; arah ray =
    // titik itu dikurangi posisi kamera, lalu cari t saat komponen z menyentuh 0.
    const ndcActive = pointer.x !== 0 || pointer.y !== 0;
    if (ndcActive) {
      origin.current.copy(camera.position);
      ray.current.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(origin.current);
      if (Math.abs(ray.current.z) > 1e-4) {
        const t = -origin.current.z / ray.current.z;
        if (t > 0) {
          field.repelFrom(
            origin.current.x + ray.current.x * t,
            origin.current.y + ray.current.y * t,
            0,
          );
        }
      }
    }

    field.step(Math.min(dt, 0.1));

    // Sinkronkan mesh ke body.
    for (let i = 0; i < field.bodies.length; i++) {
      const mesh = meshRefs.current[i];
      const body = field.bodies[i];
      if (!mesh) continue;
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(
        body.quaternion.x,
        body.quaternion.y,
        body.quaternion.z,
        body.quaternion.w,
      );
    }
  });

  return (
    <group ref={groupRef}>
      {specs.map((s, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) meshRefs.current[i] = m;
          }}
          position={s.position}
        >
          {s.shape === "sphere" ? (
            <sphereGeometry args={[s.size, 24, 24]} />
          ) : (
            <boxGeometry args={[s.size * 2, s.size * 2, s.size * 2]} />
          )}
          <meshStandardMaterial color={s.color} roughness={0.35} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}
