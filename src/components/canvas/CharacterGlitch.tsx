"use client";

/**
 * Glitch karakter saat pengunjung idle (8 Agu 2026).
 *
 * Setelah beberapa detik tanpa input, kelima karakter sesekali "rusak" sekilas:
 * irisan-irisan horizontal tubuhnya tergeser ke samping dan warnanya jatuh ke
 * tangga dither kasar — bahasa visual yang sama dengan hologram maintenance,
 * jadi karakter terbaca sebagai penghuni dunia yang sama, bukan efek tempelan.
 *
 * ── Kenapa KARAKTER saja, bukan seluruh scene ──────────────────────────────
 * Glitch fullscreen saat idle terbaca sebagai "website-nya rusak" — pengunjung
 * tidak sedang melakukan apa-apa, jadi tidak ada yang bisa ia baca sebagai
 * penyebabnya. Di karakter, glitch terbaca sebagai sifat benda itu (NPC/
 * hologram yang flicker). Alasan keduanya ongkos: fullscreen berarti satu pass
 * post-processing ekstra yang menyala justru saat idle — melawan arah rencana
 * optimasi idle — sedangkan ini hanya menyentuh material 5 SkinnedMesh
 * (≤2,5k tris per karakter) lewat cabang uniform yang nol kerjanya saat mati.
 *
 * ── Mekanisme: onBeforeCompile, pola yang sama dengan revealSweep.ts ───────
 * Satu fungsi patch module-level + uniform module-level. Dua-duanya WAJIB
 * module-level dengan alasan yang sudah terbayar mahal di revealSweep (lihat
 * catatan panjang di sana, 7 Agu): customProgramCacheKey bawaan three =
 * onBeforeCompile.toString(), jadi replay StrictMode yang membuat closure baru
 * akan memakai program lama dengan objek uniform lama yang beku.
 *
 * ── Kontrak urutan dengan revealSweep — PENTING ────────────────────────────
 * prepareRevealSweep() MENIMPA onBeforeCompile semua MeshStandardMaterial
 * (termasuk milik karakter), menyimpan yang lama, dan MENGEMBALIKANNYA saat
 * dispose. Patch glitch karenanya harus terpasang SEBELUM sweep dipasang:
 * sweep menyimpan patch glitch sebagai "previous" dan memulihkannya saat
 * sapuan selesai. Urutan itu dijamin oleh React sendiri — komponen ini anak
 * dari Office, dan layout effect ANAK berjalan sebelum layout effect INDUK
 * (tempat sweep dipasang). Jangan pindahkan komponen ini ke Scene.tsx sebagai
 * saudara Office; jaminannya hilang dan karakter tidak ikut tersapu reveal.
 *
 * Konsekuensi yang diterima: SELAMA sapuan reveal berjalan (~3 detik pertama)
 * patch glitch tidak terpasang. Tidak masalah — idle butuh 8 detik, jadi
 * burst pertama mustahil jatuh di masa itu.
 *
 * ── Kenapa driver-nya useFrame biasa, tanpa gerbang frameloop sendiri ──────
 * FrameloopGate menyetel frameloop "never" saat hero tak terlihat, dan itu
 * menghentikan SEMUA useFrame serempak — termasuk yang ini. Tidak ada mesin
 * yang berdetak sendiri di sini (pelajaran PhysicsHeading 3 Agu): listener
 * input cuma menulis satu timestamp, seluruh kerja lain hidup di dalam
 * useFrame yang ikut tidur bersama canvas-nya.
 */

import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import {
  Material,
  MeshStandardMaterial,
  SkinnedMesh,
  Vector3,
  type IUniform,
  type Object3D,
  type WebGLProgramParametersWithUniforms,
} from "three";
import { useSceneStore } from "@/lib/store/sceneStore";
import { VIEWS } from "./CameraController";
import { IDLE_MS, idleFor, useIdleClock } from "./idleClock";

