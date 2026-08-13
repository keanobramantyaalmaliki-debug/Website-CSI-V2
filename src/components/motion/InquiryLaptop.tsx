"use client";

import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Canvas,
  createPortal,
  useFrame,
  useStore,
  useThree,
} from "@react-three/fiber";
import type { RootStore } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import { useInView } from "motion/react";
import type { MotionValue } from "motion/react";
import { MathUtils, Mesh, Object3D, Quaternion, Vector3 } from "three";
import SceneEnvironment from "@/components/canvas/SceneEnvironment";
import { useNarrowViewport } from "@/lib/hooks/useNarrowViewport";

/**
 * MacBook 3D untuk section Contact — tertutup, membuka saat diklik.
 *
 * Porting dari pmndrs/examples `floating-laptop`. Yang diambil apa adanya:
 * engsel digerakkan pegas 0→1, dan laptop MELAYANG pelan selama terbuka
 * (rotasi x/y/z + naik-turun, di-lerp 0.1 per frame — persis rumus di sana).
 * Yang TIDAK diambil: `<Environment preset="city">` (unduh HDRI eksternal,
 * lihat SceneEnvironment.tsx) dan `@react-spring/*` (repo ini sudah pakai
 * `motion` v12; pegasnya disetel ke default react-spring supaya rasanya sama).
 *
 * ⚠️ KONTRAK FRAMELOOP — baca sebelum mengubah apa pun di sini.
 * Ini canvas KEDUA di halaman. Bug "laptop panas" (3 Agu) lahir dari mesin yang
 * terus berdetak 60fps di balik layar. Gerak melayang itu animasi tanpa ujung,
 * jadi `frameloop="demand"` GUGUR selama laptop terbuka — tidak ada cara
 * mengakalinya, gerak terus-menerus memang butuh frame terus-menerus.
 *
 * Yang dilakukan sebagai gantinya: frameloop-nya DIGERBANG.
 *
 *   terbuka & terlihat  → "always"  (melayang, ~1 canvas kecil 60fps)
 *   selain itu          → "demand"  (0 draw call; hanya melukis saat
 *                                    invalidate() dipanggil)
 *
 * Jadi keadaan BAWAAN halaman — laptop tertutup, atau terbuka tapi sudah
 * digulir lewat — tetap nol ongkos. Ongkosnya hanya muncul setelah pengunjung
 * sendiri yang mengklik, dan berhenti begitu ia menggulir pergi.
 *
 * Kenapa "demand" dan bukan "never" saat diam: "never" mematikan loop
 * sepenuhnya sampai `advance()` dipanggil manual — pose awal pun tak pernah
 * terlukis. "demand" tetap menghormati `invalidate()`, yang dipakai rig engsel.
 *
 * ⚠️ Gerbangnya lewat PROP, bukan `setFrameloop()` imperatif — R3F menyinkron
 * ulang dari prop dan menimpa panggilan imperatif (lihat catatan frameloop-gate).
 */

const MODEL_URL = "/3d/models/macbook-inquiry.glb";

/** ⚠️ TANDANYA POSITIF. Engselnya di sisi BELAKANG (z = −0,1099) dan lid
 *  menjulur ke +Y; rotasi X positif menutup ke atas keyboard. Tanda negatif
 *  memutar lid menembus meja. (Plan §3 versi awal menulis −1,928; itu keliru.)
 *
 *  1,9209 rad = 110,06°, sudut yang membuat bidang lid SEJAJAR deck. Diukur,
 *  bukan ditaksir: PCA 2D atas penampang (z,y) lid memberi arah bidang
 *  (−0,3430, 0,9393). Pada sudut ini lid menyentuh deck dengan sisa −0,09 mm
 *  (sedikit menembus — disengaja, supaya tidak ada celah cahaya di sambungan). */
const LID_CLOSED = 1.9209;
const LID_OPEN = 0;
const LID_NODE = "Lid";
const BASE_NODE = "Base";
const SCREEN_NODE = "ScreenAnchor";

/**
 * Muka lid, diukur dari vertex aset (grup normal (0; 0,3; 0,94), 22 segitiga):
 * x[−0,1565 … 0,1565] → 31,3 cm, y[−0,0062 … 0,2020] → 20,82 cm.
 *
 * Sejak wallpaper-nya dipadamkan (`scripts/blacken-macbook-screen.mjs`) seluruh
 * muka ini hitam rata, jadi tidak ada lagi batas bezel/panel yang harus dipatuhi
 * — apa pun yang tidak ditempati form terbaca sebagai bezel. `SCREEN_INSET` yang
 * memutuskan selebar apa bezelnya.
 */
const FACE_W = 0.313;
const FACE_H = 0.2082;
const SCREEN_INSET = 0.006; // 6 mm bezel di keempat sisi

