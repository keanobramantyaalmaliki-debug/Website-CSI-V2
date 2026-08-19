"use client";

/**
 * Debu melayang di udara kantor (10 Agu 2026).
 *
 * Lightmap memberi kita PERMUKAAN yang meyakinkan, tapi udara di antaranya
 * kosong sama sekali — itu sebabnya ruangan bisa terbaca seperti FOTO ruangan,
 * bukan ruangan. Beberapa ratus bintik yang menangkap cahaya mengisi kekosongan
 * itu. Hasil sampingannya yang justru paling berharga: bintik di kedalaman
 * berbeda bergeser dengan laju berbeda saat kamera bergerak (mouseParallax),
 * jadi ruangan mendapat VOLUME tanpa satu pun poligon baru.
 *
 * Hanya menyala di Lounge & Office — lihat DUSTY_ROOMS untuk alasannya dan
 * untuk cara "kamera sedang di ruangan mana" dijawab tanpa kotak per-ruangan.
 *
 * ── Kenapa kotak yang mengekor KAMERA, bukan kotak per RUANGAN ──────────────
 * Pilihan yang jelas adalah mengukur bounding box tiap ruangan lalu menaburkan
 * debu di dalamnya. Ditolak karena tiga hal:
 *
 *   1. Kerapatan jadi tidak seragam. Meeting Room dan Lounge beda volume jauh;
 *      jumlah bintik yang sama berarti satu ruangan berdebu dan satunya bersih.
 *   2. Sebagian besar bintik terbuang. Debu cuma terbaca dalam ~4 m dari lensa;
 *      bintik di ujung ruangan membayar draw call tanpa pernah terlihat.
 *   3. Ia butuh angka baru yang harus diukur ulang tiap kali denah berubah.
 *
 * Yang dipakai: bintik hidup di ruang DUNIA dan hanyut sendiri, tapi saat
 * digambar posisinya di-modulo terhadap posisi kamera (`wrap toroidal`).
 * Bintik yang keluar dari kotak 9 × 9 m di sekeliling kamera muncul kembali di
 * sisi seberangnya.
 *
 * ⚠️ Yang bikin ini bukan sekadar "menempelkan debu ke kamera": modulo hanya
 * mengubah posisi bintik SAAT IA MELEWATI BATAS kotak. Selama di dalam kotak,
 * koordinatnya benar-benar diam di dunia — jadi parallax-nya utuh. Kalau
 * bintiknya disimpan relatif terhadap kamera (`p = cam + offset`), seluruh
 * kumpulan debu akan ikut bergeser bersama kamera dan menempel di layar
 * seperti kotoran di lensa. Itu justru kebalikan dari yang dicari.
 *
 * Bonusnya gratis: saat kamera meluncur antar-ruangan, kotaknya ikut terbawa,
 * jadi debu tampak mengalir melewati lensa sepanjang perjalanan.
 *
 * ── Tembok yang menyembunyikan debu: GRATIS ────────────────────────────────
 * Karena kotaknya tidak tahu batas ruangan, sebagian bintik pasti jatuh di
 * dalam tembok atau di luar gedung. Itu TIDAK perlu ditangani: `depthTest`
 * menyala, dan tembok kantor opaque — bintik di baliknya gugur di uji
 * kedalaman persis seperti benda lain. Jadi geometri kantor yang jadi
 * pembatas ruangannya, bukan angka yang kita tulis di sini.
 *
 * ── Sumbu Y TIDAK ikut di-wrap ke kamera ───────────────────────────────────
 * X dan Z di-modulo terhadap kamera; Y tidak — ia dijepit di pita DUNIA yang
 * tetap (lihat Y_MIN/Y_MAX). Alasannya kamera duduk di y ≈ 1,1–1,6 sedangkan
 * kotak setinggi 2,5 m yang berpusat di kamera akan menaruh separuh debunya DI
 * BAWAH LANTAI. Pita dunia yang tetap membuat debu selalu berada di antara
 * lantai dan lampu gantung, di ruangan mana pun.
 *
 * ── Seluruh gerakan di GPU ─────────────────────────────────────────────────
 * Hanyut, wrap, dan fade dihitung di vertex shader. CPU cuma menulis DUA
 * uniform per frame (waktu + posisi kamera), berapa pun jumlah bintiknya —
 * bukan mengulang 900 posisi lalu mengunggah ulang buffer. Ongkosnya satu draw
 * call dan nol pekerjaan per-partikel di main thread.
 *
 * Penggeraknya `useFrame` biasa tanpa mesin detak sendiri, jadi ia ikut tidur
 * bersama FrameloopGate saat hero keluar layar (pelajaran PhysicsHeading,
 * 3 Agu).
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import {
  AdditiveBlending,
  Color,
  type Points,
  ShaderMaterial,
  Vector3,
} from "three";
import { useSceneStore, type RoomKey } from "@/lib/store/sceneStore";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import { ACTIVE_KEYS, VIEWS } from "./CameraController";
import { NO_BAKE_LAYER } from "./ContactShadowsRig";
import {
  REVEAL_BAND,
  REVEAL_X_FROM,
  REVEAL_X_TO,
  revealProgress,
} from "./revealSweep";

/**
 * Setengah lebar kotak wrap, meter. Kotak penuhnya 9 × 9 m.
 *
 * Dipilih sedikit LEBIH BESAR dari jangkauan pandang debu yang berguna (~3 m,
 * lihat FADE_FROM) supaya batas wrap selalu berada di daerah yang bintiknya
 * sudah pudar total. Kalau kotaknya dipersempit sampai mepet, loncatan wrap
 * terjadi di tempat bintik masih terlihat dan terbaca sebagai kedipan.
 *
 * Sekaligus lebih kecil dari ruangan terkecil, jadi bintik jarang jatuh jauh
 * di luar gedung tempat ia cuma jadi fragmen yang di-discard.
 */