/** Rentang jeda antar burst saat idle (ms). Acak supaya tidak metronomik. */
const GAP_MIN_MS = 4000;
const GAP_RANGE_MS = 5000;

/** Durasi satu burst (ms). 130–240 ms: cukup panjang untuk 3–5 kali re-roll
 *  irisan di 24 Hz, cukup pendek supaya terbaca "sekilas", bukan "rusak". */
const BURST_MIN_MS = 130;
const BURST_RANGE_MS = 110;

/** Jeda burst PERTAMA setelah ambang idle terlewati. Pendek — inilah momen
 *  efeknya paling mungkin dilihat orang yang baru saja berhenti bergerak. */
const FIRST_MIN_MS = 600;
const FIRST_RANGE_MS = 1000;

/**
 * Laju re-roll irisan di dalam burst (Hz). Seed shader dikuantisasi ke tangga
 * waktu ini, jadi irisannya MELONCAT antar pola diskret alih-alih meluncur
 * halus — kesan "sinyal rusak" datang dari lompatan itu. 24 dipilih karena
 * pada 60 fps tiap pola bertahan 2–3 frame: terlihat, tidak jadi kabur.
 */
const REROLL_HZ = 24.0;

/** Tinggi satu irisan dalam METER DUNIA (bukan model-space — lihat catatan
 *  skala di patch vertex). Karakter duduk ±1,3 m → ~14 irisan. */
const SLICE_H = 0.09;

/** Geser maksimum irisan, dalam satuan NDC (≈ setengah lebar layar = 1).
 *  0,018 ≈ 13 px pada layar 1440 — dinaikkan dari 0,014 (8 Agu, "kurang
 *  noticeable") — jelas terlihat di tubuh karakter, tidak sampai melempar
 *  potongan badan ke tengah ruangan. */
const SHIFT_NDC = 0.018;

/**
 * Kuat flash putih pada irisan yang TERGESER: tiap irisan diangkat ke arah
 * putih sejauh FLASH_MIN..FLASH_MIN+FLASH_RANGE (diacak per irisan) SEBELUM
 * kuantisasi. Ini jawaban untuk "kurang noticeable" (8 Agu): karakter-karakter
 * ini berbaju gelap, jadi geseran gelap-ke-gelap nyaris tak terbaca — yang
 * membuat burst kelihatan adalah pita TERANG melintang di siluet gelap.
 *
 * Putih, bukan merah/cyan, dengan alasan yang sudah dibayar di tempat lain:
 * merah sepenuh bidang terbaca galat fatal (catatan revealSweep), dan pada
 * warna ber-rona mata ikut membaca perbedaan hue sehingga pola dither-nya
 * melebur (catatan MaintenanceHologram saat pindah cyan → putih). Flash putih
 * juga = bahasa yang sama dengan panel maintenance.
 *
 * Batas atasnya sengaja di bawah ambang Bloom: puncak teoretis
 * (0,70 lift → tangga 0,75) × jitter 1,15 ≈ 0,86 < 0,95 — irisannya terang
 * tapi TIDAK ikut mekar bloom; yang boleh berpendar di scene ini hanya yang
 * memang lampu.
 */
const FLASH_MIN = 0.35;
const FLASH_RANGE = 0.35;

