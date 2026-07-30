"use client";

import { useMemo, useRef, useState, useLayoutEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  DataTexture,
  DoubleSide,
  FrontSide,
  LinearFilter,
  RGBAFormat,
  RepeatWrapping,
  Vector2,
  Vector3,
  type DepthTexture,
  type ShaderMaterial,
} from "three";

/**
 * Kerucut cahaya volumetrik palsu untuk lampu plafon.
 *
 * Diadaptasi dari playground "Sun Rays Cone" basement.studio, tapi TIDAK bisa
 * dipakai apa adanya — demo itu matahari dilihat dari satu sisi, di sini
 * lampunya dikelilingi kamera tour. Empat perubahan wajib (detail di masing-
 * masing bagian di bawah):
 *
 *   1. Kerucut PENUH 360°, bukan setengah (thetaLength Math.PI).
 *   2. Redaman sudut pandang — tanpa ini 360° terlihat seperti tabung padat.
 *   3. depthWrite mati + depth fade, supaya tidak memotong keras di lantai.
 *   4. Noise dibangkitkan prosedural, bukan /textures/fbm-noise.png.
 *
 * Efek ini MURNI hiasan: tidak menyinari apa pun. Cahaya di lantai sudah ada
 * di lightmap; yang diisi komponen ini cuma udara di antaranya. Jangan diganti
 * <spotLight> asli — itu menyentuh 291 objek statis dan mengembalikan scene ke
 * ~14 FPS (lihat CharacterLights.tsx).
 */

// ── Noise prosedural ────────────────────────────────────────────────────────
// Aslinya memuat /textures/fbm-noise.png. Kita bangkitkan sendiri: satu baris
// piksel sudah cukup (shader mengunci sampling di uv.y = 0.5), jadi asetnya
// tidak sepadan dengan ongkos request-nya.
//
// Noise-nya WAJIB nyambung di ujung (u=0 dan u=1 bertemu). Di kerucut 360°
// uv.x melingkari seluruh keliling, jadi noise yang tidak tiling menghasilkan
// satu garis jahitan vertikal yang jelas terlihat saat kamera memutarinya.
// Karena itu tiap oktaf memakai lattice sebesar frekuensinya dan indeksnya
// di-modulo — bukan noise acak biasa.

const NOISE_WIDTH = 512;

