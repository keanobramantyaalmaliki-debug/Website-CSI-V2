import { create } from "zustand";

export const VIEW_KEYS = ["Lounge", "Office", "Meeting", "Function", "Pantry"] as const;
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
 *   3. ruangan yang URL-nya segment path kosong "/" (lihat `pathFor` di bawah)
 *
 * Nomor 3 yang paling mudah terlewat, dan kalau tidak ikut dipindah hasilnya
 * bug: dulu Office yang path-nya "/". Memulai di Lounge tapi membiarkan Office
 * di "/" berarti pindah ke Office membuat URL jadi bersih, lalu reload
 * mengembalikan pengunjung ke Lounge — bukan ke Office yang barusan dibuka.
 *
 * Cukup ganti konstanta ini untuk memindahkan titik awal; ketiga hal di atas
 * ikut sendiri.
 */
export const START_ROOM: RoomKey = "Lounge";

/**
 * Set ruangan yang tidak punya route — disinkronkan dengan VIEWS[k].disabled
 * di CameraController. Di-encode di sini supaya pathFor/roomFromPath bisa
 * bekerja tanpa mengimpor dari CameraController (yang bergantung pada Three.js).
 */
export const DISABLED_ROOMS = new Set<RoomKey>(["Pantry"]);

/**
 * Nama ruangan itu identitas INTERNAL + metafora dunia 3D. Ke luar — navbar,
 * URL, dan label waypoint di scene (sejak 28 Agu) — situs bicara bahasa
 * KONTEN: pengunjung baru tidak tahu "Function" isinya tim & karier, tapi
 * "People" langsung terbaca. Dua peta di bawah adalah SATU-SATUNYA tempat
 * penerjemahan itu; RoomKey tidak berubah di mana pun.
 *
 * Pemetaannya mengikuti isi tiap ruangan di roomContent.tsx:
 *   Lounge → Home (hero + Deployments + Process + Industries + Vision)
 *   Office → People (crew + values + Careers — scene karakter di meja kerja
 *   adalah latar yang pas), Meeting → Work (case studies),
 *   Function → Services (bedah layanan). Office↔Function ditukar 19 Agu;
 *   sebelumnya Office = Services.
 * Kalau isi sebuah ruangan pindah tema, kedua peta ini HARUS ikut — label
 * yang tak lagi menggambarkan isinya lebih buruk dari nama ruangan mentah.
 */
export const ROOM_SLUGS: Record<RoomKey, string> = {
  Lounge: "home",
  Office: "people",
  Meeting: "work",
  Function: "services",
  Pantry: "pantry",
};

/** Label yang tampil di navbar (desktop + menu seluler). */
export const ROOM_LABELS: Record<RoomKey, string> = {
  Lounge: "Home",
  Office: "People",
  Meeting: "Work",
  Function: "Services",
  Pantry: "Pantry",
};

/**
 * Path URL untuk sebuah ruangan. START_ROOM pakai "/" agar URL halaman depan
 * bersih; ruangan lain pakai slug kontennya: "/services", "/work", "/people".
 */
export function pathFor(room: RoomKey): string {
  return room === START_ROOM ? "/" : `/${ROOM_SLUGS[room]}`;
}

/**
 * Kebalikan pathFor: kembalikan RoomKey dari pathname, atau null jika tidak
 * dikenal / disabled. Case-insensitive.
 *
 * Slug LAMA (nama ruangan: "/office", "/meeting", "/function") tetap
 * dikenali — tautan yang terlanjur dibagikan sebelum slug konten (19 Agu)
 * tidak boleh mati. Yang menormalkan URL-nya ke slug baru adalah
 * RoomRouteSync Arah 2 (dengan `replace`), bukan fungsi ini; tugas di sini
 * cuma menjawab "path ini ruangan yang mana". Route legacy padanannya ada di
 * App.tsx — tanpa itu, catch-all `*` melempar pengunjung ke "/" jauh sebelum
 * store sempat membaca path-nya.
 */