/**
 * Fade glitch berdasar jarak vertex → TITIK TARGET pandangan ruangan yang
 * sedang aktif (uGlitchCenter = VIEWS[currentRoom].tgt): penuh sampai
 * FADE_FULL_M, memudar linier, nol di FADE_ZERO_M.
 *
 * Ini perbaikan "glitch kelihatan menembus kaca" (8 Agu): dari Lounge,
 * karakter di Function dan Meeting ikut burst dan flash putihnya tampil jelas
 * di balik kaca — kedipan terang di sudut mata yang menarik perhatian ke
 * ruangan yang bukan sedang ditonton. Kaca-kaca itu transparan + depthWrite
 * mati, jadi tidak ada cara "menyembunyikan di balik kaca"; yang bisa
 * diandalkan adalah tata letaknya: karakter ruangan AKTIF selalu dekat suatu
 * titik acuan, karakter ruangan lain selalu jauh darinya.
 *
 * ⚠️ Acuannya TARGET pandangan (tgt), BUKAN posisi kamera — dan itu hasil
 * percobaan gagal, bukan selera. Versi pertama memakai cameraPosition:
 * Leonard di sofa Lounge berjarak ~8–9 m dari kamera Lounge (kamera ruangan
 * ini memang mundur jauh) sementara karakter lintas-ruangan mulai di ~10 m —
 * celah sesempit itu tidak bisa dipisahkan, dan Leonard ikut ter-fade sampai
 * bersih (terverifikasi screenshot ?glitch=1). Target pandangan tidak punya
 * masalah itu: kamera tiap ruangan justru DIARAHKAN ke karakternya, jadi
 * karakter ruangan aktif duduk beberapa meter saja dari tgt, sedangkan tgt
 * ruangan lain belasan meter jauhnya (Lounge→Function ~11 m, →Meeting ~18 m).
 *
 * Kalau nanti ada karakter baru yang duduk jauh dari tgt ruangannya, ukur
 * dulu jaraknya — jangan langsung melebarkan FADE_ZERO_M, itu membuka lagi
 * kedipan lintas kaca.
 */
const FADE_FULL_M = 5.0;
const FADE_ZERO_M = 8.0;

/**
 * Ukuran sel dither & jumlah tangga warna saat burst — DISAMAKAN dengan
 * MaintenanceHologram (DITHER_PX 2, 4 tangga) dan itu intinya: kilasan dither
 * di karakter harus terbaca sebagai bahasa yang sama dengan panel maintenance,
 * bukan efek ketiga yang baru. Kalau hologram mengubah angkanya, ubah di sini
 * juga.
 */
const DITHER_PX = 2.0;
const STEPS = 4.0;

/**
 * Mode paksa untuk verifikasi visual (dev-only): buka halaman dengan ?glitch=1
 * dan efeknya menyala terus, supaya scripts/shoot.mjs — yang cuma menunggu 12
 * detik lalu memotret — tidak perlu berjudi menebak kapan burst 200 ms lewat.
 * import.meta.env.DEV membuat seluruh cabang ini hilang di build produksi.
 */
const FORCED =
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("glitch");

/** 0 = mati, 1 = burst penuh. Dibagi semua material karakter — satu tulisan
 *  per frame, bukan satu per material (pelajaran revealSweep). */
const uGlitch: IUniform<number> = { value: 0 };
/** Detik, hanya maju selama burst. Sumber seed re-roll irisan di shader. */
const uGlitchTime: IUniform<number> = { value: 0 };
/** Titik acuan fade = VIEWS[currentRoom].tgt, di-copy tiap frame oleh driver
 *  (lewat getState, bukan langganan — norma Office.tsx). Vector3 milik
 *  sendiri, bukan referensi ke objek VIEWS: uniform yang menunjuk langsung ke
 *  konstanta bersama akan ikut berubah kalau ada kode lain menganimasikannya. */
const uGlitchCenter: IUniform<Vector3> = { value: new Vector3() };

/**
 * onBeforeCompile ASLI tiap material, module-level dan WeakMap: useGLTF
 * meng-cache scene-nya, jadi material yang sama bisa melewati beberapa siklus
 * mount. Peta di module scope membuat "yang asli" tetap yang benar-benar asli,
 * bukan patch kita sendiri yang tersisa dari mount sebelumnya.
 */
const originals = new WeakMap<
  MeshStandardMaterial,
  (
    p: WebGLProgramParametersWithUniforms,
    r: Parameters<Material["onBeforeCompile"]>[1],
  ) => void
>();

