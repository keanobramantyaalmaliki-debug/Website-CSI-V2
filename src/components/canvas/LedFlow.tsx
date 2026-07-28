"use client";

import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { Mesh, MeshStandardMaterial } from "three";

const MODEL_URL = "/export-test/office-mvp1-baked.glb";

// Material LED lantai (diverifikasi dari GLB). emissiveStrength asli = 8.
const LED_MATERIAL = "M_LEDStrip";

/**
 * Membuat LED strip lantai "mengalir" — hero visual ruang Office.
 *
 * Aturan render (CLAUDE.md) melarang menambah lampu / mengubah angka bloom &
 * emissive dasar. Jadi kita TIDAK menyentuh emissiveIntensity/strength; kita
 * hanya menambah GELOMBANG KECERAHAN yang bergerak sepanjang strip lewat
 * onBeforeCompile — cahaya baseline tetap, tapi ada riak terang mengalir.
 *
 * Gelombang berbasis posisi WORLD (bukan UV) supaya konsisten menyambung antar
 * segmen mesh yang berbagi material ini. Amplitudo kecil (±18%) supaya terasa
 * "hidup" tanpa berkedip norak.
 */

const AMP = 0.18; // amplitudo riak (fraksi dari kecerahan dasar)
const SPEED = 1.4; // kecepatan aliran
const FREQ = 0.35; // kerapatan gelombang per meter world

export default function LedFlow() {
  const { scene } = useGLTF(MODEL_URL);
  const time = useRef({ value: 0 });

  useEffect(() => {
    const patched: MeshStandardMaterial[] = [];

    scene.traverse((obj: THREE.Object3D) => {
      if (!(obj instanceof Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!(mat instanceof MeshStandardMaterial)) continue;
        if (mat.name !== LED_MATERIAL) continue;
        if (mat.userData._ledFlow) continue; // sudah dipatch (material di-share)

        mat.userData._ledFlow = true;
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = time.current;
          shader.uniforms.uAmp = { value: AMP };
          shader.uniforms.uSpeed = { value: SPEED };
          shader.uniforms.uFreq = { value: FREQ };

          // Sediakan posisi world ke fragment shader.
          shader.vertexShader = shader.vertexShader
            .replace(
              "#include <common>",
              "#include <common>\nvarying vec3 vWorldPos;",
            )
            .replace(
              "#include <worldpos_vertex>",
              "#include <worldpos_vertex>\n  vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
            );

          shader.fragmentShader = shader.fragmentShader
            .replace(
              "#include <common>",
              [
                "#include <common>",
                "varying vec3 vWorldPos;",
                "uniform float uTime;",
                "uniform float uAmp;",
                "uniform float uSpeed;",
                "uniform float uFreq;",
              ].join("\n"),
            )
            // Modulasi emissive TEPAT sebelum dipakai — kalikan dengan riak.
            .replace(
              "#include <emissivemap_fragment>",
              [
                "#include <emissivemap_fragment>",
                "float ledWave = sin((vWorldPos.x + vWorldPos.z) * uFreq - uTime * uSpeed);",
                "totalEmissiveRadiance *= 1.0 + uAmp * ledWave;",
              ].join("\n"),
            );
        };
        mat.needsUpdate = true;
        patched.push(mat);
      }
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`[led] strip dipatch flow: ${patched.length} material`);
    }

    return () => {
      for (const mat of patched) {
        mat.onBeforeCompile = () => {};
        delete mat.userData._ledFlow;
        mat.needsUpdate = true;
      }
    };
  }, [scene]);

  useFrame((_, delta) => {
    time.current.value += delta;
  });

  return null;
}
