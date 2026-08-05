"use client";

import { useMemo, useLayoutEffect, useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useGLTF, useAnimations, useTexture, Bvh } from "@react-three/drei";
import { useThree, useFrame, type ThreeEvent } from "@react-three/fiber";
import type * as THREE from "three";
import { Mesh, SkinnedMesh, MeshStandardMaterial, Light, LoopRepeat, SRGBColorSpace } from "three";
import { useSceneStore } from "@/lib/store/sceneStore";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import { billiardView } from "./CameraController";
import { prepareLampFade } from "./billiard/lamps";
import { prepareRevealSweep } from "./revealSweep";
import { applyScreens, SCREENS } from "./screens";
import {
  getScreenVideo,
  pauseScreenVideos,
  playScreenVideos,
} from "./screenVideo";
import { CHAR_LAYER } from "./CharacterLights";

// GLB baked ada di public/ dan ter-track git (9 MB). Jangan kembalikan ke
// /export-test/… — path itu mengandalkan symlink dev-only yang tidak pernah ada
// di repo, jadi hasilnya 404 dan scene mentok di loader selamanya.
const MODEL_URL = "/3d/models/office.glb";

/**
 * Kuat pencahayaan baked. 4 = sesuai hasil bake di Blender.
 *
 * KENAPA 4, BUKAN 1: EXR bake menyimpan cahaya HDR (hotspot lampu sampai ~36).
 * PNG/WebP 8-bit memenggal semua nilai >1.0 — itu yang bikin scene gelap pada
 * export 5 Agu pertama. Solusinya nilai lightmap DIBAGI 4 di Blender sebelum
 * export (skrip in-memory, EXR asli tidak disentuh) lalu DIKALIKAN 4 lagi di
 * sini. Hotspot 1.0–4.0 selamat; di atas 4.0 (13 dari 144 image) tetap
 * terpotong — kompromi yang diterima. Kalau angka ini diubah, ubah juga
 * pembaginya di skrip export; keduanya HARUS sama.
 *
 * ⚠️ Ini SATU-SATUNYA sumber cahaya scene — GLB tidak punya lampu realtime
 * sama sekali. Set 0 = ruangan gelap total, hanya menyisakan ambient 0.12 +
 * environment 0.18 dari Scene.tsx. Berguna untuk membuktikan lightmap bekerja.
 */
const LIGHTMAP_INTENSITY = 5;

/**
 * Emissive strength LED strip lantai (`M_LEDStrip`), menimpa nilai dari GLB.
 *
 * Blender mengekspornya 8 lewat KHR_materials_emissive_strength — paling panas
 * di scene setelah bohlam (12). Dengan `toneMapped=false` di bawah, angka itu
 * masuk ke composer apa adanya dan melewati ambang Bloom 0.95 (Scene.tsx)
 * dengan margin ~8×, jadi pendarnya jauh lebih tebal dari lampu lain.
 *
 * INI SATU-SATUNYA material yang emissive-nya ditimpa; lihat FIX 2 di bawah
 * soal kenapa clamp menyeluruh justru merusak. Ini pengecualian bertarget,
 * bukan pembatalan aturan itu.
 *
 * Turunkan angkanya untuk mengurangi bloom garis LED TANPA menyentuh
 * <Bloom intensity> yang global — bohlam & track light tetap seperti sekarang.
 * Di bawah ~1.0 strip berhenti berpendar sama sekali (jatuh di bawah ambang)
 * dan tinggal jadi garis warna biasa.
 *
 * Catatan: cahaya LED yang JATUH DI LANTAI sudah di-bake ke lightmap dan tidak
 * ikut berubah di sini — yang berubah cuma pendar strip-nya sendiri. Jadi
 * lantainya tetap kena tumpahan warnanya, tidak mendadak gelap.
 */
const LED_STRIP_EMISSIVE = 3;

/**
 * Lama sapuan "kantor terbentuk" (detik) — lihat revealSweep.ts.
 *
 * 2,6 s untuk membentang 24,25 m ≈ 9 m/detik. Terasa seperti gerakan yang punya
 * bobot, bukan kilatan. Jangan jauh lebih panjang: sapuan ini berjalan SEBELUM
 * pengunjung bisa berinteraksi, dan menahan orang di depan kantor yang belum
 * jadi lebih lama dari ~3 detik terbaca sebagai lambat, bukan sinematik.
 */
const REVEAL_MS = 2600;

/** Jeda sebelum sapuan mulai (detik), memberi satu tarikan napas setelah
 *  layar loader hilang supaya awalnya tidak bertabrakan dengan fade-out-nya. */
const REVEAL_DELAY_MS = 150;