const HALF_XZ = 4.5;

/** Jarak mulai memudar (m). Antara sini dan HALF_XZ alpha turun ke nol, jadi
 *  bintik menghilang MULUS sebelum sampai ke garis wrap — bukan lenyap
 *  mendadak. Ini satu-satunya alasan wrap tidak terlihat. */
const FADE_FROM = 2.9;

/**
 * Pita ketinggian debu, meter, di ruang DUNIA.
 *
 * Batas atas 2,55 diambil dari LAMP_TOP_Y = 2,11 di CameraController plus
 * sedikit ruang: di atas itu debu masuk ke rumpun lampu gantung dan menumpuk
 * tepat di bagian tercerah layar, yang membuatnya terbaca sebagai noise, bukan
 * debu. Batas bawah 0,05 menjaga bintik tidak muncul TEPAT di bidang lantai —
 * di situ z-fighting dengan lantai membuatnya berkedip.
 */
const Y_MIN = 0.05;
const Y_MAX = 2.55;

/** Laju naik rata-rata, m/detik. Sengaja SANGAT lambat: debu sungguhan
 *  praktis menggantung: yang membuatnya hidup itu sway di bawah, bukan ini.
 *  Tiap bintik mengalikannya dengan 0,6–1,4 (dari seed) supaya tidak ada
 *  kolom debu yang naik serempak. */
const RISE = 0.032;

/** Amplitudo goyang mendatar (m) dan lajunya (putaran/detik). 13 cm pada 0,05
 *  Hz = satu ayunan penuh ~20 detik. Di bawah ambang "terlihat beranimasi",
 *  cukup untuk membuat bintik tidak terbaca sebagai titik mati. */
const SWAY = 0.13;
const SWAY_HZ = 0.05;

