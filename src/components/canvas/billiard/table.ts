/**
 * Geometri meja billiard — SEMUA angka di sini hasil ukur langsung dari objek
 * Blender (`PT_Felt`, `PT_RailRing`, `PT_PocketCup_*`), bukan tebakan.
 *
 * Kenapa analitis, bukan dari mesh GLB: di `office.glb` meja sudah digabung
 * jadi dua node (`MG_Lounge_M_PoolTable_Body`/`_Felt`) demi menekan draw call,
 * sehingga bantalan & lubangnya tidak lagi jadi objek terpisah yang bisa
 * dipakai sebagai collider.
 *
 * Konversi sumbu Blender → three: (x, y, z) → (x, z, −y). Semua konstanta di
 * file ini SUDAH dalam koordinat three (y = tinggi).
 */

/** Radius bola: 57 mm standar internasional. */
export const BALL_R = 0.0285;

/** Permukaan main (felt) — batas luar kain, sebelum bantalan. */
export const FELT = {
  x0: -0.155,
  x1: 0.905,
  z0: -2.66,
  z1: -0.6,
  /** Tinggi permukaan kain. Pusat bola = y + BALL_R. */
  y: 0.807,
} as const;

/** Tinggi pusat bola saat menempel di kain. */
export const BALL_Y = FELT.y + BALL_R;

export const TABLE_CENTER = [
  (FELT.x0 + FELT.x1) / 2,
  FELT.y,
  (FELT.z0 + FELT.z1) / 2,
] as const;

/**
 * Bantalan. Bibir rail asli ada di y 0,800–0,860 — yaitu 2,45 cm DI ATAS pusat
 * bola, jadi bola memantul balik alih-alih meloncat keluar meja.
 */
const CUSHION_Y = 0.83;      // pusat tinggi bantalan
const CUSHION_HH = 0.03;     // setengah tinggi

/**
 * Setengah tebal bantalan — ini murni angka FISIKA, tidak terlihat (visual
 * mejanya milik office.glb).
 *
 * Dibuat tebal 12 cm sebagai lapis pertahanan kedua terhadap tunneling:
 * cannon-es tidak punya CCD, jadi bola cepat bisa melompati dinding tipis
 * dalam satu langkah. Semua posisi di CUSHIONS ditulis relatif terhadap nilai
 * ini, sehingga menebalkannya tumbuh KELUAR — permukaan dalam yang menyentuh
 * bola tetap persis di tepi felt dan area main tidak berubah.
 */
const CUSHION_HT = 0.06;

/** Radius lubang (PT_PocketCup_*). */
export const POCKET_R = 0.075;

/**
 * Bantalan dipotong di setiap lubang — kalau menerus, bola akan memantul di
 * mulut lubang dan tidak pernah bisa masuk.
 */
export const CUSHIONS: { pos: readonly [number, number, number]; half: readonly [number, number, number] }[] = [
  // Sisi panjang kiri & kanan, masing-masing terputus oleh lubang tengah.
  { pos: [FELT.x0 - CUSHION_HT, CUSHION_Y, -2.145], half: [CUSHION_HT, CUSHION_HH, 0.44] },
  { pos: [FELT.x0 - CUSHION_HT, CUSHION_Y, -1.115], half: [CUSHION_HT, CUSHION_HH, 0.44] },
  { pos: [FELT.x1 + CUSHION_HT, CUSHION_Y, -2.145], half: [CUSHION_HT, CUSHION_HH, 0.44] },
  { pos: [FELT.x1 + CUSHION_HT, CUSHION_Y, -1.115], half: [CUSHION_HT, CUSHION_HH, 0.44] },
  // Sisi pendek.
  { pos: [0.375, CUSHION_Y, FELT.z1 + CUSHION_HT], half: [0.455, CUSHION_HH, CUSHION_HT] },
  { pos: [0.375, CUSHION_Y, FELT.z0 - CUSHION_HT], half: [0.455, CUSHION_HH, CUSHION_HT] },
];

/** Titik pusat 6 lubang (4 sudut + 2 tengah). */
export const POCKETS: readonly (readonly [number, number])[] = [
  [-0.155, -0.6],
  [0.905, -0.6],
  [-0.155, -2.66],
  [0.905, -2.66],
  [-0.165, -1.63], // lubang tengah sedikit menjorok keluar
  [0.915, -1.63],
];

