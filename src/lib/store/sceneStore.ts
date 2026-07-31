import { create } from "zustand";

export const VIEW_KEYS = ["Office", "Lounge", "Meeting", "Function", "Pantry"] as const;
export type RoomKey = (typeof VIEW_KEYS)[number];

/**
 * Ruangan tempat tur DIMULAI — pintu masuk kantor.
 *
 * Lounge, bukan Office: itu ruangan pertama yang dilihat orang saat masuk, jadi
 * memulai di situ mengikuti alur kunjungan sungguhan.
 *
 * ⚠️ Ini SATU-SATUNYA tempat titik awal ditentukan, dan ia dipakai untuk TIGA
 * hal yang WAJIB tetap sepakat:
 *   1. posisi kamera saat mount (CameraController + START_POS di Scene.tsx)
 *   2. `currentRoom` awal di store ini
 *   3. ruangan yang URL-nya TANPA hash (lihat `hashFor` di bawah)
 *
 * Nomor 3 yang paling mudah terlewat, dan kalau tidak ikut dipindah hasilnya
 * bug: dulu Office yang tanpa hash. Memulai di Lounge tapi membiarkan Office
 * tanpa hash berarti pindah ke Office membuat URL jadi bersih, lalu reload
 * mengembalikan pengunjung ke Lounge — bukan ke Office yang barusan dibuka.
 *
 * Cukup ganti konstanta ini untuk memindahkan titik awal; ketiga hal di atas
 * ikut sendiri.
 */
export const START_ROOM: RoomKey = "Lounge";

/**
 * Hash URL untuk sebuah ruangan. START_ROOM sengaja tidak berhash supaya URL
 * halaman depan tetap bersih.
 */
export function hashFor(room: RoomKey): string {
  return room === START_ROOM ? "" : `#${room.toLowerCase()}`;
}

/** Koordinat dunia three.js. Sengaja tuple, bukan THREE.Vector3, supaya store
 *  ini tetap bebas dari import three (dipakai juga oleh komponen DOM). */
export type Vec3 = readonly [number, number, number];

/** Fase permainan billiard. Dipakai untuk mengunci input di fase yang salah:
 *  cuma boleh membidik saat `aiming`, dan tembakan baru sah kalau bola diam. */
export type BilliardPhase = "off" | "aiming" | "rolling";

/** Aksi minigame yang hidup DI DALAM Canvas, dipanggil dari HUD di luar Canvas.
 *  Pola jembatan yang sama dengan `goTo` — lihat registerGoTo di bawah. */
interface BilliardApi {
  shoot: (power: number) => void;
  reset: () => void;
}

interface SceneStore {
  /**
   * true setelah frame NYATA pertama tergambar — bukan setelah aset selesai
   * diunduh.
   *
   * Bedanya besar dan itu inti dari keberadaan flag ini. `useProgress` drei
   * mencapai 100% saat GLB selesai diunduh, tapi three masih memblokir main
   * thread ~2,3 detik untuk mengompilasi 233 shader dan mengunggah 91 texture
   * (terukur, lihat Office.tsx:352-372). Loader yang percaya pada useProgress
   * akan hilang 2,3 detik terlalu cepat dan meninggalkan layar beku.
   *
   * Disetel dari useFrame di Office.tsx, sekali, saat ada frame yang jaraknya
   * wajar untuk pertama kalinya.
   */
  sceneReady: boolean;
  setSceneReady: (ready: boolean) => void;

  /**
   * true setelah overlay loading benar-benar hilang dari layar.
   *
   * Ini yang membuka gerbang sapuan "kantor terbentuk" (revealSweep). Keduanya
   * sengaja BERURUTAN, bukan tumpang tindih: sapuan adalah babak pembuka kantor
   * dan akan terbuang percuma kalau berjalan di balik lingkaran loader yang
   * masih menutupi layar.
   */
  loaderDone: boolean;
  setLoaderDone: (done: boolean) => void;

  currentRoom: RoomKey;
  setCurrentRoom: (room: RoomKey) => void;
  heroInView: boolean;
  setHeroInView: (inView: boolean) => void;
  // scrollspy: id section konten yang sedang di viewport (null saat di hero)
  activeSection: string | null;
  setActiveSection: (id: string | null) => void;
  // goTo is registered by CameraController once the R3F canvas is ready
  goTo: ((room: RoomKey) => void) | null;
  registerGoTo: (fn: (room: RoomKey) => void) => void;