function hash(i: number, seed: number): number {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** FBM 1D yang mulus dan tiling pada rentang u = 0..1. */
function tilingFbm(u: number, octaves: number, seed: number): number {
  let value = 0;
  let amp = 0.5;
  let freq = 4;

  for (let o = 0; o < octaves; o++) {
    const x = u * freq;
    const i0 = Math.floor(x) % freq;
    const i1 = (i0 + 1) % freq; // modulo inilah yang bikin sambungannya mulus
    const t0 = x - Math.floor(x);
    const t = t0 * t0 * (3 - 2 * t0); // smoothstep, biar tidak patah-patah

    const a = hash(i0, seed + o);
    const b = hash(i1, seed + o);
    value += (a + (b - a) * t) * amp;

    amp *= 0.5;
    freq *= 2;
  }
  return value;
}

/** Seed 7 — dipilih karena sebarannya paling enak setelah diregangkan:
 *  ~9% gelap, ~61% tengah, ~31% terang. Seed lain menumpuk di tengah
 *  (sinarnya jadi rata) atau kelewat terang. */
const NOISE_SEED = 7;

function makeNoiseTexture(): DataTexture {
  // Jumlah oktaf yang teredam menghasilkan rentang sempit — mentahnya cuma
  // ~0.20..0.72, tidak pernah menyentuh 0 atau 1. Kalau dipakai apa adanya,
  // smoothstep(0.2, 0.8) di shader hampir tidak pernah jenuh dan sinarnya
  // jadi kabut rata tanpa berkas yang jelas. Jadi diregangkan dulu ke 0..1.
  const raw = new Float32Array(NOISE_WIDTH);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < NOISE_WIDTH; i++) {
    const v = tilingFbm(i / NOISE_WIDTH, 4, NOISE_SEED);
    raw[i] = v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;

  const data = new Uint8Array(NOISE_WIDTH * 4);
  for (let i = 0; i < NOISE_WIDTH; i++) {
    const v = Math.round(((raw[i] - min) / span) * 255);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new DataTexture(data, NOISE_WIDTH, 1, RGBAFormat);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// Satu tekstur dipakai bersama semua kerucut — isinya identik, tidak ada
// gunanya membuat ulang per lampu.
let sharedNoise: DataTexture | null = null;
function getNoise(): DataTexture {
  if (!sharedNoise) sharedNoise = makeNoiseTexture();
  return sharedNoise;
}

// ── Shader ──────────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  #include <common>

  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying float vViewZ;
  varying float vAxisDist;

  uniform vec3 uAxisPoint;

  void main() {
    vUv = uv;

    // Jarak mendatar dari kamera ke SUMBU kerucut. Sumbunya tegak, jadi
    // komponen y dibuang — hasilnya sama untuk seluruh tinggi kerucut,
    // sehingga memudarnya serempak dan tidak menyisakan batas.
    vec3 camWorld = (inverse(viewMatrix) * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vAxisDist = length(camWorld.xz - uAxisPoint.xz);

    // Normal di ruang pandang — dipakai untuk redaman sudut di fragment.
    vViewNormal = normalize(normalMatrix * normal);

    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    // Dipakai untuk depth fade. Nilainya negatif di depan kamera.
    vViewZ = viewPosition.z;

    gl_Position = projectionMatrix * viewPosition;
  }
`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <packing>

  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying float vViewZ;
  varying float vAxisDist;

  uniform float uNearFadeStart;
  uniform float uNearFadeEnd;
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uBaseAlpha;
  uniform float uGlowAlpha;
  uniform float uTopFadeMin;
  uniform vec3 uRaysColor;
  uniform vec3 uGlowColor;
  uniform float uRaysStepMin;
  uniform float uRaysStepMax;
  uniform float uGlowStepMin;
  uniform float uAnglePower;
  uniform float uSpeed;

  uniform sampler2D uDepth;
  uniform vec2 uResolution;
  uniform float uCameraNear;
  uniform float uCameraFar;
  uniform float uDepthFade;

  uniform float uDither;
  uniform float uDitherScale;
  uniform float uDitherLevels;

  // Bayer 4x4 tanpa array — indexing dinamis pada array/mat4 bermasalah di
  // sebagian driver, versi fract() ini aman di mana saja.
  //
  // Perhatikan floor() dipakai pada KEDUA komponen sebelum dipakai berhitung.
  // Kalau a.y mentah yang dipakai (mudah kelewat), 16 nilainya masih beda-beda
  // tapi jaraknya tidak rata — tangganya jadi 0.031/0.094, bukan 0.0625 —
  // sehingga sebagian tingkat dither melompat lebih besar dari yang lain.
  float bayer2(vec2 a) {
    vec2 f = floor(a);
    return fract(f.x * 0.5 + f.y * f.y * 0.75);
  }
  float bayer4(vec2 a) {
    return bayer2(0.5 * a) * 0.25 + bayer2(a);
  }

  float readDepth(vec2 uv) {
    float fragCoordZ = texture2D(uDepth, uv).r;
    return perspectiveDepthToViewZ(fragCoordZ, uCameraNear, uCameraFar);
  }

  void main() {
    // ── Sinar dari noise ────────────────────────────────────────────────────
    vec2 raysNoiseUv = vUv;
    // Cuma satu baris piksel yang dipakai; teksturnya memang setinggi 1px.
    raysNoiseUv.y = 0.5;
    // Digeser terhadap waktu supaya sinarnya perlahan berputar mengelilingi
    // kerucut.
    raysNoiseUv.x += uTime * uSpeed;

    float noise = texture2D(uTexture, raysNoiseUv).r;

    // Ambil hanya rentang noise yang kita mau jadi sinar. Dekat nilai min
    // sinarnya lemah dan cepat pudar, dekat max lebih kuat dan bertahan.
    float rayFactor = smoothstep(uRaysStepMin, uRaysStepMax, noise);
    // Sinar meredup ke bawah sepanjang kerucut.
    float rayFade = vUv.y - rayFactor * 0.1;

    // uv.y = 1 di ujung atas (di lampu). Ini memudarkan ujung runcingnya
    // supaya tidak terlihat sebagai titik keras yang menempel di kap lampu.
    float coneTopFade = 1.0 - smoothstep(uTopFadeMin, 1.0, vUv.y);
    // Pendar sumber cahaya, makin kuat mendekati lampu.
    float sourceGlowFactor = smoothstep(uGlowStepMin, 1.0, vUv.y);

    vec3 color = uRaysColor * rayFactor;
    color = mix(color, uGlowColor, sourceGlowFactor);

    float alpha = uBaseAlpha * rayFade * rayFactor;
    alpha = mix(alpha, uGlowAlpha, sourceGlowFactor);
    alpha *= coneTopFade;

    // ── PERUBAHAN 2: redaman sudut pandang ──────────────────────────────────
    // Ini yang membuat kerucut 360° terbaca sebagai VOLUME, bukan tabung.
    // Panjang lintasan pandang menembus kerucut paling jauh di tengah siluet
    // dan nol di tepinya — persis seperti tali busur lingkaran. Tanpa suku
    // ini, tepi kerucut punya batas keras dan bentuknya langsung terbaca
    // sebagai cangkang silinder.
    //
    // Demo aslinya tidak butuh ini karena hanya separuh kerucut yang
    // digambar dan kameranya tidak pernah pindah ke sisi lain.
    vec3 n = vec3(vViewNormal.x, vViewNormal.y, abs(vViewNormal.z));
    alpha *= pow(clamp(dot(n, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), uAnglePower);

    // ── PERUBAHAN 3: depth fade (soft particle) ─────────────────────────────
    // Tanpa ini kerucut memotong keras di lantai dan di tiap benda yang
    // ditembusnya — di meeting room ada 6 lampu tepat di atas meja, dan
    // potongannya terlihat sebagai elips tegas di permukaan meja.
    if (uDepthFade > 0.5 && uResolution.x > 0.0) {
      vec2 screenUv = gl_FragCoord.xy / uResolution;
      // Keduanya viewZ (negatif di depan kamera). Selisih kecil = kerucut
      // hampir menyentuh geometri → dipudarkan.
      alpha *= smoothstep(0.0, 1.0, vViewZ - readDepth(screenUv));
    }

    // ── Pudar saat kamera dekat ─────────────────────────────────────────────
    // Kerucut yang hampir bersentuhan dengan kamera memenuhi sebagian besar
    // layar dan berubah dari "berkas cahaya" jadi "kaca berkabut" yang
    // menghalangi ruangan — terlihat jelas di Meeting room, yang punya 6
    // kerucut dan salah satunya tepat di sebelah posisi kamera.
    //
    // Diukur dari jarak ke SUMBU kerucut (bukan ke titik lampu) supaya
    // seluruh tinggi kerucut memudar serempak; kalau dipakai jarak ke titik,
    // bagian bawah kerucut memudar lebih lambat dari bagian atas dan
    // batasnya justru jadi kelihatan.
    //
    // Ini juga yang membuat kamera BOLEH berada di dalam kerucut: pada jarak
    // itu alpha-nya sudah nol, jadi tidak perlu lagi menebak-nebak lampu mana
    // yang tertembus kamera.
    alpha *= smoothstep(uNearFadeStart, uNearFadeEnd, vAxisDist);

    // ── Dither ──────────────────────────────────────────────────────────────
    // Kembaran look PS1: gradien halus diganti pola kotak-kotak.
    //
    // MEN-KUANTISASI ke beberapa tingkat, BUKAN mem-binerkan. Versi biner
    // (step(bayer, alpha)) terlihat benar secara rata-rata tapi hasilnya
    // bencana di scene ini:
    //
    //   step() menaikkan 1/16 piksel ke alpha PENUH walaupun alpha aslinya
    //   cuma ~0,05. Piksel putih penuh itu menembus ambang Bloom 0.95 di
    //   Scene.tsx, lalu bloom mengoleskannya ke sekitarnya — dengan 12 kerucut
    //   yang saling tumpang, SELURUH layar tertutup kabut kotak-kotak dan
    //   ruangan nyaris tak terlihat. Terbukti dengan uji 2x2: dither mati =
    //   bagus, dither biner nyala = layar berkabut, dengan depth fade sama.
    //
    // Bentuk floor(x*L + bayer)/L tetap memberi pola kotak yang sama, tapi
    // alpha hasilnya tidak pernah melampaui tingkat di atas nilai aslinya,
    // jadi tidak ada piksel putih penuh yang memancing bloom.
    if (uDither > 0.5) {
      float levels = max(1.0, uDitherLevels);
      float b = bayer4(gl_FragCoord.xy / uDitherScale);
      alpha = floor(alpha * levels + b) / levels;
    }

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));

    // Ikut tone mapping seperti permukaan lain. Sengaja TIDAK di-bypass
    // seperti material emissive di Office.tsx: kerucut ini atmosfer, bukan
    // sumber cahaya, dan kalau lolos dari ACES ujung pendarnya menembus
    // ambang Bloom 0.95 di Scene.tsx lalu memutih.
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface LightConeProps {
  /** Posisi ujung atas kerucut — taruh di bohlam/kap lampu. */
  position: [number, number, number];
  /** Tinggi kerucut ke bawah. Setel supaya mendarat di lantai. */
  height?: number;
  radiusTop?: number;
  radiusBottom?: number;
  color?: string;
  glowColor?: string;
  /** Kepekatan sinar secara keseluruhan. */
  alpha?: number;
  /** Kepekatan pendar di dekat lampu. */
  glowAlpha?: number;
  /** Makin besar makin cepat tepi kerucut memudar. 8-16 wajar. */
  anglePower?: number;
  /** Kecepatan putar sinar. */
  speed?: number;
  /**
   * Depth texture bersama dari LightCones. Tanpa ini kerucut tetap tampil,
   * cuma memotong keras di lantai.
   */
  depthBuffer?: DepthTexture | null;
  dither?: boolean;
  ditherScale?: number;
  /**
   * Jumlah tingkat alpha yang disisakan dither. Makin kecil makin kasar/PS1.
   * JANGAN 1 — itu sama dengan biner dan mengembalikan bug kabut (lihat
   * catatan panjang di bagian dither pada shader).
   */
  ditherLevels?: number;
  /**
   * Jarak mendatar kamera-ke-sumbu (meter) tempat kerucut mulai muncul, dan
   * tempat ia sudah tampil penuh. Di bawah `nearFadeStart` kerucut hilang.
   *
   * Ini pengganti pendekatan lama yang menandai lampu "kamera bisa masuk" satu
   * per satu: cara itu rapuh (harus diukur ulang tiap VIEWS berubah) dan tetap
   * meninggalkan kerucut raksasa memenuhi layar. Default 1,1–2,2 m dipilih dari
   * pengukuran: view terdekat yang WAJAR masih 1,49 m (Office vs officeB),
   * sedangkan Function berada 0,40 m dari sumbu frCeil2 — di bawah
   * nearFadeStart, jadi hilang seperti yang diinginkan.
   */
  nearFadeStart?: number;
  nearFadeEnd?: number;
  /** Tampilkan rangka kerucut untuk menyetel posisi & sudut. */
  debug?: boolean;
}

export default function LightCone({
  position,
  height = 3.6,
  radiusTop = 0.12,
  radiusBottom = 1.3,
  color = "#ffdfb0",
  glowColor = "#fff3dc",
  alpha = 0.5,
  glowAlpha = 0.35,
  anglePower = 10,
  speed = 0.023,
  depthBuffer = null,
  dither = true,
  ditherScale = 2,
  ditherLevels = 6,
  nearFadeStart = 1.1,
  nearFadeEnd = 2.2,
  debug = false,
}: LightConeProps) {
  const matRef = useRef<ShaderMaterial>(null);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const camera = useThree((s) => s.camera);

  // Objek uniform dibuat lewat initializer useState — pola yang sama dipakai
  // drei untuk material internalnya.
  //
  // Kenapa bukan useMemo: uniform three.js memang HARUS dimutasi tiap frame
  // (uTime), sedangkan aturan lint react-hooks/immutability melarang memutasi
  // nilai yang pernah jadi argumen hook — dan hasil useMemo ikut masuk ke
  // dependency array. State yang tidak pernah di-set aman dimutasi dan tetap
  // boleh dibaca saat render (ref tidak boleh).
  //
  // Dibuat sekali seumur komponen: mengganti objek uniform memicu kompilasi
  // ulang shader, jadi perubahan prop DISALIN ke dalamnya, bukan bikin baru.
  const [uniforms] = useState(() => ({
    uTexture: { value: getNoise() as unknown },
    uTime: { value: 0 as unknown },
    uBaseAlpha: { value: alpha as unknown },
    uGlowAlpha: { value: glowAlpha as unknown },
    uTopFadeMin: { value: 0.75 as unknown },
    uRaysColor: { value: new Color(color) as unknown },
    uGlowColor: { value: new Color(glowColor) as unknown },
    uRaysStepMin: { value: 0.2 as unknown },
    uRaysStepMax: { value: 0.8 as unknown },
    uGlowStepMin: { value: 0.5 as unknown },
    uAnglePower: { value: anglePower as unknown },
    uSpeed: { value: speed as unknown },
    uDepth: { value: depthBuffer as unknown },
    uResolution: { value: new Vector2(0, 0) as unknown },
    uCameraNear: { value: 0 as unknown },
    uCameraFar: { value: 1 as unknown },
    uDepthFade: { value: (depthBuffer ? 1 : 0) as unknown },
    uDither: { value: (dither ? 1 : 0) as unknown },
    uDitherScale: { value: ditherScale as unknown },
    uDitherLevels: { value: ditherLevels as unknown },
    uAxisPoint: { value: new Vector3(...position) as unknown },
    uNearFadeStart: { value: nearFadeStart as unknown },
    uNearFadeEnd: { value: nearFadeEnd as unknown },
  }));

  /**
   * ⚠️ SEMUA penulisan uniform harus lewat `matRef.current.uniforms`, JANGAN
   * ke objek `uniforms` di atas.
   *
   * R3F tidak memakai objek yang kita oper apa adanya. Di applyProps ia
   * MENYALIN tiap kotak uniform ke objek milik material sendiri
   * (`Object.assign(targetUniform, uniform)`) demi menjaga referensi tetap
   * stabil. Jadi objek kita jadi yatim: menulis ke situ tidak berpengaruh
   * apa pun ke shader.
   *
   * Ini pernah lolos diam-diam dan efeknya berbahaya justru karena tidak
   * error: uTime tetap 0 (sinar diam), dan uCameraNear/uCameraFar tetap di
   * nilai awal 0/1 sehingga perspectiveDepthToViewZ menghasilkan angka ngawur
   * — depth fade-nya bukan mati, tapi MENYALA SALAH dan menutupi layar
   * seperti kabut. Terdeteksi dengan membaca balik nilai uniform dari
   * material yang sungguhan dipakai, bukan dari objek yang kita oper.
   */
  const readUniforms = (): Record<string, { value: unknown }> | null =>
    (matRef.current?.uniforms as Record<string, { value: unknown }>) ?? null;

  useLayoutEffect(() => {
    const u = readUniforms();
    if (!u) return;
    u.uBaseAlpha.value = alpha;
    u.uGlowAlpha.value = glowAlpha;
    (u.uRaysColor.value as Color).set(color);
    (u.uGlowColor.value as Color).set(glowColor);
    u.uAnglePower.value = anglePower;
    u.uSpeed.value = speed;
    u.uDepth.value = depthBuffer;
    u.uDepthFade.value = depthBuffer ? 1 : 0;
    u.uDither.value = dither ? 1 : 0;
    u.uDitherScale.value = ditherScale;
    u.uDitherLevels.value = ditherLevels;
    u.uNearFadeStart.value = nearFadeStart;
    u.uNearFadeEnd.value = nearFadeEnd;
    (u.uAxisPoint.value as Vector3).set(position[0], position[1], position[2]);
  }, [
    alpha,
    glowAlpha,
    color,
    glowColor,
    anglePower,
    speed,
    depthBuffer,
    dither,
    ditherScale,
    ditherLevels,
    nearFadeStart,
    nearFadeEnd,
    position,
  ]);

  // Resolusi harus dalam piksel BUFFER (sudah dikali dpr), bukan piksel CSS —
  // gl_FragCoord memakai skala buffer. Kalau dipakai ukuran CSS, depth fade-nya
  // salah sampling begitu dpr bukan 1 (Canvas di sini dpr sampai 1.5).
  useLayoutEffect(() => {
    const u = readUniforms();
    if (!u) return;
    (u.uResolution.value as Vector2).set(size.width * dpr, size.height * dpr);
  }, [size, dpr]);

  useFrame(({ clock }) => {
    const u = readUniforms();
    if (!u) return;
    u.uTime.value = clock.getElapsedTime();
    // Kamera minigame billiard mengubah near/far & fov saat transisi, jadi
    // dibaca tiap frame, bukan dipasang sekali.
    const cam = camera as typeof camera & { near: number; far: number };
    u.uCameraNear.value = cam.near;
    u.uCameraFar.value = cam.far;
  });

  // Geometri dipusatkan di y=0, jadi digeser turun setengah tinggi supaya
  // ujung sempitnya (radiusTop) tepat di `position` = lampunya.
  const args = useMemo(
    () =>
      [
        radiusTop,
        radiusBottom,
        height,
        // ── PERUBAHAN 1: kerucut PENUH ───────────────────────────────────────
        // Aslinya thetaStart Math.PI/2, thetaLength Math.PI = separuh saja.
        // Cukup untuk demo satu sudut pandang; di tour kamera memutari
        // ruangan dan separuhnya akan menghilang.
        //
        // 32 segmen radial, 1 segmen tinggi, openEnded = true (tanpa tutup:
        // tutupnya akan terlihat sebagai cakram padat).
        32,
        1,
        true,
        0,
        Math.PI * 2,
      ] as const,
    [radiusTop, radiusBottom, height],
  );

  return (
    <group position={position}>
      <mesh position={[0, -height / 2, 0]} renderOrder={10}>
        <cylinderGeometry args={args as unknown as never} />
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          // Wajib mati. `transparent` TIDAK otomatis mematikan ini — satu
          // kerucut masih aman, tapi begitu ada belasan mereka saling
          // memotong dan z-fighting.
          depthWrite={false}
          // FrontSide, bukan DoubleSide. Redaman sudut di atas sudah memodelkan
          // panjang lintasan tembus; kalau dua sisi ikut digambar, kepekatannya
          // terhitung dua kali di tengah.
          //
          // Kamera yang masuk ke dalam kerucut TIDAK lagi perlu DoubleSide:
          // pudar-saat-dekat sudah membuat alpha-nya nol jauh sebelum kamera
          // menembus dindingnya.
          side={FrontSide}
          // Jangan ikut pass bayangan (ContactShadowsRig.tsx).
          //
          // `scene.overrideMaterial` mengganti material SEUTUHNYA — transparent,
          // depthWrite, renderOrder, side di atas semuanya dibuang, jadi kerucut
          // ter-rasterisasi sebagai silinder PADAT dan menjatuhkan gumpalan
          // gelap berbentuk kerucut di lantai.
          //
          // Saat ini kebetulan TIDAK terlihat: dua lampu office ada di z≈1,0
          // sementara catcher Office menutup z 3,20..8,00, jadi kerucutnya di
          // luar jangkauan (sudah diuji A/B — mematikan flag ini tidak mengubah
          // satu piksel pun). Flag-nya tetap dipasang karena begitu ada lampu
          // yang kerucutnya masuk area catcher — mis. `lamps` ditambah, atau
          // catcher diperluas ke arah z kecil — gumpalannya langsung muncul,
          // dan penyebabnya sulit ditebak dari gejalanya.
          allowOverride={false}
        />
      </mesh>

      {debug && (
        <mesh position={[0, -height / 2, 0]}>
          <cylinderGeometry args={args as unknown as never} />
          <meshBasicMaterial color="#00ff88" wireframe side={DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