/**
 * Form-nya DOM sungguhan, ditempel ke layar oleh `<Html transform>` drei.
 *
 * Skalanya tidak boleh dikira-kira: dalam mode transform drei memakai rasio
 * `(distanceFactor ?? 10) / 400` = **0,025 satuan dunia per piksel CSS** (lihat
 * `getObjectCSSMatrix` di `drei/web/Html.js`). Jadi lebar dunia sebuah elemen =
 * `px × 0,025 × scale`, dan `HTML_SCALE` di bawah diturunkan dari situ — bukan
 * angka hasil coba-coba yang akan salah begitu ukuran desainnya diubah.
 *
 * Desainnya dipatok 1200×780 px (rasio 1,538) supaya form-nya selalu memakai
 * tata letak lebar; yang mengecilkannya transform CSS, bukan media query.
 */
const HTML_RATIO = 0.025;
const DESIGN_W = 1200;
const DESIGN_H = 780;
const HTML_SCALE = (FACE_W - 2 * SCREEN_INSET) / (DESIGN_W * HTML_RATIO);
/** 1 mm di depan kaca, searah normal layar — supaya tidak pernah adu-z. */
const HTML_LIFT = 0.001;

/**
 * Pembingkaian overlay: layar mengisi 75% tinggi viewport, dengan pagar lebar
 * 86% supaya jendela yang kurus tidak memotong kiri-kanan. Dua kendala, diambil
 * yang menuntut kamera paling jauh — sama seperti rig halaman, jarak dihitung
 * bukan ditaksir.
 */
const OVERLAY_FILL_H = 0.75;
const OVERLAY_FILL_W = 0.86;

function overlayDistance(fovDeg: number, aspect: number) {
  const halfTan = Math.tan((fovDeg * Math.PI) / 180 / 2);
  const byHeight = FACE_H / OVERLAY_FILL_H / (2 * halfTan);
  const byWidth = FACE_W / OVERLAY_FILL_W / (2 * halfTan * aspect);
  return Math.max(byHeight, byWidth);
}

/**
 * Angka melayang, diturunkan dari pmndrs lalu diskalakan.
 *
 * Di sana laptopnya ~8 satuan dan kameranya 30 satuan jauhnya — ayunan ±14°
 * masih muat di layar. Punya kita 0,31 m dan kameranya 0,44 m: close-up. Rumus
 * mentahnya membuang laptop keluar bingkai, jadi rotasinya dikali FLOAT_SCALE
 * dan naik-turunnya dihitung ulang dari ukuran model (bukan disalin mentah).
 */
const FLOAT_SCALE = 0.4;
/** Amplitudo naik-turun: 1/3 satuan pmndrs × (0,31 m / 8 satuan) ≈ 1,3 cm. */
const BOB_M = 0.013;
/** Kelembaman lerp per frame — dibiarkan sama seperti pmndrs; ini yang bikin
 *  gerakannya terasa "menyusul", bukan menempel di angka target. */
const FLOAT_LERP = 0.1;

/**
 * Rentang Z sebuah mesh, dihitung dari VERTEX-nya, bukan dari bounding box yang
 * diputar. Bedanya penting: memutar bbox lid 110° lalu mengambil bbox-nya lagi
 * melebih-lebihkan ujung depan ~1,2 mm — cukup untuk merusak perhitungan di
 * bawah, yang toleransinya sub-milimeter.
 */
function zSpan(node: Object3D, rotX: number) {
  const s = Math.sin(rotX);
  const c = Math.cos(rotX);
  let lo = Infinity;
  let hi = -Infinity;
  node.traverse((o) => {
    const p = (o as Mesh).geometry?.attributes?.position;
    if (!p) return;
    for (let i = 0; i < p.count; i++) {
      const z = p.getY(i) * s + p.getZ(i) * c + node.position.z;
      if (z < lo) lo = z;
      if (z > hi) hi = z;
    }
  });
  return [lo, hi] as const;
}

/**
 * ⚠️ KOREKSI ASET — kenapa base-nya diperkecil sedikit.
 *
 * Modelnya tidak akurat: alasnya 22,62 cm dalam, sedangkan lid-nya 22,16 cm.
 * MacBook Pro 14" asli 22,12 cm — jadi yang salah ALASNYA, bukan lid-nya. Sisa
 * 4,4 mm itu menjulur di DEPAN tepi lid (18 vertex tepat di ketinggian deck),
 * dan saat tertutup ia terlihat sebagai bilah putih di depan lid: itulah
 * "ketutupnya nggak sempurna". Sudut engselnya sendiri sudah benar — lid sudah
 * menempel di deck, jadi memperbesar LID_CLOSED cuma menancapkannya lebih dalam.
 *
 * Angkanya DITURUNKAN dari geometri, bukan ditulis tangan: base dipepatkan di
 * sumbu Z sampai jejaknya sama persis dengan lid tertutup, dengan tepi BELAKANG
 * dipatok di tempat (di situlah engselnya). Hasilnya 0,9797 / −2,15 mm → base
 * jadi 22,16 cm, ikut mendekati ukuran asli. Kalau suatu saat aset ini
 * dibetulkan di Blender, hitungan ini otomatis jadi 1,0 / 0 — tidak ada yang
 * perlu dicabut.
 *
 * Kenapa runtime dan bukan Blender: menyentuh .blend berarti export ulang
 * seluruh aset, sementara ini murni satu transform node yang bisa dibaca dan
 * dibalik siapa pun yang membuka berkas ini.
 */