  /**
   * Teks label waypoint yang sedang di-hover, atau null kalau tidak ada.
   *
   * Jembatan dari dalam Canvas (Waypoints) ke overlay DOM di luar Canvas
   * (ui/WaypointLabel) — pola yang sama dengan `cueScreen`, tapi TANPA ongkos
   * per-frame: nilainya cuma berubah saat kursor masuk/keluar waypoint, bukan
   * tiap frame. Posisi kursornya sendiri TIDAK lewat sini; overlay melacaknya
   * sendiri lewat ref supaya tidak ada render React per gerakan mouse.
   */
  hoveredWaypoint: string | null;
  setHoveredWaypoint: (label: string | null) => void;

  /** Tween kamera ke posisi bebas (bukan preset ruangan) — dipakai minigame
   *  billiard supaya bisa ikut memakai mesin tween 1400ms yang sudah ada.
   *  `up` wajib untuk pandangan tegak lurus ke bawah. */
  goToView: ((pos: Vec3, tgt: Vec3, up?: Vec3, fov?: number) => void) | null;
  registerGoToView: (
    fn: (pos: Vec3, tgt: Vec3, up?: Vec3, fov?: number) => void,
  ) => void;

  // ── Minigame billiard ────────────────────────────────────────────────────
  /** true = pemain sedang di meja. Dipakai Waypoints untuk MENYEMBUNYIKAN
   *  waypoint — kalau tidak, geser-untuk-membidik bisa mengenai waypoint dan
   *  pemain terlempar ke ruangan lain di tengah permainan. */
  billiardActive: boolean;
  billiardPhase: BilliardPhase;
  enterBilliard: () => void;
  exitBilliard: () => void;
  setBilliardPhase: (phase: BilliardPhase) => void;

  /** Sudut bidik dalam radian, diukur di bidang XZ dunia. 0 = menuju −Z
   *  (dari bola putih ke arah rak bola). */
  aimAngle: number;
  setAimAngle: (angle: number) => void;

  /** Posisi bola putih dalam PIKSEL layar, diperbarui tiap frame oleh
   *  BilliardGame. HUD memakainya sebagai pusat putaran saat membidik:
   *  sudut kursor terhadap titik ini yang menentukan arah stik, sehingga
   *  geseran ke arah mana pun (bukan cuma kanan-kiri) ikut terbaca. */
  cueScreen: { x: number; y: number } | null;
  setCueScreen: (p: { x: number; y: number } | null) => void;

  /** Posisi bar tenaga, 0–1. Dibaca game untuk menarik mundur stik. */
  shotPower: number;
  setShotPower: (p: number) => void;

  /** true = meja tampil mendatar di layar (layar lebar). Menentukan pemetaan
   *  geser-layar → arah bidik, supaya geser kanan = bidik ke kanan LAYAR. */
  tableRotated: boolean;
  setTableRotated: (r: boolean) => void;

  /** Jumlah bola yang sudah masuk lubang — buat HUD. */
  pocketed: number;
  setPocketed: (n: number) => void;

  billiard: BilliardApi | null;
  registerBilliard: (api: BilliardApi | null) => void;
}

export const useSceneStore = create<SceneStore>((set) => ({
  sceneReady: false,
  setSceneReady: (sceneReady) => set({ sceneReady }),

  loaderDone: false,
  setLoaderDone: (loaderDone) => set({ loaderDone }),

  currentRoom: START_ROOM,
  setCurrentRoom: (room) => set({ currentRoom: room }),
  heroInView: true,
  setHeroInView: (inView) => set({ heroInView: inView }),
  activeSection: null,
  setActiveSection: (id) => set({ activeSection: id }),
  goTo: null,
  registerGoTo: (fn) => set({ goTo: fn }),

  hoveredWaypoint: null,
  setHoveredWaypoint: (hoveredWaypoint) => set({ hoveredWaypoint }),

  goToView: null,
  registerGoToView: (fn) => set({ goToView: fn }),

  billiardActive: false,
  billiardPhase: "off",
  // Sudut awal 0 = membidik lurus dari bola putih ke arah rak.
  enterBilliard: () =>
    set({ billiardActive: true, billiardPhase: "aiming", aimAngle: 0 }),
  exitBilliard: () => set({ billiardActive: false, billiardPhase: "off" }),
  setBilliardPhase: (billiardPhase) => set({ billiardPhase }),

  aimAngle: 0,
  setAimAngle: (aimAngle) => set({ aimAngle }),

  cueScreen: null,
  setCueScreen: (cueScreen) => set({ cueScreen }),

  shotPower: 0,
  setShotPower: (shotPower) => set({ shotPower }),

  tableRotated: false,
  setTableRotated: (tableRotated) => set({ tableRotated }),

  pocketed: 0,
  setPocketed: (pocketed) => set({ pocketed }),

  billiard: null,
  registerBilliard: (billiard) => set({ billiard }),
}));