const patch = (shader: WebGLProgramParametersWithUniforms) => {
  shader.uniforms.uGlitch = uGlitch;
  shader.uniforms.uGlitchTime = uGlitchTime;
  shader.uniforms.uGlitchCenter = uGlitchCenter;

  // ── VERTEX: geser irisan di ruang LAYAR, setelah project_vertex ──────────
  // Dua keputusan di blok ini:
  //
  // 1. Irisan dipetakan dari Y DUNIA (modelMatrix * transformed), bukan
  //    transformed.y mentah. Mesh hasil rig Mixamo kerap membawa skala di
  //    matrix (armature cm → m); di model-space, tinggi irisan 0,09 "meter"
  //    bisa berarti 9 cm atau 0,9 mm tergantung skala itu. Y dunia kebal.
  //    Ongkos perkalian matriksnya sudah lazim — revealSweep membayar hal
  //    yang sama untuk vRevealX.
  //
  // 2. Gesernya di gl_Position (NDC), bukan menggeser `transformed`. Sobekan
  //    sinyal rusak itu artefak LAYAR, jadi digeser di layar terbaca paling
  //    jujur — dan tidak perlu memikirkan arah "samping" di ruang model yang
  //    berbeda-beda per karakter (tiap karakter menghadap arah lain).
  //    Dikali gl_Position.w supaya besarnya tetap dalam satuan NDC setelah
  //    pembagian perspektif — tanpa itu karakter yang jauh tergeser lebih
  //    kecil daripada yang dekat.
  //
  // step(0.55, gGate): hanya ~45% irisan yang tergeser tiap re-roll. Kalau
  // semua irisan geser, siluetnya cuma "bergetar"; sebagian besar diam +
  // beberapa meloncat = sobekan.
  shader.vertexShader = shader.vertexShader.replace(
    "#include <project_vertex>",
    /* glsl */ `
      #include <project_vertex>
      {
        float gSeed = floor( uGlitchTime * ${REROLL_HZ.toFixed(1)} );
        vec3 gWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
        float gBand = floor( gWorld.y / ${SLICE_H.toFixed(2)} );
        float gGate = fract( sin( gBand * 57.31 + gSeed * 7.77 ) * 24634.6345 );
        float gRand = fract( sin( gBand * 91.17 + gSeed * 13.73 ) * 43758.5453 );
        vGlitchRand = gRand;
        vGlitchGate = step( 0.55, gGate );
        vGlitchFade = 1.0 - smoothstep( ${FADE_FULL_M.toFixed(1)}, ${FADE_ZERO_M.toFixed(1)},
          distance( gWorld, uGlitchCenter ) );
        gl_Position.x += ( gRand - 0.5 ) * 2.0 * ${SHIFT_NDC.toFixed(3)}
          * uGlitch * vGlitchGate * vGlitchFade * gl_Position.w;
      }
    `,
  );
  shader.vertexShader =
    "uniform float uGlitch;\nuniform float uGlitchTime;\n" +
    "uniform vec3 uGlitchCenter;\n" +
    "varying float vGlitchRand;\nvarying float vGlitchGate;\n" +
    "varying float vGlitchFade;\n" +
    shader.vertexShader;

  // ── FRAGMENT: kilasan dither, setelah dithering_fragment ─────────────────
  // Titik sisip yang sama dengan revealSweep dan dengan alasan yang sama:
  // ini chunk TERAKHIR, gl_FragColor sudah sRGB akhir. Kuantisasi di ruang
  // sRGB berarti tangga-tangganya berjarak sama secara PERSEPSI — persis yang
  // membuat dither hologram terbaca sebagai papan catur, bukan gradasi.
  //
  // floor(x * 4 + bayer) / 4: rumus tangga yang sama dengan alpha hologram.
  // Bayer dibaca pada sel 2 px perangkat (DITHER_PX) supaya polanya cukup
  // kasar untuk terlihat — 1 px di Retina terbaca grain, bukan dither
  // (pelajaran MaintenanceHologram).
  //
  // Baris vGlitchRand: irisan yang sama yang tergeser di vertex juga sedikit
  // berubah terang (±15%). Tanpa ini, irisan yang kebetulan tidak tergeser
  // tidak kelihatan "rusak" sama sekali dan burst-nya cuma terbaca separuh.
  //
  // Cabang if pada uniform itu murah: seragam untuk seluruh draw call, GPU
  // tidak membayar divergensi — saat uGlitch 0 (hampir selalu), seluruh blok
  // dilewati.
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <dithering_fragment>",
    /* glsl */ `
      #include <dithering_fragment>
      if ( uGlitch > 0.001 ) {
        float gBayer = csiGlitchBayer( floor( gl_FragCoord.xy / ${DITHER_PX.toFixed(1)} ) );
        vec3 gC = mix(
          gl_FragColor.rgb,
          vec3( 1.0 ),
          vGlitchGate * ( ${FLASH_MIN.toFixed(2)} + ${FLASH_RANGE.toFixed(2)} * vGlitchRand )
        );
        vec3 gQ = floor( gC * ${STEPS.toFixed(1)} + gBayer ) / ${STEPS.toFixed(1)};
        gQ *= 0.85 + vGlitchRand * 0.30;
        gl_FragColor.rgb = mix( gl_FragColor.rgb, gQ, uGlitch * vGlitchFade );
      }
    `,
  );
  // Matriks Bayer 4×4 sebagai rantai if — alasan yang sama dengan revealSweep
  // & MaintenanceHologram: array indexing dinamis tidak dijamin di GLSL ES 1.0.
  shader.fragmentShader =
    /* glsl */ `
    uniform float uGlitch;
    varying float vGlitchRand;
    varying float vGlitchGate;
    varying float vGlitchFade;
    float csiGlitchBayer( vec2 co ) {
      ivec2 p = ivec2( mod( co, 4.0 ) );
      int i = p.y * 4 + p.x;
      if ( i ==  0 ) return  0.0 / 16.0;
      if ( i ==  1 ) return  8.0 / 16.0;
      if ( i ==  2 ) return  2.0 / 16.0;
      if ( i ==  3 ) return 10.0 / 16.0;
      if ( i ==  4 ) return 12.0 / 16.0;
      if ( i ==  5 ) return  4.0 / 16.0;
      if ( i ==  6 ) return 14.0 / 16.0;
      if ( i ==  7 ) return  6.0 / 16.0;
      if ( i ==  8 ) return  3.0 / 16.0;
      if ( i ==  9 ) return 11.0 / 16.0;
      if ( i == 10 ) return  1.0 / 16.0;
      if ( i == 11 ) return  9.0 / 16.0;
      if ( i == 12 ) return 15.0 / 16.0;
      if ( i == 13 ) return  7.0 / 16.0;
      if ( i == 14 ) return 13.0 / 16.0;
      return 5.0 / 16.0;
    }
  ` + shader.fragmentShader;
};