/**
 * Ukuran bintik dalam piksel pada jarak 1 m, sebelum dikali device pixel ratio.
 *
 * Di shader hasilnya di-`floor` ke piksel bulat, BUKAN dibiarkan pecahan.
 * Alasannya sama dengan NearestFilter di seluruh proyek ini: titik selebar 1,7
 * px di-rasterisasi jadi kotak buram bertepi lembut — yaitu partikel bergaya
 * modern. Dibulatkan ke bawah, tiap bintik jadi kotak tegas 1, 2, atau 3 px
 * dan sejalan dengan tampilan PS1 yang dipakai di mana-mana.
 *
 * Konsekuensi yang DISENGAJA: mayoritas debu berakhir 1 px. Debu memang harus
 * hampir tak terlihat sendiri-sendiri; yang terbaca adalah kumpulannya.
 */
const PX_AT_1M = 3.0;

/** Batas atas ukuran bintik (px, sudah dikali dpr). Tanpa ini bintik yang
 *  kebetulan lewat sangat dekat lensa jadi kotak besar yang menutupi layar. */
const PX_MAX = 3.0;

/**
 * Warna debu — putih hangat, disamakan dengan ambient scene (#ffbd75) supaya
 * bintik terbaca sebagai "menangkap cahaya ruangan", bukan sebagai benda
 * bercahaya sendiri.
 *
 * new Color() dari hex mengonversi sRGB → linear otomatis (ColorManagement
 * aktif di three r155+), dan itu yang benar di sini dengan alasan yang SAMA
 * seperti di MaintenanceHologram: ShaderMaterial mentah tidak menyertakan
 * <colorspace_fragment> maupun <tonemapping_fragment>, jadi nilai yang kita
 * tulis masuk ke render target apa adanya lalu di-encode pass akhir
 * EffectComposer.
 */
const COLOR = new Color("#ffe6c8");

/**
 * Alpha puncak satu bintik, dan pengali kecerahan sebelum ditulis.
 *
 * ⚠️ Perkalian keduanya HARUS dijaga jauh di bawah ambang Bloom 0,95 di
 * Scene.tsx, dan aritmetikanya beda dari material biasa karena blending di
 * sini ADITIF: hasil akhirnya `src.rgb × src.a + dst`, artinya debu MENAMBAH
 * ke piksel yang sudah ada alih-alih menggantikannya.
 *
 *   tambahan puncak = GAIN × ALPHA = 0,55 × 0,50 = 0,275
 *
 * Di atas dinding krem yang paling terang (~0,6 linear) hasilnya ~0,875 —
 * masih di bawah 0,95, jadi debu TIDAK memicu bloom di mana pun. Kalau salah
 * satu angka ini dinaikkan, hitung ulang penjumlahan itu: debu yang mekar
 * berhenti terbaca sebagai debu dan berubah jadi kunang-kunang.
 *
 * Melewati ACES sepenuhnya (sama seperti lampu & LED strip yang toneMapped-nya
 * dimatikan di Office.tsx), jadi angka di sini sampai ke composer tanpa
 * diredam — jangan bandingkan dengan nilai material standar.
 */
const ALPHA = 0.5;
const GAIN = 0.55;

/** Jumlah bintik. Yang coarse jauh lebih sedikit: layar HP kecil, dan bintik
 *  1 px di sana praktis tak terbaca — kerapatan yang sama cuma membayar fill
 *  rate tanpa terlihat. */
const COUNT_FINE = 900;
const COUNT_COARSE = 360;

/**
 * Ruangan yang berdebu — Lounge & Office saja.
 *
 * Alasannya bukan teknis melainkan pilihan: keduanya ruang santai yang ditembus
 * cahaya rendah (LED strip lantai, lampu gantung), tempat debu terbaca sebagai
 * atmosfer. Meeting Room dan Function Room dipakai untuk MEMBACA sesuatu —
 * layar TV, papan tulis, presentasi — dan di situ bintik yang lewat di depan
 * layar berubah jadi gangguan.
 */