const CORRECTION_MAX = 0.05; // > 5% berarti asetnya lain sama sekali — jangan diutak-atik
const CORRECTION_MIN = 0.0005; // < 0,5 mm tidak terlihat; biarkan saja

function matchBaseDepthToLid(root: Object3D) {
  const base = root.getObjectByName(BASE_NODE);
  const lid = root.getObjectByName(LID_NODE);
  if (!base || !lid) return;

  /* Lid harus jadi SAUDARA base dulu. Di glTF-nya ia anak base (Base > Lid >
     ScreenAnchor), jadi menskala base akan ikut menyeret lid dan tidak ada yang
     berubah. Base ber-transform identitas, jadi memindah lid ke root menjaga
     pose dunianya persis. */
  root.add(lid);

  const [lidLo, lidHi] = zSpan(lid, LID_CLOSED);
  const [baseLo, baseHi] = zSpan(base, 0);
  const lidDepth = lidHi - lidLo;
  const baseDepth = baseHi - baseLo;
  if (!(lidDepth > 0) || !(baseDepth > 0)) return;

  const scale = lidDepth / baseDepth;
  const delta = Math.abs(baseDepth - lidDepth);
  if (delta < CORRECTION_MIN || Math.abs(1 - scale) > CORRECTION_MAX) return;

  base.scale.z = scale;
  base.position.z = lidLo - scale * baseLo; // patok tepi belakang, bukan titik asal
}

/** Sekali pakai bersama, dibuat sekali. `useFrame` jalan 60×/dtk; membuat
 *  Vector3 baru di dalamnya berarti memberi makan GC tanpa perlu. */
const SCRATCH_UP = new Vector3();
const SCRATCH_NORMAL = new Vector3();
const SCRATCH_TO_CAM = new Vector3();
const SCRATCH_CENTER = new Vector3();
const SCRATCH_Q = new Quaternion();

/**
 * Ambang munculnya form, dinyatakan sebagai seberapa jauh layar sudah BERPALING
 * ke kamera — `cos` sudut antara normal layar dan arah ke kamera.
 *
 * Kenapa bukan ambang pada `progress`: `<Html transform>` menggambar DOM di atas
 * canvas TANPA uji kedalaman (tidak ada z-buffer untuk elemen DOM), jadi selama
 * lid masih tertutup form-nya tergambar menembus PUNGGUNG lid — punggung
 * aluminium yang seharusnya putih jadi hitam berisi teks tercermin, satu
 * kedipan tepat di frame pertama membuka. Yang menentukan benar-tidaknya form
 * itu terlihat bukan sudut engselnya, melainkan apakah muka layarnya sudah
 * menghadap kita; dan itu persis tanda hasil kali titik di bawah. Ikut benar
 * sendiri kalau kelak rig kameranya digeser atau asetnya diganti.
 *
 * ≤ 0 berarti kita masih melihat punggungnya → sembunyi. Memudar penuh pada
 * 0,4 (≈ 66°), jauh sebelum layarnya cukup tegak untuk dibaca.
 */
const SCREEN_FACE_FADE = 0.4;

/** Geometri kotak laptop saat MENYATU di halaman. `h = 0` berarti sedang
 *  menyatu, jadi tidak ada yang perlu dikoreksi. */
export type DockGeometry = { h: number; dy: number };

/**
 * Menyerahkan store R3F ke luar canvas.
 *
 * Yang dibutuhkan STORE-nya, bukan `state` dari `onCreated`: state itu potret
 * sekali jadi, dan `state.size` di dalamnya beku di ukuran saat canvas lahir.
 * `useStore()` memberi store hidupnya, jadi `getState().size` selalu yang
 * sekarang — itu yang dipakai `syncCanvasSize` untuk tahu perlu-tidaknya
 * menyetel ulang.
 */
function PublishStore({ into }: { into: RefObject<RootStore | null> }) {
  const store = useStore();
  useLayoutEffect(() => {
    into.current = store;
    return () => {
      into.current = null;
    };
  }, [store, into]);
  return null;
}

