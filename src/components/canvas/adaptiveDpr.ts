/**
 * Adaptive dpr — logika MURNI (tanpa three/React) untuk termostat resolusi.
 * Titik sambungnya di AdaptiveDpr.tsx; kebijakan & angka-angkanya di sini
 * supaya bisa diuji unit tanpa WebGL.
 *
 * ── Kenapa ini ada ─────────────────────────────────────────────────────────
 * dpr 1 + cap 30 fps idle (19 Agu) belum cukup untuk Safari Keano — masih
 * "agak lag". Daripada menebak angka mati yang pas untuk semua perangkat,
 * browser-nya sendiri yang lapor: frekuensi rAF turun = GPU tidak sanggup →
 * turunkan resolusi render satu tangga; sehat stabil → naik lagi. Mac kencang
 * menetap di dpr 1, perangkat lemah menetap di tangga yang muat.
 *
 * ── Tiga jebakan yang dijaga (diminta eksplisit 19 Agu) ────────────────────
 * 1. CAP OS (Low Power Mode Safari meng-cap rAF ke 30 fps): monitor naif
 *    membaca 30 fps sebagai "GPU sekarat" dan membanting dpr ke minimum
 *    padahal GPU santai — dan menurunkan dpr TIDAK menaikkan fps yang
 *    di-cap OS, jadi ia terus membanting sampai mentok.
 *    ⚠️ Keseragaman frame time SAJA tidak bisa membedakannya: GPU jenuh yang
 *    terkunci vsync juga rata sempurna di 33,3 ms. Yang membedakan adalah
 *    JENDELA IDLE — saat cap 30 fps idle (renderPace) melewati separuh draw,
 *    GPU jenuh pulih ke ~16,7 ms/tick karena bebannya turun, sedangkan cap
 *    OS tetap ~33,3 ms berapa pun bebannya. Karena itu classifyWindows
 *    membandingkan kedua jendela, dan verdict "os-capped" = tahan posisi.
 * 2. SAMPEL JUJUR: keputusan turun/naik hanya diambil dari sampel fase AKTIF
 *    (kamera bergerak / interaksi, definisi tunggal isSceneActive di
 *    renderPace.ts) — beban penuh cuma terlihat di situ. Sampel idle
 *    dikumpulkan TERPISAH dan hanya dipakai sebagai pembanding cap OS di
 *    atas; tanpa pemisahan ini, tick idle yang setengah nganggur membuat
 *    monitor mengira semuanya sehat.
 * 3. ?dpr= MENANG: override manual mematikan termostat total — diberlakukan
 *    di Scene.tsx (AdaptiveDpr tidak di-mount), dijaga adaptiveDpr.test.ts.
 */

/**
 * Tangga resolusi, dari penuh ke paling murah. 0,6 sebagai lantai: di bawah
 * itu look-nya belum pernah dilihat & disetujui Keano — kalau perangkat masih
 * tidak sanggup di 0,6, biarkan lambat daripada buruk rupa. Menambah anak
 * tangga di bawah 0,6 = keputusan tampilan Keano.
 */
export const DPR_LADDER = [1, 0.85, 0.75, 0.6] as const;

/** Sampel aktif per jendela keputusan. 60 tick ≈ 1 dtk @60Hz / 2 dtk @30Hz —
 *  satu tween ruangan (1400 ms) sudah cukup mengisi satu jendela. */
export const WINDOW = 60;

/** Median aktif di atas ini = "gpu-slow" (≈ di bawah 48 fps). */
export const SLOW_MS = 21;
/** Median aktif di bawah ini = "healthy" (≈ di atas 57 fps; ProMotion 120 Hz
 *  dengan ~8,3 ms jelas lolos juga). */
export const HEALTHY_MS = 17.5;
/** Rentang median idle yang terbaca "masih ~30 fps walau beban separuh" —
 *  ciri cap OS. */
export const CAP_MIN_MS = 28;
export const CAP_MAX_MS = 38;
/** Sebaran (p75−p25) maksimum agar pola terbaca "rata sempurna" ala cap OS. */
export const CAP_SPREAD_MS = 3;
/** Jeda antar-tick di atas ini = stall (kompilasi shader, pindah tab, pause
 *  FrameloopGate) — jendela dibuang, bukan dihitung. Ambang yang sama dengan
 *  gerbang sweep di Office.tsx, dan alasannya sama. */
export const STALL_MS = 250;
/** Tick yang dibuang setelah tiap keputusan — realloc buffer bikin hitch,
 *  jangan sampai hitch-nya sendiri terbaca sebagai "gpu-slow". */
export const COOLDOWN_TICKS = 120;
/** gpu-slow beruntun sebelum turun / healthy beruntun sebelum naik. Turun
 *  lebih sigap daripada naik: salah turun cuma piksel lebih besar sebentar,
 *  salah naik = lag kambuh. */
export const SLOW_WINDOWS_TO_STEP = 2;
export const HEALTHY_WINDOWS_TO_STEP = 4;

export type Verdict = "gpu-slow" | "os-capped" | "healthy" | "inconclusive";