/**
 * Pasang patch pada semua material SkinnedMesh di `scene`. Hanya SkinnedMesh:
 * itu definisi operasional "karakter" di GLB ini (5 buah, ditandai juga oleh
 * FIX 3 frustumCulled di Office.tsx) — furnitur tidak punya tulang.
 */
function prepareCharacterGlitch(scene: Object3D): { dispose: () => void } | null {
  const mats = new Set<MeshStandardMaterial>();
  scene.traverse((o: Object3D) => {
    if (!(o instanceof SkinnedMesh)) return;
    const list: Material[] = Array.isArray(o.material)
      ? o.material
      : [o.material];
    for (const m of list) {
      if (m instanceof MeshStandardMaterial) mats.add(m);
    }
  });
  if (!mats.size) return null;

  for (const m of mats) {
    // Sudah terpasang dari siklus mount sebelumnya (scene di-cache useGLTF)
    // atau replay StrictMode — jangan simpan patch sendiri sebagai "asli".
    if (m.onBeforeCompile === patch) continue;
    originals.set(m, m.onBeforeCompile);
    m.onBeforeCompile = patch;
    m.needsUpdate = true;
  }

  return {
    dispose: () => {
      for (const m of mats) {
        // Lepas hanya kalau slot-nya masih milik kita. Kalau sedang ditimpa
        // pihak lain (sapuan reveal masih berjalan saat unmount), biarkan —
        // pihak itu menyimpan patch kita sebagai "previous" dan akan
        // memulihkannya. Patch yang tertinggal tidak berbahaya: pada
        // uGlitch 0 ia identitas murni, dan pemasangan berikutnya mengenali
        // dirinya lewat guard di atas.
        if (m.onBeforeCompile !== patch) continue;
        const orig = originals.get(m);
        if (orig) m.onBeforeCompile = orig;
        m.needsUpdate = true;
      }
    },
  };
}