function Laptop({
  progress,
  zoom,
  dock,
  floating,
  rig,
  screen,
}: {
  progress: MotionValue<number>;
  zoom: MotionValue<number>;
  /** ⚠️ REF, bukan prop biasa — lihat `syncCanvasSize` di bawah. Angka ini harus
   *  berganti dalam commit yang SAMA dengan ukuran canvas-nya; prop baru sampai
   *  ke sini setelah pohon R3F ikut me-render, dan satu frame di antaranya sudah
   *  cukup untuk terlihat sebagai kedipan. */
  dock: RefObject<DockGeometry>;
  floating: boolean;
  rig: CameraRig;
  /** Isi layar. Dipasang hanya kalau ada — `<Html>` menggambar DOM DI ATAS
   *  canvas tanpa uji kedalaman, jadi kalau dibiarkan terpasang saat laptop
   *  tertutup, form-nya melayang menembus punggung lid. */
  screen?: ReactNode;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const invalidate = useThree((s) => s.invalidate);
  /** Pembungkus form di dalam `<Html>`; opacity-nya ditulis tiap frame, lihat
   *  SCREEN_FACE_FADE. */
  const screenRef = useRef<HTMLDivElement>(null);

  /* scene-nya di-CLONE. useGLTF mengembalikan objek Three yang SAMA setiap
     pemanggilan, sedangkan <primitive> memindahkan objek itu ke scene graph-nya
     sendiri. <Contact/> dirender di tiga ruangan (lib/roomContent.tsx) — tanpa
     clone, instance kedua mencuri laptop dari yang pertama dan yang pertama
     jadi kosong. Geometri & material tetap dibagi, jadi clone ini nyaris gratis
     (680 tris). */
  const root = useMemo(() => {
    const clone = scene.clone(true);
    matchBaseDepthToLid(clone);
    return clone;
  }, [scene]);
  const lid = useMemo(() => root.getObjectByName(LID_NODE) ?? null, [root]);
  const anchor = useMemo(() => root.getObjectByName(SCREEN_NODE) ?? null, [root]);

  /**
   * Bidang layar pada pose TERBUKA — pusat dan normalnya.
   *
   * Diturunkan dari aset, bukan ditulis tangan: `ScreenAnchor` kebetulan duduk
   * tepat di titik berat muka lid, dan sumbu **+Y lokalnya adalah normal layar**
   * (quaternion-nya +70° terhadap X). Karena saat terbuka `lid.rotation.x = 0`
   * dan root tidak diputar, posisi dunia anchor tinggal penjumlahan dua translasi.
   *
   * Kalau asetnya kelak diganti, angka-angka ini ikut berubah sendiri.
   */
  const openPose = useMemo(() => {
    if (!lid || !anchor) return null;
    const center = new Vector3().copy(anchor.position).add(lid.position);
    const normal = new Vector3(0, 1, 0).applyQuaternion(anchor.quaternion).normalize();
    return { center, normal };
  }, [lid, anchor]);

  /**
   * Kamera maju — digerakkan pegasnya SENDIRI (`zoom`), bukan pegas engsel.
   *
   * Pada t=0 dia di rig halaman (menyerong, laptop kelihatan sebagai benda); pada
   * t=1 dia duduk **di sumbu normal layar** dan membidik pusat layar — jadi
   * layarnya tegak lurus kamera. Itu bukan sekadar selera: `<Html transform>`
   * merender DOM lalu memiringkannya dengan transform CSS 3D, dan DOM yang
   * miring diraster sekali lalu diinterpolasi = teksnya buram. Tegak lurus
   * berarti transformnya murni penskalaan, dan teksnya tajam.
   *
   * Yang berpindah KAMERANYA, bukan laptopnya: dua directionalLight di bawah
   * terpasang di ruang dunia, jadi memutar laptop akan menggeser kilau
   * aluminiumnya dan pose terbukanya jadi terlihat lain dari yang sudah disetel.
   *
   * ── Kenapa ada koreksi `k` dan geseran `pan` ──────────────────────────────
   *
   * Saat form dibuka, pembungkusnya naik jadi `fixed inset-0`, jadi canvas ini
   * berubah dari kotak ~468px jadi setinggi layar DALAM SATU FRAME. `fov`
   * three.js vertikal, jadi tinggi piksel yang berubah = laptopnya seketika
   * ~2× lebih besar, dan pindah dari tengah kotak ke tengah viewport. Dolly
   * semulus apa pun setelah lompatan itu tetap terbaca sebagai sentakan.
   *
   * Keduanya dibatalkan di sini, bukan dengan menganimasikan tata letak DOM —
   * mengubah ukuran canvas tiap frame berarti `setSize` + realokasi buffer 60×
   * per detik, ongkos yang jauh lebih besar daripada dua baris aritmetika:
   *
   *   k   = tinggi layar / tinggi kotak → jarak awal kamera dikali k, jadi
   *         ukuran PIKSEL laptop persis sama sebelum dan sesudah promote.
   *         (Saat menyatu, `dockHeight` = 0 → k = 1; koreksinya mati sendiri.)
   *   pan = kamera + bidikan digeser ke arah "atas layar" sejauh w, yang
   *         menurunkan bayangan sebanyak `dockOffsetY` piksel — mengembalikan
   *         laptop ke tempatnya semula di layar.
   *
   * Keduanya dikalikan (1−t), jadi lenyap tepat saat kamera sampai.
   *
   * ⚠️ `size` dan `dock` dibaca LANGSUNG dari keadaan hidup, bukan dari hasil
   * render. Keduanya harus sepakat pada frame yang sama persis: `k` itu rasio di
   * antara mereka, jadi satu frame dengan `size` baru tapi `dock` lama (atau
   * sebaliknya) menggambar laptopnya di ukuran yang salah — persis kedipan yang
   * dilaporkan. `state` yang dioper useFrame adalah isi store SAAT ITU, jadi
   * membacanya dari sana kebal terhadap tertinggalnya render.
   */
  useFrame((state) => {
    if (!openPose) return;
    const { camera, size } = state;
    const { h: dockHeight, dy: dockOffsetY } = dock.current;
    const t = zoom.get();
    const aspect = size.height > 0 ? size.width / size.height : 1;
    const halfTan = Math.tan((rig.fov * Math.PI) / 180 / 2);
    const distance = overlayDistance(rig.fov, aspect);

    const k =
      dockHeight > 0 && size.height > 0 ? size.height / dockHeight : 1;

    /* Diskalakan dari titik BIDIKAN, bukan dari titik asal: yang harus tetap di
       tempatnya adalah apa yang dilihat kamera, bukan pusat dunia. */
    const fromX = rig.lookAt[0] + (rig.position[0] - rig.lookAt[0]) * k;
    const fromY = rig.lookAt[1] + (rig.position[1] - rig.lookAt[1]) * k;
    const fromZ = rig.lookAt[2] + (rig.position[2] - rig.lookAt[2]) * k;

    const toX = openPose.center.x + openPose.normal.x * distance;
    const toY = openPose.center.y + openPose.normal.y * distance;
    const toZ = openPose.center.z + openPose.normal.z * distance;

    const px = MathUtils.lerp(fromX, toX, t);
    const py = MathUtils.lerp(fromY, toY, t);
    const pz = MathUtils.lerp(fromZ, toZ, t);
    const tx = MathUtils.lerp(rig.lookAt[0], openPose.center.x, t);
    const ty = MathUtils.lerp(rig.lookAt[1], openPose.center.y, t);
    const tz = MathUtils.lerp(rig.lookAt[2], openPose.center.z, t);

    camera.position.set(px, py, pz);
    camera.lookAt(tx, ty, tz);

    if (dockOffsetY !== 0 && t < 1 && size.height > 0) {
      /* Menggeser kamera ke atas sejauh w menurunkan bayangan sebanyak
         w·H/(2·tan(fov/2)·d) piksel. Dibalik untuk mendapat w dari piksel yang
         diinginkan. `d` dihitung dari pose SAAT INI, bukan pose awal, supaya
         geserannya tetap benar sepanjang perjalanan. */
      const d = Math.hypot(px - tx, py - ty, pz - tz);
      const w = ((dockOffsetY * 2 * halfTan * d) / size.height) * (1 - t);
      /* Arah "atas layar" = sumbu +Y kamera setelah dibidikkan. */
      SCRATCH_UP.set(0, 1, 0).applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(SCRATCH_UP, w);
      /* Bidikan digeser dengan vektor yang SAMA — kalau tidak, ini jadi memutar
         kamera (orbit), bukan menggeser bingkai, dan laptopnya ikut miring. */
      camera.lookAt(
        tx + SCRATCH_UP.x * w,
        ty + SCRATCH_UP.y * w,
        tz + SCRATCH_UP.z * w,
      );
    }

    /* Form muncul mengikuti berpalingnya layar, bukan mengikuti engselnya —
       alasannya di SCREEN_FACE_FADE. Dihitung SETELAH kamera dipindah supaya
       memakai pose frame ini juga, bukan frame kemarin. */
    const el = screenRef.current;
    if (el && anchor) {
      /* getWorld* memperbarui rantai matriks induknya sendiri, jadi rotasi
         melayang yang baru ditulis useFrame lain ikut terbaca. */
      anchor.getWorldQuaternion(SCRATCH_Q);
      anchor.getWorldPosition(SCRATCH_CENTER);
      SCRATCH_NORMAL.set(0, 1, 0).applyQuaternion(SCRATCH_Q);
      SCRATCH_TO_CAM.copy(camera.position).sub(SCRATCH_CENTER).normalize();
      const facing = SCRATCH_NORMAL.dot(SCRATCH_TO_CAM);
      const a = MathUtils.clamp(facing / SCREEN_FACE_FADE, 0, 1);
      el.style.opacity = `${a}`;
      /* Bukan cuma opacity: pada 0 elemennya masih menangkap klik dan masih
         terbaca pembaca layar, padahal layarnya belum ada. */
      el.style.visibility = a > 0 ? "visible" : "hidden";
    }
  });

  useEffect(() => {
    if (!lid) {
      console.warn(`[InquiryLaptop] node "${LID_NODE}" tidak ada di ${MODEL_URL}`);
      return;
    }
    const apply = (t: number) => {
      lid.rotation.x = MathUtils.lerp(LID_CLOSED, LID_OPEN, t);
      invalidate();
    };
    /* Pose awal WAJIB ditulis saat mount: MotionValue tidak memancarkan "change"
       untuk nilai awalnya, dan pengunjung bisa mendarat langsung lewat #contact. */
    apply(progress.get());
    return progress.on("change", apply);
  }, [lid, progress, invalidate]);

  /**
   * ⚠️ WAJIB, dan gampang terlupa: frameloop-nya "demand", jadi useFrame di atas
   * hanya jalan pada frame yang DIPESAN. Pegas engsel sudah memesannya lewat
   * `apply`, tapi sejak kamera punya pegas sendiri yang lebih lambat, engselnya
   * selesai ~0,5 dtk sementara kamera masih berjalan sampai ~1,4 dtk. Tanpa
   * baris ini tidak ada lagi yang memesan frame setelah engsel diam dan
   * kameranya membeku di tengah jalan.
   */
  /* Dibungkus, tidak dioper langsung: pendengar MotionValue menerima nilainya
     sebagai argumen pertama, dan argumen pertama `invalidate` adalah JUMLAH
     FRAME — `invalidate(0.37)` bukan yang dimaksud. */
  useEffect(() => zoom.on("change", () => invalidate()), [zoom, invalidate]);

  /* Naik/turunnya lapisan overlay tidak menyentuh MotionValue mana pun, jadi
     framenya harus dipesan sendiri — tapi BUKAN dari sini lagi: `dock` sekarang
     ref, dan ref tidak memicu efek. Yang memesannya `syncCanvasSize` di bawah,
     di commit yang sama dengan perubahan tata letaknya. */

  /* Melayang — porting langsung dari pmndrs. Target-nya 0 saat tertutup.
     Saat MENUTUP, `floating` sudah false padahal laptopnya masih miring — yang
     mengembalikannya ke tegak adalah frame-frame yang dipesan invalidate() milik
     pegas engsel di atas: useFrame ikut jalan di frame "demand" juga. Pegasnya
     ~50 frame, 0.9^50 ≈ 0,5% sisa — di bawah ambang terlihat. Jadi tidak perlu
     timer penenang terpisah. */
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    root.rotation.x = MathUtils.lerp(
      root.rotation.x,
      floating ? (Math.cos(t / 10) / 10 + 0.25) * FLOAT_SCALE : 0,
      FLOAT_LERP,
    );
    root.rotation.y = MathUtils.lerp(
      root.rotation.y,
      floating ? (Math.sin(t / 10) / 4) * FLOAT_SCALE : 0,
      FLOAT_LERP,
    );
    root.rotation.z = MathUtils.lerp(
      root.rotation.z,
      floating ? (Math.sin(t / 10) / 10) * FLOAT_SCALE : 0,
      FLOAT_LERP,
    );
    root.position.y = MathUtils.lerp(
      root.position.y,
      floating ? Math.sin(t) * BOB_M : 0,
      FLOAT_LERP,
    );
  });

  return (
    <>
      <primitive object={root} />
      {/* Diportal ke `ScreenAnchor`, bukan dirender sebagai anak <primitive>:
          anchor-nya SUDAH ada di scene graph (Base > Lid > ScreenAnchor), jadi
          menyebutnya lagi sebagai <primitive> akan mencabut dan memasangnya
          ulang. `createPortal` menaruh anak-anaknya di objek yang sudah ada
          tanpa menyentuh susunannya. */}
      {screen &&
        anchor &&
        createPortal(
          <Html
            transform
            /* −90° terhadap X: sumbu +Y anchor adalah normal layar, sedangkan
               bidang DOM tegak di XY. Kebetulan sama persis dengan angka yang
               dipakai pmndrs floating-laptop. */
            rotation-x={-Math.PI / 2}
            position={[0, HTML_LIFT, 0]}
            scale={HTML_SCALE}
            /* Tanpa `occlude`: satu-satunya benda yang bisa menghalangi form
               adalah laptopnya sendiri, dan pada pose overlay layarnya menghadap
               kamera. Occlusion di drei menambah mesh + pass render — ongkos
               tanpa manfaat di sini. */
            style={{ width: DESIGN_W, height: DESIGN_H }}
          >
            {/* Mulai TERSEMBUNYI. Frame pertama setelah mount melukisnya sebelum
                useFrame di atas sempat menghitung apa pun; kalau bawaannya
                terlihat, kedipan yang sedang dihilangkan ini justru tetap ada
                satu frame. */}
            <div
              ref={screenRef}
              className="h-full w-full"
              style={{ opacity: 0, visibility: "hidden" }}
            >
              {screen}
            </div>
          </Html>,
          anchor,
        )}
    </>
  );
}