/**
 * Gerbang pemutaran video layar. Tidak merender apa pun.
 *
 * ── Kenapa useEffect, BUKAN useFrame ────────────────────────────────────────
 * Ini titik paling mudah salah di seluruh fitur ini. `useFrame` BERHENTI TOTAL
 * saat FrameloopGate menyetel frameloop "never" — yaitu persis keadaan yang
 * ingin kita tanggapi (pengunjung scroll melewati hero). Menaruh gerbangnya di
 * useFrame berarti perintah pause-nya tidak pernah sampai, dan videonya
 * men-dekode selamanya di balik halaman yang sudah lama ditinggalkan.
 *
 * Ini kelas bug yang SUDAH pernah menggigit repo ini: engine matter-js di
 * PhysicsHeading tetap berdetak 60 fps walau efeknya sudah mati (3 Agu, "laptop
 * panas"). Pelajarannya: menggerbangi EFEK tidak sama dengan menggerbangi
 * MESIN. Elemen `<video>` adalah mesin — ia punya thread dekode sendiri dan
 * sama sekali tidak peduli pada frameloop.
 *
 * Penjaganya: screenVideo.invariant.test.ts.
 *
 * ── Kenapa komponen terpisah ────────────────────────────────────────────────
 * Supaya `Office` tidak perlu berlangganan `currentRoom`. Kalau dilanggan di
 * sana, tiap perpindahan ruangan me-render ulang komponen yang memegang scene
 * 660-node — sia-sia, karena tak satu pun output-nya berubah.
 */