const DUSTY_ROOMS: readonly RoomKey[] = ["Lounge", "Office"];

/**
 * ── Kenapa jangkar kamera, bukan kotak ruangan (dan bukan sumbu X) ──────────
 *
 * Butuh cara menjawab "kamera sedang di ruangan mana" TANPA menghidupkan lagi
 * kotak per-ruangan yang ditolak di kepala berkas. Dua kandidat gugur:
 *
 *   • Ambang sumbu X (seperti revealSweep). GAGAL: Lounge (x 1,65) dan Function
 *     (x 1,46) praktis satu koordinat X — yang memisahkan keduanya sumbu Z.
 *     Ambang X mana pun akan menyalakan/mematikan keduanya bersamaan.
 *   • Ruangan aktif dari store. Bisa, tapi nilainya berubah SAAT DIKLIK,
 *     sementara kameranya baru mulai meluncur. Debu akan padam mendadak saat
 *     kamera masih berada di tengah Lounge.
 *
 * Yang dipakai: jarak ke JANGKAR KAMERA tiap ruangan — VIEWS di
 * CameraController, angka yang sudah ada dan sudah diverifikasi di Blender.
 * Nol angka baru untuk diukur, dan otomatis ikut kalau framing ruangan digeser.
 *
 * Gerbangnya = seberapa jauh LEBIH DEKAT kamera ke jangkar berdebu terdekat
 * dibanding jangkar bersih terdekat. Itu batas Voronoi antar-ruangan dengan
 * pita lembut selebar BLEND di perbatasannya, dan hasilnya persis yang
 * diinginkan saat kamera meluncur Lounge → Meeting: debu bertahan sepanjang
 * bagian yang masih melewati Office, lalu memudar saat benar-benar menyeberang.
 *
 * Sengaja MURNI dari posisi, tanpa peredaman terhadap waktu: nilainya jadi
 * fungsi dari posisi kamera saja, sehingga dua screenshot pada kamera yang sama
 * selalu identik — syarat yang sama yang membuat rng() di bawah di-seed tetap.
 */
const ANCHORS = (dusty: boolean) =>
  ACTIVE_KEYS.filter((k) => DUSTY_ROOMS.includes(k) === dusty).map(
    (k) => VIEWS[k].pos,
  );
const DUSTY_ANCHORS = ANCHORS(true);
const CLEAN_ANCHORS = ANCHORS(false);

/**
 * Setengah lebar pita perbatasan, meter.
 *
 * Diukur pada luncuran TERPANJANG (Lounge → Meeting, 17,6 m): pada 2 m debu
 * padam dalam ~11% durasi luncuran, yang masih terbaca sebagai saklar. 3,5 m
 * merentangnya jadi ~20% — cukup untuk terbaca sebagai "ditinggalkan", bukan
 * dimatikan.
 *
 * Batas atasnya jelas: jangkar berdebu terdekat ke jangkar bersih terpisah
 * 11,4 m, jadi apa pun di bawah ~5,7 m menjaga keempat ruangan tetap jenuh
 * penuh (gerbang persis 1 atau 0 di titik pandang masing-masing). Di atas itu
 * ruangan mulai "setengah berdebu" di tempat orang berhenti.
 */
const GATE_BLEND = 3.5;

/** Jarak MENDATAR (XZ) ke jangkar terdekat. Sumbu Y sengaja diabaikan: semua
 *  jangkar duduk di 1,1–1,7 m, jadi ia cuma menambah derau pada perbandingan
 *  yang sebetulnya soal denah. */