export function roomFromPath(pathname: string): RoomKey | null {
  const slug = pathname.replace(/^\//, "").toLowerCase();
  if (slug === "") return START_ROOM;
  const key = VIEW_KEYS.find(
    (k) => ROOM_SLUGS[k] === slug || k.toLowerCase() === slug,
  );
  if (!key || DISABLED_ROOMS.has(key)) return null;
  return key;
}

/** Koordinat dunia three.js. Sengaja tuple, bukan THREE.Vector3, supaya store
 *  ini tetap bebas dari import three (dipakai juga oleh komponen DOM). */
export type Vec3 = readonly [number, number, number];

/**
 * Opsi perpindahan ruangan.
 *
 * `instant` melewati tween 1400 ms dan MENJEPRET kamera ke ruangan tujuan.
 * Dipakai tirai GridReveal: pengunjung yang berpindah ruangan dari dalam
 * konten tidak pernah melihat titik berangkat kameranya, jadi menerbangkannya
 * cuma jadi 1,4 detik menunggu untuk perjalanan yang tak terlihat. Klik
 * waypoint 3D tetap memakai tween — di sana perjalanannya justru inti dari
 * afordansnya.
 */
export type GoToOptions = { instant?: boolean };
export type GoToFn = (room: RoomKey, opts?: GoToOptions) => void;

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

  /**
   * Progres unduhan office.glb dalam BYTE, ditulis officeModel.ts dan dibaca
   * LoadingScreen untuk teks progres.
   *
   * Kenapa bukan useProgress drei: (1) angkanya per-item, bukan per-byte —
   * untuk satu GLB 13MB ia diam di angka yang sama bermenit-menit di koneksi
   * lambat, persis keadaan yang membuat teks ini dibutuhkan; (2) mengimpornya
   * di LoadingScreen menyeret three ke bundle utama, sementara store ini
   * sengaja bebas three (lihat catatan Vec3).
   *
   * `total` 0 = Content-Length tidak diketahui; tampilkan byte terunduh saja.
   * null = unduhan belum dimulai (mis. jalur reduced-motion yang tidak pernah
   * memuat scene) — jangan tampilkan apa-apa.
   */
  modelLoad: { loaded: number; total: number } | null;
  setModelLoad: (p: { loaded: number; total: number }) => void;

  currentRoom: RoomKey;
  setCurrentRoom: (room: RoomKey) => void;
  heroInView: boolean;
  setHeroInView: (inView: boolean) => void;
  // scrollspy: id section konten yang sedang di viewport (null saat di hero)
  activeSection: string | null;
  setActiveSection: (id: string | null) => void;
  // goTo is registered by CameraController once the R3F canvas is ready
  goTo: GoToFn | null;
  registerGoTo: (fn: GoToFn) => void;

  /**
   * Ruangan tujuan sapuan GridReveal yang sedang berjalan, atau null kalau
   * tidak ada transisi.
   *
   * Jembatan Navbar (DOM) → GridReveal + Hero (DOM), lewat store dan bukan
   * prop, karena ketiganya bersaudara di pohon dan tidak punya pemilik bersama
   * yang wajar selain SiteLayout — menaruhnya di sana berarti SiteLayout
   * me-render ulang seluruh halaman tiap kali seseorang mengklik navbar.
   *
   * Yang berlangganan, dan untuk apa:
   *  · GridReveal — memegang fase & waktunya, menggambar kotak-kotak clip
   *  · Hero       — memaku pembungkus Canvas ke viewport & memasang clip-path
   *  · FrameloopGate — menyalakan render loop yang seharusnya "never" di posisi
   *    scroll ini (lihat alasannya di FrameloopGate.tsx)
   *
   * Store cuma membawa "ke mana"; tidak ada fase, waktu, atau geometri di sini.
   */
  pendingRoom: RoomKey | null;
  requestRoomTransition: (room: RoomKey) => void;
  clearRoomTransition: () => void;

  /**
   * Teks label benda interaktif yang sedang di-hover, atau null kalau tidak ada.
   *
   * Jembatan dari dalam Canvas ke overlay DOM di luar Canvas (ui/WaypointLabel)
   * — pola yang sama dengan `cueScreen`, tapi TANPA ongkos per-frame: nilainya
   * cuma berubah saat kursor masuk/keluar benda, bukan tiap frame. Posisi
   * kursornya sendiri TIDAK lewat sini; overlay melacaknya sendiri lewat ref
   * supaya tidak ada render React per gerakan mouse.
   *
   * Dulu bernama `hoveredWaypoint`. Diganti 10 Agu 2026 saat meja billiard ikut
   * memakai label yang sama (HoverScan): penulisnya bukan cuma waypoint lagi,
   * dan penjaga kursor di MaintenanceHologram membacanya sebagai "apakah ADA
   * label hover yang menyala?" — pertanyaan yang memang tidak spesifik waypoint.
   */
  hoveredLabel: string | null;
  setHoveredLabel: (label: string | null) => void;

  /** Tween kamera ke posisi bebas (bukan preset ruangan) — dipakai minigame
   *  billiard supaya bisa ikut memakai mesin tween 1400ms yang sudah ada.
   *  `up` wajib untuk pandangan tegak lurus ke bawah. */
  goToView: ((pos: Vec3, tgt: Vec3, up?: Vec3, fov?: number) => void) | null;
  registerGoToView: (
    fn: (pos: Vec3, tgt: Vec3, up?: Vec3, fov?: number) => void,
  ) => void;

  /**
   * true = form inquiry (MacBook di section Contact) sedang terbuka sebagai
   * modal.
   *
   * ⚠️ HANYA Contact yang menulisnya. InquiryOverlay (modal kembaran milik
   * CTA navbar) sengaja TIDAK ikut: lapisannya hidup di luar `<main>`, jadi
   * pelepasan z-10 di bawah tidak pernah ia butuhkan — dan boolean yang
   * ditulis dua modal bisa saling clobber di ekor animasi masing-masing.
   *
   * Dibaca SiteLayout untuk melepas `z-10` dari `<main>` selagi modalnya hidup.
   * Kenapa lewat store dan bukan state lokal Contact: `relative z-10` di `<main>`
   * membikin STACKING CONTEXT, jadi z-index setinggi apa pun di dalamnya tetap
   * terkurung di bawah Navbar (z-50) — tirai gelapnya kalah, dan navbar terbaca
   * mengambang di atas form (terpotret 13 Agu). `position: relative` tanpa
   * z-index tidak membuat stacking context, jadi cukup melepas angkanya selama
   * modal terbuka; lapisan 54/55/56 lalu bersaing di akar dan menang.
   */
  inquiryOpen: boolean;
  setInquiryOpen: (open: boolean) => void;

  /**
   * Perintah "buka form inquiry SEKARANG, dari mana pun" — milik CTA "Talk to
   * us" di navbar, dibaca InquiryOverlay (di SiteLayout, luar `<main>`).
   *
   * Terpisah dari `inquiryOpen`, dan bukan duplikasi: `inquiryOpen` itu AKIBAT
   * ("sebuah modal sedang hidup", dibaca SiteLayout untuk urusan z-index),
   * sedangkan flag ini PERINTAH untuk satu jalur tertentu. Laptop di section
   * Contact tetap punya jalur kliknya sendiri dan tidak menyentuh flag ini.
   */
  navInquiryOpen: boolean;
  setNavInquiryOpen: (open: boolean) => void;

  // ── Minigame billiard ────────────────────────────────────────────────────
  /** true = pemain sedang di meja. Dipakai Waypoints untuk MENYEMBUNYIKAN
   *  waypoint — kalau tidak, geser-untuk-membidik bisa mengenai waypoint dan
   *  pemain terlempar ke ruangan lain di tengah permainan. */
  billiardActive: boolean;
  billiardPhase: BilliardPhase;
  enterBilliard: () => void;
  exitBilliard: () => void;
  setBilliardPhase: (phase: BilliardPhase) => void;

  /** true = bola putih bebas dipindah di zona kitchen (break awal, atau
   *  setelah bola putih masuk lubang). Padam begitu tembakan dilepas. */
  ballInHand: boolean;
  setBallInHand: (v: boolean) => void;

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

  modelLoad: null,
  setModelLoad: (modelLoad) => set({ modelLoad }),

  currentRoom: START_ROOM,
  setCurrentRoom: (room) => set({ currentRoom: room }),
  heroInView: true,
  setHeroInView: (inView) => set({ heroInView: inView }),
  activeSection: null,
  setActiveSection: (id) => set({ activeSection: id }),
  goTo: null,
  registerGoTo: (fn) => set({ goTo: fn }),

  pendingRoom: null,
  // Permintaan kedua selagi yang pertama berjalan DIABAIKAN, dan itu satu-
  // satunya penjaga re-entrancy transisi ini. Sapuannya tidak menutupi layar
  // (justru sebaliknya — ia MEMBUKA), jadi navbar tetap bisa diklik di
  // tengah jalan tanpa perlu perisai transparan yang menelan klik. Kalau
  // pendingRoom boleh berubah di tengah sapuan, geometri kotak dan delay-nya
  // ikut dihitung ulang: sapuannya patah balik ke nol lalu mulai lagi.
  // Menaruh penjaganya DI SINI, bukan di Navbar, membuatnya berlaku untuk
  // pemanggil mana pun yang muncul nanti.
  requestRoomTransition: (room) =>
    set((s) => (s.pendingRoom ? {} : { pendingRoom: room })),
  clearRoomTransition: () => set({ pendingRoom: null }),

  hoveredLabel: null,
  setHoveredLabel: (hoveredLabel) => set({ hoveredLabel }),

  goToView: null,
  registerGoToView: (fn) => set({ goToView: fn }),

  inquiryOpen: false,
  setInquiryOpen: (inquiryOpen) => set({ inquiryOpen }),

  navInquiryOpen: false,
  setNavInquiryOpen: (navInquiryOpen) => set({ navInquiryOpen }),

  billiardActive: false,
  billiardPhase: "off",
  // Sudut awal 0 = membidik lurus dari bola putih ke arah rak.
  enterBilliard: () =>
    set({
      billiardActive: true,
      billiardPhase: "aiming",
      aimAngle: 0,
      // Break selalu diawali free ball.
      ballInHand: true,
    }),
  exitBilliard: () => set({ billiardActive: false, billiardPhase: "off" }),
  setBilliardPhase: (billiardPhase) => set({ billiardPhase }),

  ballInHand: true,
  setBallInHand: (ballInHand) => set({ ballInHand }),

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