function ScreenVideoGate() {
  const heroInView = useSceneStore((s) => s.heroInView);
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const billiardActive = useSceneStore((s) => s.billiardActive);
  const reduced = useReducedMotion();

  // Layar hanya benar-benar terlihat dari view Office. Di ruangan lain ia di
  // luar frustum atau sejauh beberapa piksel — men-dekode 12 fps untuk itu
  // murni pemborosan.
  const wanted = heroInView && currentRoom === "Office" && !billiardActive && !reduced;

  useEffect(() => {
    if (!wanted) {
      pauseScreenVideos();
      return;
    }
    playScreenVideos();

    // Pindah tab: browser MEMANG menurunkan prioritas timer, tapi tidak
    // menghentikan dekode video. Dipause eksplisit — dan dinyalakan lagi saat
    // kembali, karena efek ini tidak dijalankan ulang oleh perpindahan tab.
    const onVisibility = () => {
      if (document.visibilityState === "visible") playScreenVideos();
      else pauseScreenVideos();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      pauseScreenVideos();
    };
  }, [wanted]);

  return null;
}

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

  // Gambar untuk layar monitor/laptop — lihat screens.ts. useTexture ikut
  // Suspense yang sama dengan GLB, jadi teksturnya dijamin sudah ada sebelum
  // frame pertama; tidak ada kedipan layar hitam lalu berisi.
  //
  // Layar VIDEO dipisah dan TIDAK boleh lewat sini: useTexture memakai
  // TextureLoader, yang memuat url lewat <img> — diberi .mp4 ia gagal dan
  // seluruh Suspense boundary tergantung selamanya (loader tidak pernah
  // hilang). Sumbernya datang dari screenVideo.ts.
  const imageUrls = useMemo(
    () => SCREENS.filter((s) => !s.video).map((s) => s.url),
    [],
  );
  const imageTexList = useTexture(imageUrls);
  const screenTextures = useMemo(() => {
    const map: Record<string, THREE.Texture> = {};
    imageUrls.forEach((url, i) => {
      map[url] = imageTexList[i];
    });
    // Video tidak ikut Suspense — elemennya baru mulai mengunduh sekarang, dan
    // menunggunya berarti menahan SELURUH kantor demi satu layar 31 KB. Yang
    // membuat layarnya tidak tampil hitam sementara itu adalah priming frame
    // pertama di screenVideo.ts, bukan penantian di sini.
    for (const s of SCREENS) {
      if (s.video) map[s.url] = getScreenVideo(s.url, s.flipX);
    }
    return map;
  }, [imageUrls, imageTexList]);

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
          // Lightmap disimpan sRGB-encoded (presisi gradasi gelap di 8-bit),
          // tapi GLTFLoader menandai occlusionTexture sebagai linear. Tanpa
          // koreksi ini midtone-nya terangkat gamma — pucat keabu-abuan.
          mat.lightMap.colorSpace = SRGBColorSpace;
          mat.lightMap.needsUpdate = true;
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
        //
        // Satu pengecualian bertarget: M_LEDStrip diturunkan di FIX 4 di bawah.
        // Itu tidak membatalkan aturan ini — yang dilarang adalah clamp
        // MENYELURUH yang menyeret semua lampu ke satu angka.
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
        if (mat.name === "M_LEDStrip") {
          ledStrips++;
          // GLTFLoader menaruh KHR_materials_emissive_strength (8) di
          // emissiveIntensity. Diturunkan supaya pendarnya tidak setebal
          // sekarang — lihat LED_STRIP_EMISSIVE di atas.
          mat.emissiveIntensity = LED_STRIP_EMISSIVE;
        }
      }
    });

    // ── Konten layar ─────────────────────────────────────────────────────────
    // WAJIB di sini, di dalam useMemo yang sama — bukan di useEffect terpisah.
    // applyScreens() meng-CLONE material layar (lihat screens.ts), dan clone
    // itu harus sudah ada saat prepareRevealSweep() mengumpulkan material untuk
    // dipatch. Kalau dipasang belakangan, layarnya tidak ikut tersapu dan
    // tampil utuh sejak frame pertama di tengah kantor yang belum terbentuk.
    const screens = applyScreens(scene, screenTextures);

    if (import.meta.env.DEV) {
      // screens HARUS sama dengan SCREENS.length. Kalau kurang, nama node di
      // screens.ts tidak cocok dengan yang ada di GLB — layarnya akan diam
      // hitam tanpa error apa pun.
      console.log(
        `[office] layar terisi=${screens}/${SCREENS.length}`,
      );
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
  }, [scene, screenTextures]);

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

  // ── Sapuan "kantor terbentuk" ────────────────────────────────────────────
  // Dijalankan sekali saat GLB selesai dimuat. Lihat revealSweep.ts untuk
  // mekanismenya; di sini hanya pemasangan & penggeraknya.
  //
  // Dipakai useLayoutEffect, bukan useEffect: patch harus terpasang SEBELUM
  // frame pertama digambar. Dengan useEffect ada satu frame di mana kantor
  // tampil penuh sebelum sapuan mengambil alih — kedipan yang justru merusak
  // maksudnya.
  //
  // Catatan soal `needsUpdate` di efek envmap tepat di atas: ia TIDAK merusak
  // patch ini, dan urutan keduanya tidak perlu dijaga. `needsUpdate` hanya
  // memaksa three mengambil ulang program, dan pengambilan itu memanggil
  // `onBeforeCompile` lagi — yang saat itu masih menunjuk ke patch kita, jadi
  // patch-nya ikut terpasang ulang. Tiap kompilasi juga berangkat dari sumber
  // ShaderLib yang bersih, sehingga tidak ada risiko sisipan ganda.
  const sweepRef = useRef<ReturnType<typeof prepareRevealSweep>>(null);
  const revealDone = useRef(false);
  /** Waktu mulai sapuan, disetel di useFrame — lihat catatan tersendat di sana. */
  const startRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const sweep = prepareRevealSweep(prepared);
    // null = tidak ada material yang cocok. Anggap sudah selesai supaya scene
    // tampil apa adanya, bukan menggantung di kantor yang tak pernah muncul.
    if (!sweep) {
      revealDone.current = true;
      return;
    }
    sweep.set(0);
    sweepRef.current = sweep;
    revealDone.current = false;
    startRef.current = null;

    return () => {
      sweep.dispose();
      sweepRef.current = null;
    };
  }, [prepared]);

  /** Sudah mengabari store bahwa frame nyata pertama tergambar? */
  const readySent = useRef(false);

  /** performance.now() tick sebelumnya — untuk mengukur jeda antar-frame. */
  const lastTickRef = useRef<number | null>(null);

  useFrame(() => {
    const sweep = sweepRef.current;
    if (!sweep || revealDone.current) return;

    const now = performance.now();

    // Jeda sejak tick terakhir diukur dengan jam dinding SENDIRI, bukan `dt`
    // dari R3F. `dt` bersumber dari clock internal R3F, dan clock itu DI-RESET
    // oleh setFrameloop() — yang kini dipanggil FrameloopGate tiap kali hero
    // keluar/masuk viewport. Setelah reset, `dt` frame pertama bisa ~0 padahal
    // loop baru saja diam berdetik-detik; gerbang di bawah lolos dan sapuan
    // meloncat sebesar durasi pause. Jam dinding tidak bisa dibohongi reset.
    const gap = lastTickRef.current === null ? Infinity : now - lastTickRef.current;
    lastTickRef.current = now;

    // ── Jangan mulai menghitung sebelum frame mengalir wajar ────────────────
    // Frame PERTAMA setelah GLB siap selalu diikuti tersendat besar: three baru
    // mengompilasi shader untuk 233 material dan mengunggah 91 texture, dan itu
    // memblokir thread utama. TERUKUR di mesin ini (30 Jul, dev build):
    //
    //   traverse GLB selesai  → +0,88 s
    //   frame PERTAMA tergambar → +3,20 s
    //   ────────────────────────────────── tersendat 2,32 s
    //
    // Tersendat itu SUDAH ADA sebelum sapuan ini (diukur A/B dengan patch
    // dimatikan: 2,32 s tanpa vs 2,37 s dengan — jadi sapuan menambah ~50 ms,
    // bukan penyebabnya). Tapi ia MERUSAK animasinya kalau tidak ditangani:
    // hitungan dimulai di frame 1, frame 2 baru datang 2,4 detik kemudian, dan
    // sapuan langsung meloncat ke 87% — praktis tak terlihat, persis gejala
    // yang muncul saat pertama dicoba.
    //
    // Karena itu jamnya baru dimulai setelah ada frame yang jaraknya wajar.
    // Ambang 0,25 s: jauh di atas frame normal (0,008–0,033 s) tapi jauh di
    // bawah tersendat kompilasi. Ini sekaligus menangani hitchan lain dengan
    // sebab sama — pindah tab, GC besar, DAN pause FrameloopGate (loop diam
    // berdetik-detik → gap besar → jam mulai ulang saat kembali) — tanpa
    // perlu kasus khusus.
    if (startRef.current === null || gap > 250) {
      startRef.current = now;
      return;
    }

    // ── Kabari loader bahwa frame NYATA pertama sudah tergambar ─────────────
    // Sampai di baris ini artinya gerbang di atas lolos: ada frame dengan jarak
    // wajar, jadi stall kompilasi sudah lewat dan kantor benar-benar terlihat.
    // Ini sinyal yang dipakai LoadingScreen untuk memulai outro — jauh lebih
    // jujur daripada useProgress, yang mencapai 100% 2,3 detik lebih awal.
    //
    // Dijaga ref supaya set-nya sekali saja: memanggil setter zustand tiap
    // frame akan memicu render ulang tiap frame di semua komponen yang
    // membacanya. Norma yang sama dipakai di BilliardGame.tsx:267.
    if (!readySent.current) {
      readySent.current = true;
      useSceneStore.getState().setSceneReady(true);
    }

    // ── Tahan sapuan sampai overlay loader benar-benar hilang ───────────────
    // Berurutan, bukan tumpang tindih: sapuan "kantor terbentuk" adalah babak
    // pembuka kantor, dan akan terbuang percuma kalau berjalan di balik
    // lingkaran loader yang masih menutupi layar.
    //
    // Dibaca lewat getState(), bukan hook: ini di dalam useFrame, dan
    // berlangganan store di sini akan memicu render ulang tiap kali ada nilai
    // lain di store yang berubah.
    //
    // startRef ikut digeser tiap frame selama menunggu, sehingga saat gerbang
    // akhirnya terbuka jamnya mulai dari nol — bukan langsung meloncat ke
    // tengah sapuan sebesar durasi loader tadi.
    //
    // Batas 3 detik itu jaring pengaman, bukan bagian dari koreografi. Tanpa
    // itu, satu bug di LoadingScreen (worker mati, komponen tidak ter-mount)
    // membuat loaderDone tidak pernah true — dan karena sapuan menahan kantor
    // di progress 0, kantornya TIDAK AKAN PERNAH TAMPIL. Kegagalan yang jauh
    // lebih buruk daripada sekadar animasi yang bertabrakan.
    if (!useSceneStore.getState().loaderDone) {
      if (now - startRef.current < 3000) {
        startRef.current = now;
        return;
      }
    }

    const t = (now - startRef.current - REVEAL_DELAY_MS) / REVEAL_MS;
    if (t <= 0) return;

    if (t >= 1) {
      revealDone.current = true;
      // Lepas patch begitu selesai: tanpa ini setiap fragmen di seluruh kantor
      // terus menghitung dither + discard selamanya untuk hasil yang sudah
      // pasti "tampil penuh".
      sweep.dispose();
      sweepRef.current = null;
      return;
    }

    // easeOutCubic: cepat di awal lalu melambat mendekati akhir. Dipilih supaya
    // ruangan pertama (Lounge, tempat kamera berada) muncul segera dan
    // pengunjung tidak menunggu, sementara ekor sapuan di ruangan jauh punya
    // waktu untuk terbaca.
    const e = 1 - Math.pow(1 - t, 3);
    sweep.set(e);
  });

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
  const coarse = useCoarsePointer();

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // Di perangkat sentuh minigame dimatikan bersama waypoint (INVARIANTS.md
    // §6): kantor tampil sebagai pemandangan saja. Dijaga DI SINI, bukan cuma
    // dengan menyembunyikan HUD — HUD yang hilang tanpa gerbang ini akan
    // menyisakan pemain terkunci di pandangan atas meja tanpa tombol keluar.
    if (coarse) return;
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
    <>
      <Bvh firstHitOnly>
        <primitive object={prepared} onClick={onClick} />
      </Bvh>
      <ScreenVideoGate />
    </>
  );
}

useGLTF.preload(MODEL_URL);