function nearestXZ(anchors: readonly Vector3[], p: Vector3) {
  let best = Infinity;
  for (const a of anchors) {
    const dx = a.x - p.x;
    const dz = a.z - p.z;
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/** smoothstep GLSL, versi JS — dipakai supaya bentuk kurva gerbangnya sama
 *  dengan peredupan lain di shader. */
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Saklar mati untuk membandingkan berdampingan: buka halaman dengan `?dust=0`.
 *
 * ⚠️ Sengaja TIDAK dipagari `import.meta.env.DEV`, beda dari `?glitch=1` di
 * CharacterGlitch dan `?holo=1` di MaintenanceHologram. Keduanya MEMAKSA efek
 * menyala terus — perilaku yang tidak boleh bisa dipicu pengunjung di
 * produksi. Yang ini cuma MEMATIKAN hiasan, jadi paling buruk yang bisa
 * dilakukan orang asing pada dirinya sendiri adalah melihat kantor tanpa debu.
 * Dibiarkan hidup di produksi supaya A/B bisa dilakukan di build yang benar-
 * benar dikirim, bukan cuma di dev.
 */
const DISABLED =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("dust") === "0";

/** Arah sapuan reveal, diturunkan dari konstanta sapuannya sendiri — bukan
 *  angka terpisah yang bisa lupa disesuaikan kalau arahnya dibalik. Pola yang
 *  sama dengan REVEAL_DIR di MaintenanceHologram. */
const REVEAL_DIR = Math.sign(REVEAL_X_TO - REVEAL_X_FROM) || 1;

/**
 * PRNG deterministik (LCG 32-bit), BUKAN Math.random().
 *
 * Alasannya bisa diukur: scripts/shoot.mjs & measure-frames.mjs membandingkan
 * screenshot antar-jalankan lewat diff piksel. Dengan Math.random(), taburan
 * debu berubah tiap reload dan SETIAP diff jadi tidak nol — sinyal
 * "kameranya bergeser" tenggelam di derau debu. Seed tetap membuat kantor
 * berdebu identik di tiap muat.
 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const VERT = /* glsl */ `
  attribute vec3 aSeed;

  uniform float uTime;
  uniform vec3  uCam;
  uniform float uSize;
  uniform float uGate;
  uniform float uRevealProgress;

  varying float vAlpha;

  const float TAU = 6.28318530718;

  void main() {
    vec3 p = position;

    // ── Goyang mendatar ──────────────────────────────────────────
    // sin & cos dengan fase berbeda per bintik: hasilnya lintasan
    // elips kecil, bukan getaran maju-mundur satu sumbu yang terbaca
    // sebagai osilasi mesin.
    float ph = aSeed.x * TAU;
    p.x += sin( uTime * ${SWAY_HZ.toFixed(3)} * TAU + ph ) * ${SWAY.toFixed(3)};
    p.z += cos( uTime * ${SWAY_HZ.toFixed(3)} * TAU + aSeed.y * TAU ) * ${SWAY.toFixed(3)};

    // ── Naik perlahan, melingkar di dalam pita dunia ──────────────
    // mod() di sini yang membuat bintik yang mencapai batas atas
    // muncul lagi dari bawah, jadi jumlahnya kekal tanpa perlu
    // "melahirkan" partikel baru di CPU.
    float band  = ${(Y_MAX - Y_MIN).toFixed(3)};
    float speed = ${RISE.toFixed(4)} * ( 0.6 + aSeed.z * 0.8 );
    p.y = ${Y_MIN.toFixed(3)} + mod( p.y - ${Y_MIN.toFixed(3)} + uTime * speed, band );

    // ── Wrap toroidal terhadap kamera (X & Z saja) ────────────────
    // Inilah inti komponennya. Selama bintik ada di dalam kotak,
    // baris ini mengembalikan p.xz APA ADANYA — koordinat dunia yang
    // diam, jadi parallax utuh. Ia baru mengubah sesuatu saat bintik
    // melewati tepi, dan di tepi itu alpha-nya sudah nol (lihat
    // edgeFade), sehingga loncatannya tak pernah terlihat.
    vec2 half2 = vec2( ${HALF_XZ.toFixed(2)} );
    p.xz = uCam.xz + mod( p.xz - uCam.xz + half2, half2 * 2.0 ) - half2;

    vec4 mv = modelViewMatrix * vec4( p, 1.0 );
    gl_Position = projectionMatrix * mv;

    // Ukuran mengecil dengan jarak (pembagian perspektif manual —
    // gl_PointSize tidak melewatinya sendiri), lalu DIBULATKAN KE
    // BAWAH ke piksel bulat supaya tepinya tetap kotak tegas.
    gl_PointSize = clamp( floor( uSize / max( -mv.z, 0.05 ) ), 1.0, ${PX_MAX.toFixed(1)} );

    // ── Peredupan ────────────────────────────────────────────────
    // edgeFade: menyembunyikan garis wrap (lihat di atas).
    float dist     = length( p.xz - uCam.xz );
    float edgeFade = 1.0 - smoothstep( ${FADE_FROM.toFixed(2)}, ${HALF_XZ.toFixed(2)}, dist );

    // nearFade: bintik yang lewat SANGAT dekat lensa jadi kotak besar
    // yang menarik mata ke sesuatu yang seharusnya tak disadari.
    // Dipudarkan di bawah ~0,9 m, bukan dibuang, supaya hilangnya
    // mulus.
    float nearFade = smoothstep( 0.25, 0.90, -mv.z );

    // Gerbang sapuan "kantor terbentuk" — rumus yang sama persis
    // dengan revealSweep.ts & MaintenanceHologram, memakai objek
    // uniform yang sama. Bedanya cuma di sini dihitung PER BINTIK
    // (vertex), bukan per fragmen: bintik lebarnya 1–3 px, jadi
    // dither per-fragmen tidak akan terlihat dan cuma membayar ALU.
    float head = mix(
      ${REVEAL_X_FROM.toFixed(2)} - ${REVEAL_BAND.toFixed(2)} * ${REVEAL_DIR.toFixed(1)},
      ${REVEAL_X_TO.toFixed(2)} + ${REVEAL_BAND.toFixed(2)} * ${REVEAL_DIR.toFixed(1)},
      uRevealProgress
    );
    float ahead = ( p.x - head ) * ${REVEAL_DIR.toFixed(1)};
    float show  = 1.0 - smoothstep( 0.0, ${REVEAL_BAND.toFixed(2)}, ahead );

    // Kecerahan per bintik 0,55–1,0: tanpa variasi ini seluruh debu
    // punya nilai yang sama persis dan terbaca sebagai kisi titik,
    // bukan taburan.
    float bright = 0.55 + aSeed.z * 0.45;

    vAlpha = ${ALPHA.toFixed(2)} * bright * edgeFade * nearFade * show * uGate;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    // Bintik yang sudah tak terlihat dibuang sebelum menyentuh
    // blending — menghemat fill rate justru pada bintik terjauh yang
    // jumlahnya paling banyak.
    if ( vAlpha < 0.004 ) discard;

    // gl_PointCoord sengaja TIDAK dipakai. Memakainya untuk membuat
    // titik bulat (mis. discard di luar radius 0,5, atau alpha yang
    // meredup ke tepi) menghasilkan partikel lembut khas engine
    // modern. Kotak penuh tanpa gradasi itu justru yang dicari:
    // sejalan dengan NearestFilter dan tepi bergigi yang dipakai di
    // seluruh proyek.
    gl_FragColor = vec4( uColor * ${GAIN.toFixed(2)}, vAlpha );
  }
`;

export default function Dust() {
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  /**
   * Debu dimatikan selama minigame billiard. Kameranya tegak lurus dari ATAS
   * meja, jadi seluruh pita debu 0,05–2,55 m terbentang antara lensa dan kain
   * — yaitu tepat menutupi bidang permainan. Di situ ia berhenti jadi
   * atmosfer dan mulai jadi penghalang membaca posisi bola.
   *
   * Langganan store (bukan getState) memang memicu render ulang, tapi cuma
   * saat masuk/keluar meja — bukan tiap frame.
   */
  const billiardActive = useSceneStore((s) => s.billiardActive);

  const count = coarse ? COUNT_COARSE : COUNT_FINE;

  const { positions, seeds } = useMemo(() => {
    const rand = rng(0x5eed1e);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // x & z ditaburkan di [0, 2·HALF). Nilai absolutnya TIDAK penting —
      // modulo di shader memetakannya ke kotak di sekeliling kamera di mana
      // pun kamera berada. Yang penting cuma sebarannya seragam.
      positions[i * 3 + 0] = rand() * HALF_XZ * 2;
      positions[i * 3 + 1] = Y_MIN + rand() * (Y_MAX - Y_MIN);
      positions[i * 3 + 2] = rand() * HALF_XZ * 2;
      // seed.x/.y  → fase goyang (dipakai sebagai putaran penuh)
      // seed.z     → laju naik & kecerahan per bintik
      seeds[i * 3 + 0] = rand();
      seeds[i * 3 + 1] = rand();
      seeds[i * 3 + 2] = rand();
    }
    return { positions, seeds };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCam: { value: new Vector3() },
      /** Ukuran bintik pada 1 m, SUDAH dikali dpr. Ditulis tiap frame dari
       *  pixelRatio renderer supaya besar fisiknya tetap sama saat pengunjung
       *  menyeret jendela antar-layar dengan kerapatan berbeda. */
      uSize: { value: PX_AT_1M },
      uColor: { value: COLOR },
      /** Gerbang ruangan 0..1 — lihat DUSTY_ROOMS. */
      uGate: { value: 0 },
      // Objek uniform YANG SAMA dengan revealSweep — bukan salinan angkanya.
      // Tanpa ini debu sudah beterbangan di ruang kosong sementara kantor yang
      // memuatnya belum tergambar. Pola & alasan identik dengan hologram.
      uRevealProgress: revealProgress,
    }),
    [],
  );

  /**
   * Material dibangun IMPERATIF, bukan lewat `<shaderMaterial uniforms={...} />`.
   *
   * ⚠️ Ini bukan selera gaya — versi deklaratifnya menggambar debu yang beku
   * dan tak terlihat, dan penyebabnya tidak kelihatan dari kode kita sama
   * sekali. R3F punya cabang KHUSUS untuk prop `uniforms` di ShaderMaterial
   * (@react-three/fiber applyProps): ia tidak menyimpan objek yang kita beri,
   * melainkan menyalin isinya ke pembungkus `{ value }` milik material sendiri.
   * Akibatnya SEMUA rujukan bersama putus, dan tiga hal gagal sekaligus:
   *
   *   1. `uRevealProgress` cuma dapat SALINAN nilai saat mount — yaitu 0. Saat
   *      sapuan berjalan, revealSweep menulis ke objek aslinya; salinan di
   *      material tetap 0 selamanya, jadi `show` nol dan SELURUH debu di-discard.
   *   2. `uTime` yang ditambah useFrame di bawah menaikkan objek KITA, bukan
   *      milik material → debu tidak pernah bergerak.
   *   3. `uCam` ikut beku di (0,0,0) → kotak wrap mengelilingi titik asal dunia,
   *      bukan kamera. Debunya tetap tergambar, cuma di tempat yang salah.
   *
   * Gejala gabungannya "debu tidak muncul", dan tidak ada satu pun error di
   * console. Konstruktor ShaderMaterial menyimpan objek uniforms APA ADANYA,
   * jadi membangunnya sendiri mengembalikan ketiga rujukan itu. Pola yang sama
   * dipakai MaintenanceHologram — dan itu sebabnya hologramnya tidak pernah
   * kena bug ini.
   */
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms,
        transparent: true,
        // depthWrite mati, depthTest MENYALA. Itu pasangan yang benar untuk
        // benda tembus: debu tidak boleh menghalangi apa pun yang digambar
        // sesudahnya (depthWrite), tapi tembok HARUS bisa menutupinya
        // (depthTest) — dan justru uji itulah yang mengurung debu di dalam
        // gedung tanpa satu pun angka batas ruangan.
        depthWrite: false,
        depthTest: true,
        blending: AdditiveBlending,
      }),
    [uniforms],
  );

  useEffect(() => () => mat.dispose(), [mat]);

  const points = useRef<Points>(null);

  useFrame((state, dt) => {
    // Waktu BERHENTI saat prefers-reduced-motion, tapi bintiknya tetap
    // digambar: yang mengganggu bagi yang sensitif itu gerakannya, bukan
    // keberadaannya. Menghapus debu sekalian akan membuat ruangannya terasa
    // berbeda tanpa alasan.
    if (!reduced) uniforms.uTime.value += dt;
    // Kamera tetap diperbarui walau waktu beku — tanpa ini wrap berhenti
    // mengikuti kamera dan debu tertinggal di ruangan sebelumnya.
    uniforms.uCam.value.copy(state.camera.position);
    uniforms.uSize.value = PX_AT_1M * state.gl.getPixelRatio();

    const cam = state.camera.position;
    const gate = smoothstep(
      -GATE_BLEND,
      GATE_BLEND,
      nearestXZ(CLEAN_ANCHORS, cam) - nearestXZ(DUSTY_ANCHORS, cam),
    );
    uniforms.uGate.value = gate;

    /**
     * Visibility disetel IMPERATIF di sini, bukan lewat prop `visible`.
     *
     * Di Meeting & Function gerbangnya nol, jadi tiap bintik pasti di-discard —
     * tapi draw call-nya tetap dibayar. Mematikan objeknya menghapusnya
     * sepenuhnya di separuh ruangan, dan itu sejalan dengan perburuan draw call
     * di proyek ini.
     *
     * Harus imperatif karena nilainya menggabungkan gerbang yang dihitung
     * per-frame dengan billiardActive dari store; kalau `visible` juga dipasang
     * sebagai prop, React akan menimpanya balik tiap render.
     */
    if (points.current) points.current.visible = !billiardActive && gate > 0.002;
  });

  if (DISABLED) return null;

  return (
    <points
      ref={points}
      // Keluar dari pass depth bayangan kontak — di pass itu titik-titik ini
      // tergambar di posisi BASIS (kotak di titik asal dunia, lihat catatan
      // bounding di bawah) dengan gl_PointSize yang undefined per driver.
      // Alasan lengkap + kontrak kameranya di NO_BAKE_LAYER
      // (ContactShadowsRig.tsx); kamera utama meng-enable layer ini di
      // Scene.tsx onCreated.
      onUpdate={(o) => o.layers.set(NO_BAKE_LAYER)}
      // `visible` sengaja TIDAK dipasang di sini — disetel di useFrame, lihat
      // alasannya di sana.
      //
      // ⚠️ WAJIB. Bounding sphere dihitung three dari atribut `position`, yaitu
      // posisi BASIS sebelum wrap — kotak di sekitar titik asal dunia. Begitu
      // kamera berada di ruangan lain, kotak itu keluar frustum dan SELURUH
      // debu di-cull padahal sedang menyelimuti lensa. Gejalanya "debu cuma
      // ada di Lounge". Karena posisi nyatanya baru lahir di vertex shader,
      // tidak ada bounding volume yang bisa benar — culling harus dimatikan.
      frustumCulled={false}
      // Debu tidak boleh ikut diuji raycast. Tanpa ini ia berdiri di antara
      // kursor dan waypoint/meja billiard, dan klik navigasi berhenti bekerja
      // di titik yang kebetulan ada bintiknya.
      raycast={() => null}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 3]} />
      </bufferGeometry>
      <primitive object={mat} attach="material" />
    </points>
  );
}