/**
 * Radius sensor lubang.
 *
 * Sekarang collider kain benar-benar BERLUBANG di posisi lubang (lihat
 * `createWorld`), jadi bola yang melewatinya kehilangan tumpuan dan jatuh
 * sendiri. Deteksi cukup mengandalkan bola yang sudah turun di bawah kain,
 * sehingga zona ini tidak perlu dilebar-lebarkan lagi sebagai kompensasi.
 *
 * Sedikit lebih kecil dari lubang aslinya supaya bola yang cuma menyenggol
 * bibir lubang lalu terpental keluar tidak ikut terhitung masuk.
 */
export const POCKET_SENSOR_R = POCKET_R - BALL_R * 0.5;

/** Head spot — posisi bola putih. Seperempat panjang meja dari bantalan bawah. */
export const HEAD_SPOT = [0.375, BALL_Y, -1.115] as const;

/**
 * Zona free ball ("kitchen") — 35% panjang meja dari ujung head (sisi KANAN
 * layar pada orientasi normal). Bola putih hanya boleh ditaruh di sini, baik
 * saat break maupun setelah bola putih masuk lubang.
 *
 * `z0` = garis batasnya (head string). Head spot ada di dalam zona, jadi
 * respot bawaan tidak pernah menaruh bola di luar batasnya sendiri.
 */
export const KITCHEN_Z0 = FELT.z1 - 0.35 * (FELT.z1 - FELT.z0);

/**
 * Jepit posisi free ball ke dalam zona kitchen. Semua sisi dikurangi radius
 * bola: di bantalan supaya bola tidak spawn menembus rail, di garis batas
 * supaya SELURUH bola berada di dalam zona — pusat tepat di garis membuat
 * separuh bola nongol keluar dan batasnya terlihat bohong. Murni geometri —
 * pengecekan tabrakan dengan bola lain urusan pemanggil, yang tahu posisi
 * bola hidup.
 */
export function clampFreeBall(x: number, z: number): [number, number] {
  return [
    Math.max(FELT.x0 + BALL_R, Math.min(FELT.x1 - BALL_R, x)),
    Math.max(KITCHEN_Z0 + BALL_R, Math.min(FELT.z1 - BALL_R, z)),
  ];
}

/** Foot spot — puncak segitiga rak. */
const FOOT_SPOT_Z = -2.145;

/**
 * Susunan 15 bola dalam segitiga, apex di foot spot membuka ke arah −z.
 *
 * Tiap bola diberi jarak 2 mm dari tetangganya (mengikuti referensi cannon-es
 * di elijah-atkins/Billiards) supaya collider tidak pernah saling tembus saat
 * spawn — kalau bersentuhan persis, solver mendorongnya keluar sekaligus dan
 * rak meledak sebelum dipukul.
 *
 * Jarak baris memakai √3/2 × d, tinggi segitiga sama sisi. Dengan offset
 * setengah d pada sumbu x, jarak pusat-ke-pusat bola bertetangga beda baris
 * juga tepat d — jadi kelonggarannya seragam ke segala arah.
 */
export function rackPositions(): [number, number, number][] {
  const d = BALL_R * 2 + 0.002;
  const out: [number, number, number][] = [];
  for (let row = 0; row < 5; row++) {
    const z = FOOT_SPOT_Z - row * d * 0.866; // 0.866 = tinggi segitiga sama sisi
    for (let i = 0; i <= row; i++) {
      out.push([0.375 + (i - row / 2) * d, BALL_Y, z]);
    }
  }
  return out;
}

/** Posisi awal 16 bola: index 0 bola putih di head spot, 1..15 rak segitiga. */
export function startPositions(): [number, number, number][] {
  return [[...HEAD_SPOT] as [number, number, number], ...rackPositions()];
}

/**
 * Batas gerak pusat bola — dipakai untuk mendeteksi bola yang kabur.
 *
 * Diturunkan dari tebal bantalan (2×CUSHION_HT = sisi luarnya) plus margin
 * 4 cm, BUKAN angka tetap. Kalau bantalan ditebalkan tapi batas ini tidak ikut
 * melebar, bola yang sedang memantul DI DALAM bantalan akan terbaca sebagai
 * "kabur" lalu dihapus dari meja.
 */
const BOUNDS_PAD = CUSHION_HT * 2 + 0.04;

export const BOUNDS = {
  x0: FELT.x0 - BOUNDS_PAD,
  x1: FELT.x1 + BOUNDS_PAD,
  z0: FELT.z0 - BOUNDS_PAD,
  z1: FELT.z1 + BOUNDS_PAD,
} as const;
