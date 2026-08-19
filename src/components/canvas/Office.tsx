"use client";

import { useMemo, useLayoutEffect, useEffect, useRef, useCallback } from "react";
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
import { markSceneActivity } from "./renderPace";
import CharacterGlitch from "./CharacterGlitch";
import HoverScan, { hoverScanTargetOf, setHoverScanTarget } from "./HoverScan";
import LedBreath from "./LedBreath";
import { isLedStripMaterial } from "./ledStrip";
import ScreensSleep, { SCREEN_SLEEP_MS } from "./ScreensSleep";
import { useIdleFlag } from "./idleClock";
import { applyScreens, SCREENS } from "./screens";
import {
  getScreenVideo,
  pauseScreenVideos,
  playScreenVideos,
} from "./screenVideo";

// GLB baked ada di public/ dan ter-track git. Jangan kembalikan ke
// /export-test/… — path itu mengandalkan symlink dev-only yang tidak pernah ada
// di repo, jadi hasilnya 404 dan scene mentok di loader selamanya.
//
// URL-nya kini milik officeModel.ts: unduhannya dikerjakan di sana (progres
// byte + sambung-ulang Range), dan komponen ini menerima blob URL hasilnya.
import {
  readOfficeModelUrl,
  startOfficeModelDownload,
} from "@/lib/officeModel";

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
 *
 * ⚠️ 10 Agu 2026 — kenapa angkanya 8 dan bukan 3 lagi.
 * Override ini TIDAK PERNAH BERJALAN. Syaratnya dulu `mat.name === "M_LEDStrip"`,
 * padahal nama material di GLB berakhiran nama mesh pemakainya
 * ("M_LEDStrip__MG_Office_M_LEDStrip"), jadi cocoknya selalu meleset — diam,
 * tanpa error, dan `ledStrip=0` di log DEV di bawah adalah peringatan yang
 * memang sudah dipasang untuk kasus ini tapi tidak sempat terbaca.
 *
 * Artinya seluruh look yang selama ini dilihat dan disetujui — termasuk semua
 * kalibrasi bake dan ambang Bloom sesudahnya — berjalan pada 8, bukan 3.
 * Pencocokannya sekarang dibetulkan (isLedStripMaterial), jadi angka di sini
 * untuk pertama kalinya benar-benar sampai ke material. Ia disetel ke 8 supaya
 * pembetulan itu TIDAK mengubah tampilan: 8 adalah yang sudah ada di layar.
 *
 * Efek sampingnya menyenangkan — kenop ini akhirnya hidup. Menurunkannya ke 3
 * sekarang benar-benar menipiskan pendar LED seperti yang dulu dimaksud; itu
 * keputusan look, bukan perbaikan bug, jadi dibiarkan untuk diputuskan terpisah.
 */
const LED_STRIP_EMISSIVE = 8;

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
function ScreenVideoGate({ asleep }: { asleep: boolean }) {
  const heroInView = useSceneStore((s) => s.heroInView);
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const billiardActive = useSceneStore((s) => s.billiardActive);
  const reduced = useReducedMotion();

  // Tiap layar video hanya benar-benar terlihat dari SATU ruangan (MacBook dari
  // Office, TV dari Meeting). Di ruangan lain ia di luar frustum atau sejauh
  // beberapa piksel — men-dekode untuk itu murni pemborosan, jadi yang diputar
  // cuma milik ruangan yang sedang ditempati. Daftarnya diturunkan dari SCREENS
  // supaya menambah layar video baru tidak menuntut siapa pun ingat menyunting
  // gerbang ini juga.
  const urls = useMemo(
    () =>
      SCREENS.filter((s) => s.video && s.room === currentRoom).map((s) => s.url),
    [currentRoom],
  );
  // `asleep` ikut di sini, BUKAN jadi pause terpisah dari ScreensSleep. Kalau
  // peredup mem-pause sendiri, gerbang ini tidak tahu dan tidak akan pernah
  // memutar ulang: efeknya cuma dijalankan lagi kalau `wanted`/`urls` berubah,
  // dan bangun dari idle tidak mengubah satu pun dari keduanya. Gejalanya
  // "video mati permanen setelah ditinggal sebentar".
  const wanted =
    heroInView && urls.length > 0 && !billiardActive && !reduced && !asleep;

  useEffect(() => {
    if (!wanted) {
      pauseScreenVideos();
      return;
    }
    playScreenVideos(urls);

    // Pindah tab: browser MEMANG menurunkan prioritas timer, tapi tidak
    // menghentikan dekode video. Dipause eksplisit — dan dinyalakan lagi saat
    // kembali, karena efek ini tidak dijalankan ulang oleh perpindahan tab.
    const onVisibility = () => {
      if (document.visibilityState === "visible") playScreenVideos(urls);
      else pauseScreenVideos();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      pauseScreenVideos();
    };
  }, [wanted, urls]);

  return null;
}

