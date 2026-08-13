"use client";

import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { PMREMGenerator, Mesh, MeshStandardMaterial } from "three";
import type * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Environment map untuk refleksi material glossy (lantai ubin, chrome, kaca).
 *
 * Sengaja TIDAK pakai <Environment preset="..."> dari drei — preset itu HDR
 * outdoor yang hasilnya beda dari viewer yang sudah diverifikasi. RoomEnvironment
 * + blur 0.04 + intensity 0.18 adalah kombinasi persis dari
 * export-test/index.html.
 *
 * Intensity-nya sengaja rendah (0.18): cahaya utama datang dari lightmap,
 * environment cuma pengisi refleksi. Kalau dinaikkan, scene jadi flat karena
 * cahaya baked-nya tertimpa.
 *
 * ⚠️ 0.18 itu angka untuk KANTOR yang sudah di-bake. Canvas lain yang memuat
 * aset tanpa lightmap (mis. InquiryLaptop) tidak punya cahaya baked sama
 * sekali, jadi pada 0.18 hasilnya nyaris hitam — di sana `intensity` dinaikkan
 * lewat prop. Defaultnya sengaja tetap 0.18 supaya Scene tidak berubah.
 *
 * ⚠️ useLayoutEffect, BUKAN useEffect. Material yang shader-nya sudah
 * dikompilasi tidak otomatis memakai scene.environment yang dipasang belakangan
 * — hasilnya lantai glossy kehilangan refleksi (terukur 0.60× lebih gelap dari
 * viewer). useLayoutEffect memasang environment sebelum frame pertama, dan
 * needsUpdate di bawah memaksa rekompilasi untuk material yang sudah terlanjur
 * jadi (mis. GLB selesai dimuat setelah komponen ini mount).
 */
export default function SceneEnvironment({ intensity = 0.18 }: { intensity?: number } = {}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useLayoutEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = new RoomEnvironment();
    const target = pmrem.fromScene(env, 0.04);

    // eslint-disable-next-line react-hooks/immutability -- Three.js scene mutation required for PMREMGenerator workflow; see component docstring
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;

    // Paksa material yang sudah ada memakai environment baru.
    scene.traverse((o: THREE.Object3D) => {
      if (!(o instanceof Mesh)) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m instanceof MeshStandardMaterial) m.needsUpdate = true;
      }
    });

    return () => {
      scene.environment = null;
      target.texture.dispose();
      pmrem.dispose();
      env.dispose?.();
    };
  }, [gl, scene, intensity]);

  return null;
}
