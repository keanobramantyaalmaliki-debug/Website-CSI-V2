"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial, Object3D } from "three";
import { BALL_R } from "./table";

const BALLS_URL = "/3d/models/billiard_balls.glb";

/** Aset Sketchfab berdiameter 37,8632 satuan; bola standar 57 mm. */
const BALL_SCALE = (BALL_R * 2) / 37.8632;

/**
 * Nama node bola. Index 0 = bola putih ("Ball Clube" di file — cue ball).
 *
 * ⚠️ GLTFLoader menjalankan PropertyBinding.sanitizeNodeName() saat memuat,
 * sehingga SPASI berubah jadi garis bawah: "Ball Clube" → "Ball_Clube".
 * Mencocokkan nama mentah dari file membuat bola putih tidak pernah ketemu
 * (dan stik ikut hilang, karena posisinya mengacu ke bola putih).
 */
const BALL_NAMES = [
  "Ball Clube",
  ...Array.from({ length: 15 }, (_, i) => `Ball${i + 1}`),
];

/** Samakan bentuk nama supaya kebal terhadap sanitasi GLTFLoader. */
const norm = (s: string) => s.replace(/[\s._-]+/g, "").toLowerCase();

export const CUE = 0;

/**
 * Mesh 16 bola — MURNI VISUAL.
 *
 * Fisikanya dipegang cannon-es (lihat `physics.ts`); komponen ini hanya
 * menyediakan objek three yang posisinya disalin dari body tiap frame oleh
 * `BilliardGame`. Pemisahan ini disengaja: mesh bola dari Sketchfab punya
 * rantai transform sendiri, dan membiarkannya jadi anak rigid body pernah
 * membuat skala/rotasi bertumpuk.
 */
export function useBallMeshes(): (Mesh | null)[] {
  const { scene } = useGLTF(BALLS_URL);

  return useMemo(() => {
    const byName = new Map<string, Mesh>();
    scene.traverse((o: Object3D) => {
      if (!(o instanceof Mesh)) return;
      // Node induk menyimpan nama bolanya ("Ball1"), mesh anaknya bernama
      // "Ball1_01 - Default_0" — cocokkan lewat induk supaya tidak rapuh.
      const key = norm(o.parent?.name ?? o.name);
      if (!byName.has(key)) byName.set(key, o);
    });

    return BALL_NAMES.map((name) => {
      const src = byName.get(norm(name));
      if (!src) return null;

      const mesh = src.clone();
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.setScalar(BALL_SCALE);

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mesh.material = mats.map((m) => {
        const mat = (m as MeshStandardMaterial).clone();
        // Aset datang dengan metalness 0,4 — bola billiard itu resin, bukan
        // logam. Dibiarkan begitu, bola memantulkan environment map dan
        // terlihat seperti bola besi.
        mat.metalness = 0.02;
        mat.roughness = 0.28;
        // Ambang bloom scene = 0.95. envMap terlalu kuat bikin sorotan di
        // bola melewati ambang itu dan bolanya berpendar seperti lampu.
        mat.envMapIntensity = 0.55;
        // Bola itu benda pejal; muka belakang tidak perlu digambar.
        mat.side = 0;
        return mat;
      })[0];

      return mesh;
    });
  }, [scene]);
}

useGLTF.preload(BALLS_URL);