/**
 * Pemilik tunggal keadaan "layar sedang tidur".
 *
 * Dua pemakainya butuh boolean yang SAMA, dan masing-masing memanggil
 * useIdleFlag sendiri akan memberi dua timer yang menyeberang beberapa ratus
 * milidetik berbeda — video mati sebelum layarnya sempat meredup, atau
 * sebaliknya. Dihitung sekali di sini lalu dioper.
 *
 * Sekalian mengurung render ulangnya: flag ini berubah dua kali per siklus
 * idle, dan komponen inilah yang ikut render, bukan Office yang jauh lebih
 * besar.
 */
function ScreensIdle({ scene }: { scene: THREE.Object3D }) {
  const asleep = useIdleFlag(SCREEN_SLEEP_MS);
  return (
    <>
      <ScreenVideoGate asleep={asleep} />
      <ScreensSleep asleep={asleep} scene={scene} />
    </>
  );
}

/**
 * Kantor Cogniti — hasil bake lightmap (lihat Documentations.md §4g).
 *
 * GLB ini punya NOL lampu realtime: semua cahaya + bayangan sudah dipanggang
 * ke lightmap. Itu yang bikin 50-60 FPS. Jangan tambah lampu scene-wide di
 * sini. Karakter pun sengaja TANPA lampu (cukup ambient + envmap — dipilih
 * Keano 6 Agu setelah tes point light per karakter; lihat komentar di
 * Scene.tsx). Catatan penting kalau tergoda "lampu ber-layer": three TIDAK
 * mendukung selective lighting per objek — layer lampu diuji terhadap
 * KAMERA, lampu yang lolos menyinari semua material.
 *
 * Tiga fix-up di bawah wajib ada; semuanya hasil debugging panjang dan kalau
 * meleset visualnya rusak dengan cara yang tidak kelihatan jelas.
 */