/**
 * Pasang + gerakkan glitch. Render null; WAJIB jadi anak Office (kontrak
 * urutan layout effect — lihat kepala berkas).
 */
export default function CharacterGlitch({ scene }: { scene: Object3D }) {
  const reduced = useReducedMotion();
  const handleRef = useRef<ReturnType<typeof prepareCharacterGlitch>>(null);

  useLayoutEffect(() => {
    const handle = prepareCharacterGlitch(scene);
    handleRef.current = handle;
    return () => {
      handle?.dispose();
      handleRef.current = null;
      uGlitch.value = 0;
    };
  }, [scene]);

  // Jam idle-nya bersama (idleClock.ts) — dulu blok listener sendiri di sini.
  // Ambangnya tetap milik efek ini: IDLE_MS 8 detik, sengaja jauh lebih pendek
  // dari ambang layar tidur.
  useIdleClock();

  /** null = belum idle / baru keluar idle; jadwal burst berikutnya (ms). */
  const nextBurstAt = useRef<number | null>(null);
  const burstEndAt = useRef(0);

  useFrame(() => {
    if (!handleRef.current) return;
    const now = performance.now();

    // Acuan fade mengikuti ruangan aktif. Di-copy (bukan di-assign) supaya
    // uniform memegang Vector3-nya sendiri, dan lewat getState() karena kita
    // di dalam useFrame — berlangganan store dari sini memicu render ulang
    // tiap kali nilai APA PUN di store berubah (norma yang sama dengan
    // pembacaan loaderDone di Office.tsx).
    uGlitchCenter.value.copy(VIEWS[useSceneStore.getState().currentRoom].tgt);

    if (FORCED) {
      uGlitch.value = 1;
      uGlitchTime.value = now / 1000;
      return;
    }

    // Reduced motion: karakter tetap beranimasi idle (gerak kontinu ringan),
    // tapi flicker mendadak persis kelas gerakan yang preferensi ini minta
    // hilangkan — sama seperti video layar yang ikut dipause di ScreenVideoGate.
    if (reduced || idleFor(now) < IDLE_MS) {
      nextBurstAt.current = null;
      if (uGlitch.value !== 0) uGlitch.value = 0;
      return;
    }

    // Baru menyeberang ke idle: jadwalkan burst pertama.
    if (nextBurstAt.current === null) {
      nextBurstAt.current = now + FIRST_MIN_MS + Math.random() * FIRST_RANGE_MS;
      return;
    }

    // Di tengah burst: cukup majukan jam supaya irisan re-roll di 24 Hz.
    if (now < burstEndAt.current) {
      uGlitchTime.value = now / 1000;
      return;
    }

    // Burst barusan selesai: matikan. (Jadwal berikutnya sudah dipasang saat
    // burst dimulai, jadi cabang ini tidak menghitung apa-apa.)
    if (uGlitch.value !== 0) uGlitch.value = 0;

    if (now >= nextBurstAt.current) {
      burstEndAt.current = now + BURST_MIN_MS + Math.random() * BURST_RANGE_MS;
      nextBurstAt.current =
        burstEndAt.current + GAP_MIN_MS + Math.random() * GAP_RANGE_MS;
      uGlitch.value = 1;
      uGlitchTime.value = now / 1000;
    }
  });

  return null;
}