/**
 * Pembingkaian — dihitung, bukan dikira-kira.
 *
 * Setelan pertama (jarak 0,54 m) memotong laptopnya: memproyeksikan tiap vertex
 * di SEMUA pose yang mungkin memberi NDC y[−1,29 … 1,08], jadi terpotong di
 * atas DAN di bawah. Bahkan pose tertutup pun sudah keluar (y = −1,03) — itu
 * yang terlihat di tangkapan layar.
 *
 * ⚠️ Memperbesar tinggi kotaknya TIDAK menolong. `fov` three.js itu VERTIKAL,
 * jadi batas NDC-y sama sekali tidak bergantung pada tinggi kotak dalam piksel;
 * kotak yang lebih tinggi cuma membesarkan semuanya, potongannya tetap. Yang
 * bisa mengubahnya hanya jarak/fov/arah bidik kamera.
 *
 * Angka di bawah = jarak terdekat yang masih memuat semua pose (tertutup,
 * terbuka, plus ayunan melayang ekstrem) dengan sisa ~18%.
 *
 * Di layar LEBAR sumbu Y yang mengikat: y[−0,81 … 0,82], x cuma sampai 0,34.
 * Di layar SEMPIT terbalik — X yang mengikat, karena kotaknya jadi jangkung.
 * Karena itu arah bidiknya beda per-konfigurasi, jadi lookAt ikut di sini.
 *
 * ⚠️ Rig sempit dihitung untuk SELURUH rentang aspect kotaknya sekaligus, bukan
 * satu angka. Versi pertamanya disetel pada 0,95 dan muat di situ, tapi kotak
 * 342×439 (iPhone 390px, px-6) beraspect 0,78 — di sana laptopnya keluar tepi
 * kiri dan kanan (x sampai ±1,05). Rentang nyatanya 0,78 (390×844) sampai 1,38
 * (767×1024), diturunkan dari `h-[52vh] max-h-[520px] min-h-[280px]` + `px-6`;
 * kalau kelas itu berubah, hitung ulang rentangnya dulu.
 *
 * Di rentang itu X yang mengikat (±0,88) dan Y longgar, jadi lookAt.y dipilih
 * untuk MENENGAHKAN — 0,08 memberi y[−0,61 … 0,61], pusat tepat 0.
 */
