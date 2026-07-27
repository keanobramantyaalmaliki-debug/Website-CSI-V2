"use client";

import { useMemo, useLayoutEffect } from "react";
import { useGLTF, Bvh } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import type * as THREE from "three";
import { Mesh, MeshStandardMaterial, Light } from "three";

const MODEL_URL = "/3d/models/office.glb";

/**
 * Kuat pencahayaan baked. 1 = sesuai hasil bake di Blender.
 *
 * ⚠️ Ini SATU-SATUNYA sumber cahaya scene — GLB tidak punya lampu realtime
 * sama sekali. Set 0 = ruangan gelap total, hanya menyisakan ambient 0.12 +
 * environment 0.18 dari Scene.tsx. Berguna untuk membuktikan lightmap bekerja;
 * kembalikan ke 1 untuk tampilan normal.
 */
const LIGHTMAP_INTENSITY = 1;

/**
 * Kantor Cogniti — hasil bake lightmap (lihat Documentations.md §4g).
 *
 * GLB ini punya NOL lampu realtime: semua cahaya + bayangan sudah dipanggang
 * ke lightmap. Itu yang bikin 50-60 FPS. Jangan tambah lampu scene-wide di sini
 * — kalau butuh nyinari objek dinamis (karakter), pakai CharacterLights.tsx
 * yang memakai layers supaya tidak menyentuh 291 objek statis ini.
 *
 * Tiga fix-up di bawah wajib ada; semuanya hasil debugging panjang dan kalau
 * meleset visualnya rusak dengan cara yang tidak kelihatan jelas.
 */
export default function Office() {
  const { scene } = useGLTF(MODEL_URL);
  const sceneEnv = useThree((s) => s.scene.environment);

  // Traverse sekali saja — useGLTF nge-cache scene-nya, jadi tanpa useMemo
  // fix-up ini akan jalan ulang tiap render.
  const prepared = useMemo(() => {
    let lightmaps = 0;
    let keptAO = 0;
    let missingUV1 = 0;
    let emissives = 0;

    scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof Light) {
        // Praktis tidak ada (export_lights=False), tapi jaga-jaga kalau
        // nanti ada yang lolos: redam & jangan sampai bikin shadow pass.
        obj.intensity = Math.min(obj.intensity, 2);
        obj.castShadow = false;
        return;
      }

      if (!(obj instanceof Mesh)) return;

      // Bayangan sudah di lightmap — shadow realtime cuma buang FPS.
      obj.castShadow = false;
      obj.receiveShadow = false;

      const materials: THREE.Material[] = Array.isArray(obj.material)
        ? obj.material
        : [obj.material];

      for (const mat of materials) {
        if (!(mat instanceof MeshStandardMaterial)) continue;

        // ── FIX 1: lightmap diselundupkan lewat slot occlusion glTF ──────────
        // glTF tidak punya slot lightmap resmi, jadi saat export lightmap
        // ditaruh di occlusionTexture → three membacanya sebagai aoMap.
        // Kalau dibiarkan sebagai aoMap, teksturnya MENGGELAPKAN, bukan
        // menerangi.
        //
        // Pembeda yang ANDAL: lightmap kita di-export dengan texCoord=1 (UV2).
        // AO asli bawaan aset (lamp_01, Oven, ASSET_MAT_MR) ada di channel 0/3
        // — itu HARUS dibiarkan, kalau ikut dikonversi objeknya salah nyala.
        // Nama texture tidak bisa dipakai sebagai pembeda: glTF hasil export
        // Blender tidak menyimpan texture.name sama sekali.
        const ao = mat.aoMap;
        if (ao && ao.channel === 1 && !mat.lightMap) {
          mat.lightMap = ao;
          mat.lightMap.channel = 1;
          mat.aoMap = null;

          // lightMap butuh atribut 'uv1'. Kalau GLB menaruhnya di channel lain,
          // salin — tanpa ini lightmap tidak tergambar sama sekali.
          const geo = obj.geometry as THREE.BufferGeometry;
          if (!geo.attributes.uv1) {
            const src =
              geo.attributes.uv2 ?? geo.attributes.uv3 ?? geo.attributes.uv;
            if (src) geo.setAttribute("uv1", src);
          }
          mat.needsUpdate = true;
        }

        if (mat.aoMap) keptAO++;
        if (mat.lightMap) {
          lightmaps++;
          mat.lightMapIntensity = LIGHTMAP_INTENSITY;
          if (!(obj.geometry as THREE.BufferGeometry).attributes.uv1) {
            missingUV1++;
          }
        }

        // ── FIX 2: JANGAN clamp emissiveIntensity ────────────────────────────
        // GLB membawa KHR_materials_emissive_strength dari Blender
        // (bohlam 12, LED strip 8, track light 8). Versi viewer lama punya
        // Math.max(intensity, 2.0) yang justru MENURUNKAN nilai itu jadi 2.0
        // sehingga lampu terlihat redup/mati. Pakai nilai aslinya apa adanya.
        const e = mat.emissive;
        if (e && e.r + e.g + e.b > 0.01) {
          emissives++;
          // Tanpa ini pendar lampu ikut diredam ACES saat exposure rendah.
          mat.toneMapped = false;
        }
      }
    });

    if (process.env.NODE_ENV === "development") {
      // Angka acuan dari GLB per 27 Jul: 40 lightmap, 22 AO asli, 0 tanpa uv1.
      // Kalau menyimpang jauh, fix-up di atas gagal — cek dulu sebelum
      // menyalahkan setelan lighting.
      console.log(
        `[office] lightmap=${lightmaps} aoAsliDijaga=${keptAO} ` +
          `tanpaUV1=${missingUV1} emissive=${emissives}`,
      );
    }

    return scene;
  }, [scene]);

  // GLB selesai dimuat SETELAH SceneEnvironment mount, jadi material di sini
  // punya shader yang dikompilasi tanpa envMap. Tanpa needsUpdate, permukaan
  // glossy (lantai ubin, chrome) kehilangan refleksi — terukur 0.60× lebih
  // gelap dari viewer acuan.
  useLayoutEffect(() => {
    if (!sceneEnv) return;
    prepared.traverse((o: THREE.Object3D) => {
      if (!(o instanceof Mesh)) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m instanceof MeshStandardMaterial) m.needsUpdate = true;
      }
    });
  }, [prepared, sceneEnv]);

  // Bvh mempercepat raycast di 291 objek — dipakai nanti untuk klik pintu (B2).
  return (
    <Bvh firstHitOnly>
      <primitive object={prepared} />
    </Bvh>
  );
}

useGLTF.preload(MODEL_URL);
