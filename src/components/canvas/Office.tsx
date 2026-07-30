"use client";

import { useMemo, useLayoutEffect, useEffect, useRef } from "react";
import { useGLTF, useAnimations, Bvh } from "@react-three/drei";
import { useThree, useFrame, type ThreeEvent } from "@react-three/fiber";
import type * as THREE from "three";
import { Mesh, SkinnedMesh, MeshStandardMaterial, Light, LoopRepeat } from "three";
import { useSceneStore } from "@/lib/store/sceneStore";
import { billiardView } from "./CameraController";
import { prepareLampFade } from "./billiard/lamps";
import { CHAR_LAYER } from "./CharacterLights";

// GLB baked ada di public/ dan ter-track git (9 MB). Jangan kembalikan ke
// /export-test/… — path itu mengandalkan symlink dev-only yang tidak pernah ada
// di repo, jadi hasilnya 404 dan scene mentok di loader selamanya.
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
  const { scene, animations } = useGLTF(MODEL_URL);
  const sceneEnv = useThree((s) => s.scene.environment);

  // Mixer dipasang di root GLB, bukan per-karakter: kelima klip menarget node
  // rig-nya masing-masing (sudah dicek tidak ada bone yang dipakai dua klip),
  // jadi satu mixer cukup dan tidak ada yang saling menimpa.
  const { actions } = useAnimations(animations, scene);

  // Traverse sekali saja — useGLTF nge-cache scene-nya, jadi tanpa useMemo
  // fix-up ini akan jalan ulang tiap render.
  const prepared = useMemo(() => {
    let lightmaps = 0;
    let keptAO = 0;
    let missingUV1 = 0;
    let emissives = 0;
    let skinned = 0;
    let ledStrips = 0;

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

      // ── FIX 3: karakter jangan di-frustum-cull ───────────────────────────
      // Bounding box SkinnedMesh dihitung dari bind pose dan TIDAK ikut
      // diperbarui saat tulang bergerak. Pose duduk membawa mesh keluar dari
      // kotak itu, jadi three menganggapnya di luar layar dan karakter
      // berkedip hilang di sudut pandang tertentu. Biayanya nihil: cuma 5
      // objek yang selalu ikut dirender.
      if (obj instanceof SkinnedMesh) {
        obj.frustumCulled = false;
        // enable (bukan set): objek tetap di layer 0 supaya kamera & raycast
        // biasa tetap melihatnya, plus ikut disinari lampu CHAR_LAYER.
        obj.layers.enable(CHAR_LAYER);
        skinned++;
      }

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

        // ── FIX 4: LED strip lantai jangan ikut pass bayangan ────────────────
        // ContactShadowsRig.tsx merender scene dengan MeshDepthMaterial. LED
        // strip ada di y 0,002..0,31 — di dalam band bayangannya — jadi secara
        // hitungan ia menjatuhkan garis gelap di lantai (alpha 0,83–0,93),
        // padahal ia sumber cahaya. `allowOverride=false` membuat renderer
        // melewatinya saat overrideMaterial aktif (WebGLRenderer:
        // `material.allowOverride === true && overrideMaterial !== null`).
        //
        // ⚠️ DIBATALKAN (30 Jul) — dulu di sini ada
        // `if (mat.name === "M_LEDStrip") mat.allowOverride = false;`
        // dan itu MERUGIKAN, bukan cuma sia-sia. Dua pengukuran:
        //
        // 1. Tidak ada gunanya. Diukur A/B di titik LED yang benar-benar di
        //    dalam catcher Office: mematikan flag hanya mengubah kecerahan
        //    60,55 → 60,92 — di bawah noise. Strip-nya emissive +
        //    `toneMapped=false` + kena bloom, jadi ia menimpa bayangan tipis
        //    di bawahnya sendiri.
        // 2. Justru MENGHILANGKAN bayangan. `MG_Office_M_LEDStrip` membentang
        //    x −18,84..0,96 / z −2,94..7,13 — jauh melampaui area office, dan
        //    ia MENAUNGI lantai meeting room. Karena dikecualikan dari pass
        //    depth, lantai di bawahnya tidak dapat bayangan sama sekali; itu
        //    salah satu sebab bayangan meeting room sempat hilang total.
        //
        // Jangan dipasang ulang tanpa mengukur DUA-DUANYA: apakah garis
        // gelapnya benar-benar terlihat, DAN apa yang ikut kehilangan bayangan.
        ledStrips += mat.name === "M_LEDStrip" ? 1 : 0;
      }
    });

    if (import.meta.env.DEV) {
      // Angka acuan dari GLB per 27 Jul: 40 lightmap, 22 AO asli, 0 tanpa uv1.
      // Kalau menyimpang jauh, fix-up di atas gagal — cek dulu sebelum
      // menyalahkan setelan lighting.
      //
      // ledStrip HARUS 1. Kalau 0, nama materialnya berubah dan FIX 4 tidak
      // kena sasaran — LED strip akan menjatuhkan garis gelap di lantai.
      console.log(
        `[office] lightmap=${lightmaps} aoAsliDijaga=${keptAO} ` +
          `tanpaUV1=${missingUV1} emissive=${emissives} skinned=${skinned} ` +
          `ledStrip=${ledStrips}`,
      );
    }

    return scene;
  }, [scene]);

  // ── Jalankan idle animation tiap karakter ────────────────────────────────
  // Dua dari lima klip (SittingIdle, Person4_Static92) durasinya 0.03 detik —
  // itu pose statis 1 frame dari Blender, bukan animasi. Di-loop pun tidak ada
  // yang bergerak, jadi cukup dievaluasi sekali lalu dibekukan (paused) supaya
  // mixer tidak menghitungnya tiap frame selamanya.
  useEffect(() => {
    const started: THREE.AnimationAction[] = [];

    for (const action of Object.values(actions)) {
      if (!action) continue;
      action.reset();
      action.setLoop(LoopRepeat, Infinity);

      if (action.getClip().duration < 0.1) {
        // Pose statis: mainkan satu frame, tahan di situ.
        action.play();
        action.paused = true;
      } else {
        // Offset tiap karakter supaya idle-nya tidak serempak seperti robot.
        action.time = Math.random() * action.getClip().duration;
        action.play();
      }
      started.push(action);
    }

    return () => {
      for (const a of started) a.stop();
    };
  }, [actions]);

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

  // Klik meja billiard → masuk mode main. Node meja di GLB sudah digabung jadi
  // MG_Lounge_M_PoolTable_Body/_Felt (hasil merge draw call), jadi pengecekan
  // dilakukan pada nama node, bukan objek PT_* yang sudah tidak ada.
  const enterBilliard = useSceneStore((s) => s.enterBilliard);
  const goToView = useSceneStore((s) => s.goToView);
  const billiardActive = useSceneStore((s) => s.billiardActive);

  // ── Lampu gantung memudar saat main ─────────────────────────────────────
  // Kamera minigame melihat lurus dari atas, dan 3 lampu gantung persis
  // menutupi meja dari sudut itu. Dipudarkan berbarengan dengan gerak kamera.
  const fader = useMemo(() => prepareLampFade(prepared), [prepared]);
  const lampT = useRef(1);

  useFrame((_, dt) => {
    if (!fader) return;
    const goal = billiardActive ? 0 : 1;
    if (Math.abs(lampT.current - goal) < 0.002) return;
    // Laju disamakan dengan tween kamera 1400ms supaya lampu selesai hilang
    // tepat saat kamera sampai di atas meja.
    lampT.current += (goal - lampT.current) * Math.min(1, dt * 3.2);
    fader.set(lampT.current);
  });

  const size = useThree((s) => s.size);
  const setTableRotated = useSceneStore((s) => s.setTableRotated);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (billiardActive) return;
    let o: THREE.Object3D | null = e.object;
    while (o) {
      if (o.name.includes("PoolTable")) {
        e.stopPropagation();
        const v = billiardView(size.width / size.height);
        enterBilliard();
        setTableRotated(v.rotated);
        goToView?.(v.pos, v.tgt, v.up, v.fov);
        return;
      }
      o = o.parent;
    }
  };

  // Bvh mempercepat raycast di 291 objek — dipakai nanti untuk klik pintu (B2).
  return (
    <Bvh firstHitOnly>
      <primitive object={prepared} onClick={onClick} />
    </Bvh>
  );
}

useGLTF.preload(MODEL_URL);