/**
 * Tangga terakhir diingat per-tab (sessionStorage): reload tidak mengulang
 * penemuan dari dpr 1 — perangkat yang kemarin turun ke 0,75 langsung mulai
 * di situ. SENGAJA bukan localStorage: dok ke charger / tutup Low Power Mode
 * mengubah kesanggupan mesin, biar tab baru menakar ulang dari awal.
 * try/catch: Safari mode privat melempar saat setItem.
 */
const STORAGE_KEY = "csi-adaptive-dpr-index";

export function loadLadderIndex(): number {
  try {
    const i = Number(sessionStorage.getItem(STORAGE_KEY));
    return Number.isInteger(i) && i >= 0 && i < DPR_LADDER.length ? i : 0;
  } catch {
    return 0;
  }
}

export function saveLadderIndex(i: number): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(i));
  } catch {
    /* mode privat — biarkan */
  }
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function spread(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length * 0.75)] - s[Math.floor(s.length * 0.25)];
}

/**
 * Nilai satu jendela penuh sampel aktif, dengan sampel idle sebagai
 * pembanding. `idle` boleh pendek/kosong (pengunjung terus bergerak) — tanpa
 * pembanding, lambat-rata-sempurna tidak bisa dibedakan dari cap OS, jadi
 * dijawab konservatif: "os-capped" (tahan posisi). Salah tahan = status quo;
 * salah turun di perangkat ter-cap = membanting sampai mentok tanpa hasil.
 */
export function classifyWindows(active: number[], idle: number[]): Verdict {
  if (active.length < WINDOW) return "inconclusive";
  const m = median(active);
  if (m < HEALTHY_MS) return "healthy";
  if (m <= SLOW_MS) return "inconclusive";

  // Lambat. Cap OS atau GPU jenuh? Lihat perilaku saat beban separuh (idle).
  const uniform = spread(active) <= CAP_SPREAD_MS;
  if (uniform && m >= CAP_MIN_MS && m <= CAP_MAX_MS) {
    if (idle.length < WINDOW / 2) return "os-capped"; // tanpa bukti, konservatif
    const mi = median(idle);
    if (mi >= CAP_MIN_MS && spread(idle) <= CAP_SPREAD_MS) return "os-capped";
  }
  return "gpu-slow";
}

/**
 * Termostat: makan satu interval antar-tick per panggilan, sesekali
 * mengembalikan dpr baru. Semua state di dalam — komponen React-nya tinggal
 * menyalurkan.
 */
export class AdaptiveDprController {
  index: number;
  locked = false;

  private active: number[] = [];
  private idle: number[] = [];
  private cooldown = 0;
  private slowStreak = 0;
  private healthyStreak = 0;
  private lastDir: -1 | 0 | 1 = 0;
  private reversals = 0;

  constructor(initialIndex = 0) {
    this.index = Math.min(Math.max(initialIndex, 0), DPR_LADDER.length - 1);
  }

  get dpr(): number {
    return DPR_LADDER[this.index];
  }

  /** Interval antar-tick berikutnya. Mengembalikan dpr baru saat ada langkah,
   *  selain itu null. */
  feed(intervalMs: number, isActive: boolean): number | null {
    if (this.locked) return null;

    if (intervalMs > STALL_MS) {
      // Stall ≠ lambat: buang jendela berjalan supaya satu hitch kompilasi/
      // pindah tab tidak mencemari 59 sampel jujur di sekitarnya.
      this.active = [];
      this.idle = [];
      return null;
    }

    if (this.cooldown > 0) {
      this.cooldown--;
      return null;
    }

    if (isActive) this.active.push(intervalMs);
    else {
      this.idle.push(intervalMs);
      if (this.idle.length > WINDOW) this.idle.shift();
    }
    if (this.active.length < WINDOW) return null;

    const verdict = classifyWindows(this.active, this.idle);
    this.active = [];

    if (verdict === "gpu-slow") {
      this.healthyStreak = 0;
      this.slowStreak++;
      if (
        this.slowStreak >= SLOW_WINDOWS_TO_STEP &&
        this.index < DPR_LADDER.length - 1
      ) {
        return this.step(1);
      }
      return null;
    }

    if (verdict === "healthy") {
      this.slowStreak = 0;
      this.healthyStreak++;
      if (this.healthyStreak >= HEALTHY_WINDOWS_TO_STEP && this.index > 0) {
        return this.step(-1);
      }
      return null;
    }

    // os-capped / inconclusive: bukan bukti ke arah mana pun.
    this.slowStreak = 0;
    this.healthyStreak = 0;
    return null;
  }

  private step(dir: -1 | 1): number {
    // Penjaga flip-flop: turun→naik→turun berarti ambangnya persis di antara
    // dua tangga dan akan bergoyang selamanya. Pada bolak-balik kedua, kunci
    // di tangga BAWAH pasangan itu (lebih murah) dan berhenti mencoba.
    if (this.lastDir !== 0 && dir !== this.lastDir) this.reversals++;
    this.lastDir = dir;

    this.index += dir;
    this.slowStreak = 0;
    this.healthyStreak = 0;
    this.cooldown = COOLDOWN_TICKS;
    this.idle = [];

    if (this.reversals >= 2) {
      if (dir === -1) this.index++; // sedang naik? kembali ke tangga bawah
      this.locked = true;
    }
    return DPR_LADDER[this.index];
  }
}