export default function Office() {
  // Suspend di unduhan officeModel.ts dulu (di sinilah menit-menit koneksi
  // lambat dihabiskan, dengan progres tampil di loader), baru useGLTF mem-parse
  // blob-nya — parsing draco/webp tidak berubah. Gagal total (setelah semua
  // sambung-ulang) dilempar dari readOfficeModelUrl dan mendarat di
  // ChunkBoundary "Scene" (Hero.tsx), sama seperti kegagalan useGLTF dulu.
  const modelUrl = readOfficeModelUrl();
  const { scene, animations } = useGLTF(modelUrl);
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
        //
        // PENGECUALIAN: kaca transparan (M_Glass/GlassFrost/GlassSmoke/
        // Pantry_Glass, alpha blend) ikut ter-bake tapi hasil bake-nya sampah —
        // bake diffuse di permukaan alpha 0.08 cuma menangkap noise varian
        // tinggi (LM_MG_Office_M_Glass: std 0.41 vs dinding 0.26, puncak 3.28).
        // Noise itu × LIGHTMAP_INTENSITY bikin kaca keruh seperti susu penuh
        // bintik. Kaca tidak butuh baked light — look-nya datang dari benda di
        // baliknya — jadi buang lightmap DAN aoMap-nya sekalian.
        // (Diuji 6 Agu: mengecualikan M_GlassSmoke dari aturan ini — alias
        // mengembalikan lightmap-nya — mengubah <0,01% piksel. Wajar: lightMap
        // dikali diffuseColor, dan diffuse smoke ~0,008 ≈ hitam. Jadi smoke
        // ikut aturan yang sama, tanpa pengecualian.)
        if (mat.transparent && /Glass/i.test(mat.name)) {
          if (mat.aoMap && mat.aoMap.channel === 1) {
            mat.aoMap = null;
            mat.needsUpdate = true;
          }
          continue;
        }
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
        // Lewat helper, bukan `=== LED_MATERIAL`: nama di GLB berakhiran nama
        // mesh. Lihat catatan panjang di isLedStripMaterial() dan di
        // LED_STRIP_EMISSIVE — perbandingan sama-dengan di sini sempat mematikan
        // FIX 4 tanpa suara.
        if (isLedStripMaterial(mat)) {
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
  /**
   * Kapan penantian loaderDone DIMULAI — jam terpisah dari startRef, dan itu
   * bukan kemubaziran. startRef digeser ke `now` tiap frame selama menunggu
   * (supaya sapuan mulai dari nol saat gerbang terbuka), jadi ia tidak bisa
   * sekaligus dipakai mengukur "sudah berapa lama menunggu": membandingkan
   * `now - startRef` berarti membandingkan dua frame bersebelahan (~16 ms),
   * bukan durasi penantian. Versi lama melakukan persis itu — jaring pengaman
   * 3 detiknya kode mati sejak lahir (ketahuan 7 Agu 2026 saat analisis bug
   * sweep; tidak pernah tersulut hanya karena LoadingScreen belum pernah gagal
   * total).
   */
  const waitStartRef = useRef<number | null>(null);

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
    waitStartRef.current = null;

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

    // Sapuan reveal awal (dan penantian loader sebelum ia mulai) wajib 60 fps
    // — ini babak pembuka kantor, cap 30 fps idle jangan memotongnya jadi
    // bertangga. Berhenti sendiri: begitu sweep.dispose() jalan, early-return
    // di atas membuat baris ini tak pernah tersentuh lagi.
    markSceneActivity(now);

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
    // tengah sapuan sebesar durasi loader tadi. Lamanya penantian diukur
    // dengan waitStartRef yang TIDAK ikut digeser — lihat catatan di
    // deklarasinya: memakai startRef untuk keduanya membuat batas ini tidak
    // pernah tercapai (bug kode-mati yang dibetulkan 7 Agu 2026).
    //
    // Batas 3 detik itu jaring pengaman, bukan bagian dari koreografi. Tanpa
    // itu, satu bug di LoadingScreen (worker mati, komponen tidak ter-mount)
    // membuat loaderDone tidak pernah true — dan karena sapuan menahan kantor
    // di progress 0, kantornya TIDAK AKAN PERNAH TAMPIL. Kegagalan yang jauh
    // lebih buruk daripada sekadar animasi yang bertabrakan. Kalau batasnya
    // tersulut, sapuan jalan begitu saja tanpa menunggu loader — di skenario
    // gagal itu overlay-nya kemungkinan sudah/akan dilepas oleh jaring
    // pengaman LoadingScreen sendiri (1500 ms), jadi sapuannya tetap terlihat.
    if (!useSceneStore.getState().loaderDone) {
      if (waitStartRef.current === null) waitStartRef.current = now;
      if (now - waitStartRef.current < 3000) {
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

  // ── Hover: pemindaian dither + label pengekor kursor ────────────────────
  //
  // onPointerMove, BUKAN onPointerOver/Out — dan ini bukan selera. Handler-nya
  // menempel di <primitive> akar, jadi bagi R3F SELURUH kantor adalah satu
  // event object: over/out hanya menyala di batas kantor terhadap langit, tak
  // pernah saat kursor menyeberang dari lantai ke meja. Yang membedakan
  // keduanya cuma `e.object` (mesh yang benar-benar kena ray), dan itu hanya
  // tersedia lewat move.
  //
  // Tidak ada ongkos raycast tambahan: primitive ini sudah memegang onClick,
  // jadi ia sudah masuk daftar interaksi R3F dan sudah di-raycast tiap gerakan
  // pointer. Yang bertambah cuma penyusuran rantai induk di JS.
  const setHoveredLabel = useSceneStore((s) => s.setHoveredLabel);
  /** Label yang sedang KITA pasang, atau null. Ref, bukan state: nilainya
   *  berubah saat kursor menyeberangi tepi meja dan tidak ada satu pun
   *  render React yang perlu ikut berubah karenanya. */
  const hoverLabelRef = useRef<string | null>(null);

  const clearHover = useCallback(() => {
    setHoverScanTarget(null);
    // Kosongkan HANYA kalau label yang tampil memang milik kita — penjaga yang
    // sama dengan Waypoints.tsx:401, karena kursor bisa menyeberang langsung
    // dari meja ke waypoint dan enter(waypoint) tiba lebih dulu.
    if (
      hoverLabelRef.current !== null &&
      useSceneStore.getState().hoveredLabel === hoverLabelRef.current
    ) {
      setHoveredLabel(null);
      document.body.style.cursor = "";
    }
    hoverLabelRef.current = null;
  }, [setHoveredLabel]);

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (coarse || billiardActive) return;
    // ⚠️ Keputusan diambil dari SELURUH sinar (e.intersections), bukan dari
    // e.object milik panggilan ini — dan ini bug yang sudah terjadi sekali
    // (10 Agu). R3F memanggil handler SEKALI PER PERPOTONGAN: satu gerakan
    // mouse di atas meja menghasilkan rentetan
    //   MG_Lounge_M_PoolTable_Body → MG_Lounge_M_Alu_Trim → Rug_Lounge009
    //   → MG_Office_M_Floor
    // (terverifikasi lewat penghitung sementara). Panggilan pertama menyalakan
    // hover, tiga sisanya — yang bukan meja — langsung memadamkannya lagi,
    // sehingga efeknya tidak pernah terlihat sama sekali.
    //
    // Membaca seluruh daftar juga membuat gerbangnya SAMA PERSIS dengan
    // onClick di bawah, yang lolos ke meja lewat stopPropagation begitu
    // menemukannya di kedalaman mana pun.
    let t: ReturnType<typeof hoverScanTargetOf> = null;
    for (const hit of e.intersections) {
      t = hoverScanTargetOf(hit.object);
      if (t) break;
    }
    if (!t) {
      clearHover();
      return;
    }
    // Sudah menyala untuk target ini: pointermove menyala puluhan kali per
    // detik, jadi jangan menulis ke store tiap kalinya — itu render React per
    // gerakan mouse, persis yang dihindari di seluruh scene ini.
    if (hoverLabelRef.current === t.label) return;
    hoverLabelRef.current = t.label;
    setHoverScanTarget(t.id);
    setHoveredLabel(t.label);
    document.body.style.cursor = "pointer";
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // Di perangkat sentuh minigame dimatikan bersama waypoint (INVARIANTS.md
    // §6): kantor tampil sebagai pemandangan saja. Dijaga DI SINI, bukan cuma
    // dengan menyembunyikan HUD — HUD yang hilang tanpa gerbang ini akan
    // menyisakan pemain terkunci di pandangan atas meja tanpa tombol keluar.
    if (coarse) return;
    if (billiardActive) return;
    // Pengecekan nama dipinjam dari HoverScan supaya "apa yang berkilau saat
    // di-hover" dan "apa yang bereaksi saat diklik" mustahil berbeda — dulu
    // string "PoolTable" ditulis di sini sendiri.
    if (!hoverScanTargetOf(e.object)) return;
    e.stopPropagation();
    clearHover();
    const v = billiardView(size.width / size.height);
    enterBilliard();
    setTableRotated(v.rotated);
    goToView?.(v.pos, v.tgt, v.up, v.fov);
  };

  // Jaring pengaman: minigame dibuka selagi kursor masih di atas meja, atau
  // komponennya di-unmount. Tanpa ini labelnya menggantung di layar selamanya
  // (bug yang sudah pernah dibayar di Waypoints.tsx:416). Kursor yang keluar
  // dari kantor ke langit ditangani onPointerOut di <primitive>.
  useEffect(() => {
    if (billiardActive) clearHover();
  }, [billiardActive, clearHover]);
  useEffect(() => () => clearHover(), [clearHover]);

  // Bvh mempercepat raycast di 291 objek — dipakai nanti untuk klik pintu (B2).
  return (
    <>
      <Bvh firstHitOnly>
        <primitive
          object={prepared}
          onClick={onClick}
          onPointerMove={onPointerMove}
          onPointerOut={clearHover}
        />
      </Bvh>
      <ScreensIdle scene={prepared} />
      {/* Glitch karakter saat idle. HARUS anak Office, bukan dipindah ke
          Scene.tsx: patch-nya harus terpasang SEBELUM prepareRevealSweep di
          layout effect di atas (sweep menyimpan lalu memulihkannya), dan
          jaminan urutannya justru datang dari React — layout effect ANAK
          berjalan sebelum layout effect induk. Rincian di CharacterGlitch.tsx. */}
      <CharacterGlitch scene={prepared} />
      {/* Pemindaian dither saat hover. Kontrak urutan yang SAMA dengan
          CharacterGlitch di atas — jangan dipindah ke Scene.tsx. Tidak
          di-mount di perangkat sentuh: tidak ada hover di sana (INVARIANTS §6),
          jadi satu program shader tambahan itu murni ongkos. */}
      {!coarse && <HoverScan scene={prepared} />}
      {/* LED strip bernapas saat idle. Beda dengan dua efek di atas, ini TIDAK
          terikat kontrak urutan §5: ia cuma menulis emissiveIntensity, tidak
          menyentuh onBeforeCompile, jadi revealSweep tidak punya apa pun
          darinya untuk disimpan atau ditimpa. */}
      <LedBreath scene={prepared} />
    </>
  );
}

// Pengganti useGLTF.preload(MODEL_URL) yang dulu di baris ini: mulai unduhan
// saat chunk Scene dievaluasi. Hero memulainya lebih awal lagi (saat mount,
// paralel dengan unduhan chunk ini) — panggilan ini tinggal jaring pengaman
// untuk jalur yang me-render Office tanpa lewat Hero; idempoten, jadi aman.
startOfficeModelDownload();