type CameraRig = {
  position: [number, number, number];
  fov: number;
  lookAt: [number, number, number];
};

function cameraFor(narrow: boolean): CameraRig {
  return narrow
    ? { position: [0.243, 0.304, 0.882], fov: 34, lookAt: [0, 0.08, -0.01] }
    : { position: [0.369, 0.298, 0.625], fov: 34, lookAt: [0, 0.07, -0.01] };
}

export default function InquiryLaptop({
  progress,
  zoom,
  dockHeight = 0,
  dockOffsetY = 0,
  floating = false,
  className,
  screen,
}: {
  /** Engsel. 0 = tertutup, 1 = terbuka. Sumbernya bebas — sekarang pegas yang
   *  dipicu klik; dulu scrollYProgress. Rig ini tidak peduli. */
  progress: MotionValue<number>;
  /** Kamera. 0 = rig halaman, 1 = tegak lurus di depan layar. Pegas TERPISAH
   *  dari engsel, dan sengaja lebih lembut — lihat CAMERA_SPRING di Contact.tsx. */
  zoom: MotionValue<number>;
  /** Tinggi kotak laptop saat MENYATU di halaman (px), diukur pemanggil tepat
   *  sebelum lapisannya naik jadi `fixed`. 0 = sedang menyatu, koreksi mati. */
  dockHeight?: number;
  /** Jarak pusat kotak itu dari pusat viewport (px, ke bawah positif). */
  dockOffsetY?: number;
  /** Nyalakan gerak melayang. Pemanggil yang memutuskan (mis. matikan saat
   *  prefers-reduced-motion), lihat kontrak frameloop di atas. */
  floating?: boolean;
  className?: string;
  /** DOM yang ditempel di layar (form inquiry). Kosongkan saat laptop tertutup. */
  screen?: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const narrow = useNarrowViewport();
  const rig = useMemo(() => cameraFor(narrow), [narrow]);

  /**
   * ⚠️ UKURAN CANVAS DISAMAKAN SENDIRI, DALAM COMMIT YANG SAMA. Jangan dicabut.
   *
   * R3F mengukur canvas-nya lewat ResizeObserver → state React → `gl.setSize`.
   * Rantai itu benar, tapi TERLAMBAT: diukur 13 Agu, canvas baru menyusul ~58 ms
   * (3–4 frame) setelah tata letaknya berubah. Selama jendela itu gambar laptop
   * berada di ukuran dan tempat yang bukan tempatnya:
   *
   *   membuka  → pembungkus sudah `fixed inset-0`, canvas masih sebesar kotak
   *              52vh dan ikut ditengahkan flex → laptop melompat ke atas dan
   *              mengecil, lalu balik lagi;
   *   menutup  → pembungkus sudah kembali ke kotak, canvas masih setinggi layar
   *              → laptop tergambar ~2× terlalu besar dan ~180 px terlalu rendah,
   *              lalu menyentak ke tempatnya.
   *
   * Itulah "ngeflick" saat buka dan "posisinya beda lalu balik" saat tutup.
   *
   * Perbaikannya bukan menunggu lebih rapi, melainkan mendahului: `dockHeight`
   * berubah di commit yang sama dengan perubahan tata letak, jadi begitu ia
   * berubah kita ukur sendiri host-nya dan dorong angkanya ke store R3F. Efek
   * LAYOUT (bukan `useEffect`) jalan setelah DOM ditulis tapi SEBELUM dilukis,
   * jadi tidak pernah ada frame yang sempat salah. `setSize` di store langsung
   * memanggil `gl.setSize` lewat langganannya — sinkron, sebelum cat.
   *
   * Kenapa aman terhadap R3F yang menyusul: efek layout anak jalan lebih dulu
   * daripada induknya, jadi `<Canvas>` (anak) sudah menyetel ukuran LAMA-nya
   * sebelum baris di bawah menimpanya dengan yang baru — kita selalu dapat kata
   * terakhir di commit ini. Saat ResizeObserver-nya akhirnya mengejar, angkanya
   * sudah sama dan tidak ada yang berubah.
   *
   * ⚠️ TANPA DAFTAR DEPENDENSI, dan itu disengaja. Versi pertama digerbangi
   * `[dockHeight, dockOffsetY]` dan setengahnya gagal — terukur: saat menutup
   * bersih, saat membuka masih berkedip. Sebabnya `<Canvas>` MENERAPKAN ULANG
   * hasil ukurannya sendiri di SETIAP render, bukan cuma saat ukurannya berubah
   * (`configure` selalu memanggil `setSize`, dan pembanding kesamaannya tak
   * pernah cocok karena rect-nya berkunci lebih banyak daripada `size`). Jadi
   * satu render apa pun yang menyelip sebelum ResizeObserver-nya mengejar akan
   * mengembalikan ukuran basi itu — saat membuka memang ada, dari `inquiryOpen`
   * yang menyalakan ulang pohon di atas. Dijalankan di setiap render, setiap
   * pengembalian seperti itu langsung ditimpa lagi di commit yang sama.
   *
   * Ongkosnya satu `getBoundingClientRect` per render komponen ini — dan
   * `setSize`-nya sendiri baru dipanggil kalau angkanya memang beda, supaya
   * tidak ada frame yang dipesan percuma.
   *
   * `dock` ikut ditulis di sini, bukan dioper sebagai prop, supaya rasio `k` di
   * `Laptop` tidak pernah melihat ukuran baru berpasangan dengan dock lama.
   */
  const storeRef = useRef<RootStore | null>(null);
  const dock = useRef<DockGeometry>({ h: 0, dy: 0 });

  useLayoutEffect(() => {
    dock.current = { h: dockHeight, dy: dockOffsetY };

    const store = storeRef.current;
    if (!store) return;
    const { gl, size, setSize, invalidate } = store.getState();
    const host = gl.domElement.parentElement;
    if (!host) return;

    const r = host.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return;
    if (
      r.width === size.width &&
      r.height === size.height &&
      r.top === size.top &&
      r.left === size.left
    ) {
      return;
    }

    setSize(r.width, r.height, r.top, r.left);
    /* Frameloop "demand": tanpa ini pose barunya tidak pernah dilukis. */
    invalidate();
  });
  /* `lookAt` DIPISAH dari prop <Canvas camera>. R3F menyalin isi objek itu ke
     kameranya lewat applyProps — dan `lookAt` di Object3D adalah METHOD, jadi
     menyertakannya akan menimpanya dengan sebuah array dan pembidikan di
     `Laptop` langsung meledak. Yang boleh masuk cuma properti kamera betulan. */
  const camera = useMemo(
    () => ({ position: rig.position, fov: rig.fov }),
    [rig],
  );

  /* Gerbang kedua: melayang di luar layar itu membakar GPU tanpa ada yang
     melihat. Margin 200px supaya sudah berdetak sebelum benar-benar terlihat,
     jadi tidak ada frame pertama yang tersendat. */
  const inView = useInView(wrapRef, { margin: "200px" });
  const active = floating && inView;

  return (
    /* `aria-hidden` hanya selama laptopnya benda hias. Begitu form-nya menempel
       di layar, isinya DOM sungguhan yang harus terbaca pembaca layar — menutupi
       seluruh pohon ini akan membuat form-nya lenyap dari accessibility tree. */
    <div ref={wrapRef} className={className} aria-hidden={screen ? undefined : "true"}>
      <Canvas
        frameloop={active ? "always" : "demand"}
        dpr={[1, 1.5]}
        camera={camera}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <PublishStore into={storeRef} />
        {/* Aset ini TIDAK punya lightmap — pada default 0.18 hasilnya nyaris hitam. */}
        <SceneEnvironment intensity={1.1} />
        <directionalLight position={[0.4, 0.7, 0.5]} intensity={1.6} />
        <directionalLight position={[-0.5, 0.3, -0.4]} intensity={0.35} />
        <Suspense fallback={null}>
          <Laptop
            progress={progress}
            zoom={zoom}
            dock={dock}
            floating={active}
            rig={rig}
            screen={screen}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
