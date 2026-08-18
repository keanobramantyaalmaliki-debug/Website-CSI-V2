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
import {
  MathUtils,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from "three";
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
 * Pembingkaian DORONGAN — jalur layar sempit, tempat form TIDAK menempel di
 * layar 3D melainkan mendarat sebagai lembar DOM datar.
 *
 * Bedanya dengan `overlayDistance` cuma satu, tapi itu yang menentukan: **pagar
 * lebarnya dibuang.** Pagar itu ada supaya seluruh muka lid tetap muat
 * kiri-kanan — wajib kalau form-nya harus TERBACA di layar itu, sia-sia kalau
 * layarnya cuma dilewati.
 *
 * Dan justru pagar itu yang mengikat di sini. Di kotak laptop HP (~366×520,
 * aspect 0,70) `overlayDistance` memilih kendala lebar dan memberi ~0,85,
 * sementara rig halamannya sudah berdiri di ~0,95 — dorongannya cuma ~10%, tidak
 * terbaca sebagai gerakan sama sekali. Dikunci ke TINGGI saja, targetnya jatuh
 * ke ~0,40: 2,4× lebih dekat, di atas ~1,6× yang sudah didapat gratis dari
 * kotak-ke-layar-penuh (lihat `framed` di useFrame).
 *
 * Konsekuensinya lid terpotong kiri-kanan, dan itu memang tujuannya: layar
 * laptop LANSKAP (1,5:1) di viewport POTRET (~0,43:1) tidak bisa didekati tanpa
 * memotong — tepi yang keluar bingkai justru yang membuat "masuk" terbaca.
 *
 * ⚠️ Ini bukan pose diam yang harus tahan dipandangi. Lembar form sudah legap
 * penuh jauh sebelum t=1 (lihat SHEET_FADE di Contact.tsx), jadi yang perlu
 * benar cuma bagian AWAL lintasannya.
 */
const PUSH_FILL_H = 0.85;

function pushDistance(fovDeg: number) {
  return FACE_H / PUSH_FILL_H / (2 * Math.tan((fovDeg * Math.PI) / 180 / 2));
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
const SCRATCH_NORMAL = new Vector3();
const SCRATCH_TO_CAM = new Vector3();
const SCRATCH_CENTER = new Vector3();
const SCRATCH_Q = new Quaternion();

/**
 * Kotak laptop di LAYAR, sebagai pecahan kotak canvas (0–1, kiri-atas).
 *
 * Dipakai <Contact/> untuk menciutkan tombol "buka form" dari seluruh kotak
 * jadi seukuran laptopnya sendiri. Pecahan, bukan piksel, supaya nilainya tetap
 * benar dipasang sebagai `left/top/width/height` persen — dan supaya tidak ada
 * yang perlu ikut memikirkan dpr.
 */
export type HitRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const SCRATCH_VERTEX = new Vector3();

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

/** Geometri kotak laptop saat MENYATU di halaman: tingginya, dan jarak pusatnya
 *  dari pusat viewport. `h = 0` berarti sedang menyatu, jadi tidak ada yang
 *  perlu dikoreksi. */
export type DockGeometry = { h: number; dx: number; dy: number };

/**
 * Menyerahkan store R3F ke luar canvas.
 *
 * Yang dibutuhkan STORE-nya, bukan `state` dari `onCreated`: state itu potret
 * sekali jadi, dan `state.size` di dalamnya beku di ukuran saat canvas lahir.
 * `useStore()` memberi store hidupnya, jadi `getState().size` selalu yang
 * sekarang — itu yang dipakai `syncCanvasSize` untuk tahu perlu-tidaknya
 * menyetel ulang.
 */
/**
 * Geseran posisi kotak→viewport, sebagai transform CSS. Ditulis ke pembungkus
 * yang memuat canvas DAN elemen `<Html>`, supaya keduanya mustahil berselisih —
 * alasan lengkapnya di `useFrame` milik `Laptop`.
 *
 * Dipakai dari DUA tempat (tiap frame dari `useFrame`, dan sekali dari efek
 * layout saat tata letaknya berganti), jadi rumusnya tinggal di sini saja
 * supaya tidak ada dua salinan yang bisa berselisih.
 */
function applyDockShift(
  el: HTMLElement | null,
  dockGeom: DockGeometry,
  t: number,
) {
  if (!el) return;
  const away = dockGeom.h > 0 && t < 1 ? 1 - t : 0;
  el.style.transform =
    away > 0
      ? `translate3d(${dockGeom.dx * away}px, ${dockGeom.dy * away}px, 0)`
      : "";
}

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
  host,
  floating,
  rig,
  screen,
  onHitbox,
}: {
  progress: MotionValue<number>;
  zoom: MotionValue<number>;
  /** ⚠️ REF, bukan prop biasa — lihat `syncCanvasSize` di bawah. Angka ini harus
   *  berganti dalam commit yang SAMA dengan ukuran canvas-nya; prop baru sampai
   *  ke sini setelah pohon R3F ikut me-render, dan satu frame di antaranya sudah
   *  cukup untuk terlihat sebagai kedipan. */
  dock: RefObject<DockGeometry>;
  /** Pembungkus yang memuat canvas DAN elemen `<Html>`. Geseran posisi ditulis
   *  ke sini sebagai transform CSS — lihat catatan di `useFrame`. */
  host: RefObject<HTMLDivElement | null>;
  floating: boolean;
  rig: CameraRig;
  /** Isi layar. Dipasang hanya kalau ada — `<Html>` menggambar DOM DI ATAS
   *  canvas tanpa uji kedalaman, jadi kalau dibiarkan terpasang saat laptop
   *  tertutup, form-nya melayang menembus punggung lid. */
  screen?: ReactNode;
  /** Dipanggil setiap kali kotak laptop di layar berubah. Lihat HitRect. */
  onHitbox?: (rect: HitRect) => void;
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
   * ── Kenapa lompatan tata letaknya dibatalkan lewat PROYEKSI ───────────────
   *
   * Saat form dibuka, pembungkusnya naik jadi `fixed inset-0`, jadi canvas ini
   * berubah dari kotak ~397px jadi setinggi layar DALAM SATU FRAME. `fov`
   * three.js vertikal, jadi tinggi piksel yang berubah = laptopnya seketika
   * ~2× lebih besar, dan pindah dari tengah kotak ke tengah viewport. Dolly
   * semulus apa pun setelah lompatan itu tetap terbaca sebagai sentakan.
   *
   * ⚠️ Versi sebelumnya membatalkannya dengan MEMINDAHKAN KAMERA: jarak dikali
   * `k = tinggi layar / tinggi kotak`, lalu digeser sejauh `pan` untuk
   * mengembalikan posisi di layar. Itu SALAH, dan salahnya tidak kelihatan di
   * angka ukuran canvas — cuma di piksel. Terukur 13 Agu
   * (`scripts/probe-contact-settle.mjs`): sepanjang menutup laptopnya konvergen
   * ke kotak 313×133 padahal pose istirahatnya 310×120, lalu MENYENTAK ke pose
   * benar tepat saat `settling` mati (t≈2,4 dtk, Δ 9 px). Itu "posisinya beda
   * lalu tiba-tiba balik" yang dilaporkan.
   *
   * Sebabnya: memundurkan kamera 1,92× sambil membesarkan gambar 1,92× hanya
   * mempertahankan ukuran benda yang tepat di bidang bidikan. Segala yang di
   * depan/belakang bidang itu ikut berubah — perspektifnya memipih, seperti
   * berganti ke lensa tele. Karena itu lebarnya cuma meleset 1% sementara
   * TINGGINYA 9%: yang berubah sudut pandang, bukan skala. Geseran `pan` punya
   * penyakit yang sama, ia translasi di ruang dunia, bukan geseran bingkai.
   *
   * Yang benar: kameranya JANGAN disentuh sama sekali, geser BINGKAINYA. Itu
   * persis `camera.setViewOffset(fw, fh, ox, oy, w, h)` — proyeksi off-axis
   * (frustum miring), tanpa memindahkan titik pandang, jadi perspektifnya
   * identik sampai piksel terakhir.
   *
   *   fh = tinggi "gambar penuh" yang direntang fov. Saat t=0 ia setinggi KOTAK
   *        (jadi skala pikselnya sama persis seperti sebelum naik), saat t=1 ia
   *        setinggi canvas (proyeksi normal). Di antaranya di-lerp.
   *
   * Hasilnya pada t=0 render-nya identik dengan keadaan menyatu, jadi saat
   * `settling` mati dan lapisannya turun tidak ada apa pun yang berubah.
   *
   * ── Kenapa BINGKAINYA TETAP TERPUSAT, dan posisinya diurus CSS ────────────
   *
   * Godaannya: pakai `ox`/`oy` sekalian untuk menaruh sumbu kamera di pusat
   * KOTAK, bukan pusat viewport — satu panggilan, beres. Itu benar untuk WebGL
   * tapi MERUSAK form-nya, dan begitulah keluhan "layar form delay tidak
   * sinkron dengan layar MacBook" muncul.
   *
   * Sebabnya `<Html transform>` drei tidak menggambar lewat WebGL — ia meniru
   * kamera dengan CSS 3D: `perspective` + matriks-balik kamera + `translate(
   * lebar/2, tinggi/2)`. Perhatikan bagian terakhir itu: titik hilangnya
   * DIPATOK di pusat canvas, dan `perspective-origin` CSS juga default 50% 50%.
   * Skalanya sendiri ikut benar (`projectionMatrix.elements[5] × tinggi/2`
   * kebetulan tepat = fh/(2·tan(fov/2))), tapi titik pusatnya tidak bisa
   * digeser. Frustum miring menggeser titik pusat proyeksi, dan untuk kamera
   * lubang-jarum itu **persis sama dengan menggeser seluruh gambar** — sebesar
   * (dx, dy)·(1−t) piksel, sama untuk segala kedalaman. Jadi form-nya melenceng
   * dari lid sejauh itu, lalu "menyusul" saat t→1. Terlihat seperti delay,
   * padahal murni salah tempat.
   *
   * Maka tugasnya dibelah:
   *   SKALA  → `setViewOffset` yang TETAP terpusat (ox = 0, oy = (fh−h)/2).
   *            Asumsi drei jadi benar lagi, bukan kebetulan benar.
   *   POSISI → transform CSS di pembungkus yang memuat canvas DAN elemen
   *            `<Html>`. Keduanya bergerak bersama, jadi mustahil berselisih.
   *
   * ⚠️ `size` dan `dock` dibaca LANGSUNG dari keadaan hidup, bukan dari hasil
   * render. Keduanya harus sepakat pada frame yang sama persis — satu frame
   * dengan `size` baru tapi `dock` lama menggambar laptopnya di ukuran yang
   * salah. `state` yang dioper useFrame adalah isi store SAAT ITU, jadi
   * membacanya dari sana kebal terhadap tertinggalnya render.
   */
  useFrame((state) => {
    if (!openPose) return;
    const { camera, size } = state;
    /* Rig ini selalu perspektif (lihat `camera` di <Canvas> bawah); R3F yang
       menyatukan tipenya dengan ortografis. Dipersempit sekali di sini. */
    if (!(camera instanceof PerspectiveCamera)) return;
    const { h: dockHeight } = dock.current;
    const t = zoom.get();

    /* Jendela virtual yang menyusut dari kotak halaman ke canvas penuh. Di luar
       masa overlay `dockHeight` = 0 dan semuanya kembali ke proyeksi biasa. */
    const framed = dockHeight > 0 && size.height > 0 && t < 1;
    const fh = framed
      ? MathUtils.lerp(dockHeight, size.height, t)
      : size.height;
    if (framed) {
      /* Canvas duduk PERSIS di tengah gambar penuh — sumbu kamera tetap di
         pusat canvas, satu-satunya tempat yang bisa ditiru drei. */
      camera.setViewOffset(
        size.width,
        fh,
        0,
        (fh - size.height) / 2,
        size.width,
        size.height,
      );
    } else if (camera.view?.enabled) {
      /* ⚠️ `clearViewOffset` TIDAK memulihkan `aspect` — `setViewOffset`
         menimpanya dengan fw/fh dan tidak pernah mengembalikannya. */
      camera.clearViewOffset();
      camera.aspect = size.height > 0 ? size.width / size.height : 1;
      camera.updateProjectionMatrix();
    }

    /* Bagian POSISI. Digeser di ruang layar, bukan di proyeksi, supaya form-nya
       ikut terbawa persis sama. `translate3d` = murni komposit, tidak ada tata
       letak yang dihitung ulang. */
    applyDockShift(host.current, dock.current, t);

    /* Tujuan dolly dihitung dari aspek canvas SEBENARNYA, bukan `fh` yang
       sedang di-lerp: yang dibingkai pas adalah pose AKHIR, dan di t=1 bingkai
       off-axis-nya sudah identitas.

       `push` tidak memakai aspect sama sekali — ia dikunci ke tinggi dan memang
       BOLEH memotong kiri-kanan. Lihat pushDistance. */
    const distance =
      rig.fill === "push"
        ? pushDistance(rig.fov)
        : overlayDistance(
            rig.fov,
            size.height > 0 ? size.width / size.height : 1,
          );

    const toX = openPose.center.x + openPose.normal.x * distance;
    const toY = openPose.center.y + openPose.normal.y * distance;
    const toZ = openPose.center.z + openPose.normal.z * distance;

    camera.position.set(
      MathUtils.lerp(rig.position[0], toX, t),
      MathUtils.lerp(rig.position[1], toY, t),
      MathUtils.lerp(rig.position[2], toZ, t),
    );
    camera.lookAt(
      MathUtils.lerp(rig.lookAt[0], openPose.center.x, t),
      MathUtils.lerp(rig.lookAt[1], openPose.center.y, t),
      MathUtils.lerp(rig.lookAt[2], openPose.center.z, t),
    );

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
   * Kotak laptop TERTUTUP di layar — untuk menciutkan tombol "buka form" di
   * <Contact/> jadi seukuran laptopnya, bukan sekotak canvas.
   *
   * Dihitung, bukan ditulis tangan, karena angkanya beda per konfigurasi: rig
   * sempit dan rig lebar memandang dari tempat yang berbeda, dan `fov` three.js
   * VERTIKAL sehingga lebar terproyeksinya ikut berubah tiap kali aspect kotak
   * berubah. Satu pasang angka tetap akan meleset di hampir semua ukuran layar.
   *
   * ⚠️ Kameranya kamera SEMENTARA, bukan `state.camera`. Kamera hidup baru
   * dibidikkan (`lookAt`) di dalam `useFrame`, jadi pada frame pertama
   * orientasinya masih bawaan — mengukur dari sana memberi kotak yang salah
   * sekali, tepat pada saat satu-satunya pengukuran terjadi. Membangun kamera
   * sendiri dari `rig` membuat hasilnya tidak bergantung pada urutan itu.
   *
   * Yang diukur pose TERTUTUP & TEGAK: engsel dipaksa ke LID_CLOSED dan
   * transform melayang `root` dinolkan sepanjang pengukuran, lalu keduanya
   * dikembalikan. Tanpa itu hasilnya ikut bergoyang mengikuti animasi — padahal
   * tombolnya justru cuma ada saat laptop diam & tertutup. Semuanya sinkron di
   * dalam satu efek, jadi tidak ada frame yang sempat melihat pose sementara
   * ini.
   */
  const size = useThree((s) => s.size);
  useEffect(() => {
    if (!onHitbox || !lid || size.width <= 0 || size.height <= 0) return;

    const lidX = lid.rotation.x;
    const rot = root.rotation.clone();
    const pos = root.position.clone();
    lid.rotation.x = LID_CLOSED;
    root.rotation.set(0, 0, 0);
    root.position.set(0, 0, 0);
    root.updateMatrixWorld(true);

    const cam = new PerspectiveCamera(
      rig.fov,
      size.width / size.height,
      0.1,
      100,
    );
    cam.position.set(...rig.position);
    cam.lookAt(...rig.lookAt);
    cam.updateMatrixWorld();

    /* Titik demi titik, bukan delapan sudut sebuah Box3. Dicoba dulu dengan
       Box3 dan hasilnya KEBESARAN: AABB dunia laptop tertutup itu balok, dan
       sudut-sudut balok yang lebih DEKAT ke kamera terproyeksi lebih melebar
       daripada siluet aslinya — kotaknya melewati tepi laptop sekitar 100px di
       1440px, persis di bawah dan di atasnya. Menyusuri simpulnya memberi
       siluet yang sebenarnya. Ongkosnya sekali, dan modelnya cuma 680 tris. */
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    root.traverse((o) => {
      if (!(o instanceof Mesh) || !o.visible) return;
      const attr = o.geometry?.attributes?.position;
      if (!attr) return;
      for (let i = 0; i < attr.count; i++) {
        SCRATCH_VERTEX.fromBufferAttribute(attr, i)
          .applyMatrix4(o.matrixWorld)
          .project(cam);
        /* NDC → pecahan kotak: x −1…1 (kiri→kanan), y 1…−1 (atas→bawah). */
        const fx = (SCRATCH_VERTEX.x + 1) / 2;
        const fy = (1 - SCRATCH_VERTEX.y) / 2;
        if (fx < x0) x0 = fx;
        if (fx > x1) x1 = fx;
        if (fy < y0) y0 = fy;
        if (fy > y1) y1 = fy;
      }
    });

    lid.rotation.x = lidX;
    root.rotation.copy(rot);
    root.position.copy(pos);
    root.updateMatrixWorld(true);

    if (!(x1 > x0 && y1 > y0)) return;

    /* Dijepit ke kotaknya: di layar sangat sempit sudut laptop bisa keluar
       sedikit, dan tombol yang menonjol keluar canvas akan menangkap klik di
       tempat yang tidak ada laptopnya. */
    x0 = MathUtils.clamp(x0, 0, 1);
    y0 = MathUtils.clamp(y0, 0, 1);
    x1 = MathUtils.clamp(x1, 0, 1);
    y1 = MathUtils.clamp(y1, 0, 1);
    onHitbox({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 });
  }, [onHitbox, root, lid, rig, size.width, size.height]);

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
 * kiri dan kanan (x sampai ±1,05). Rentangnya diturunkan dari
 * `h-full max-h-[520px] min-h-[280px]` (di dalam pelahap `flex-1` ekor
 * halaman) + padding kiri-kanan section; kalau kelas itu berubah, hitung ulang
 * rentangnya dulu. Batas 520px itu yang menahan ujung ATAS rentangnya — tanpa
 * itu kotaknya ikut setinggi viewport dan laptopnya membengkak.
 *
 * Padding section turun `px-6 sm:px-10` → `px-3` (18 Agu), jadi kotaknya
 * MELEBAR 24–56px dan rentang aspect naik: 0,83 (390×844 → 366×439) sampai
 * 1,43 (767×1024 → 743×520). Rig-nya SENGAJA tidak diutak-atik, dan itu aman
 * dengan alasan yang bisa diperiksa, bukan karena kelihatan baik-baik saja:
 * `fov` three.js vertikal, jadi aspect cuma muncul sebagai PEMBAGI di NDC-x
 * dan tidak menyentuh NDC-y sama sekali. Aspect naik ⇒ |x| mengecil ⇒ menjauh
 * dari tepi. Batas yang dulu mengikat (x ±0,88 di aspect terendah) sekarang
 * lebih longgar. Yang harus diperiksa ulang kalau paddingnya justru DINAIKKAN
 * lagi adalah ujung BAWAH rentang itu — itu sisi yang memotong.
 *
 * Di rentang itu X yang mengikat (±0,88) dan Y longgar, jadi lookAt.y dipilih
 * untuk MENENGAHKAN — 0,08 memberi y[−0,61 … 0,61], pusat tepat 0.
 */
type CameraRig = {
  position: [number, number, number];
  fov: number;
  lookAt: [number, number, number];
  /**
   * Pembingkaian TUJUAN dolly — `fit` memuat seluruh muka lid, `push` melewatinya.
   *
   * Dibawa di rig, bukan disimpulkan dari ada-tidaknya `screen`, dan itu bukan
   * gaya penulisan: `screen` GUGUR di awal penutupan (`overlay` jadi false
   * seketika), jadi menyimpulkannya dari situ akan menukar target di tengah
   * animasi selagi t masih ~1 — kameranya melompat. `narrow` tidak berubah
   * selama animasi berjalan.
   */
  fill: "fit" | "push";
};

function cameraFor(narrow: boolean): CameraRig {
  return narrow
    ? {
        position: [0.243, 0.304, 0.882],
        fov: 34,
        lookAt: [0, 0.08, -0.01],
        fill: "push",
      }
    : {
        position: [0.369, 0.298, 0.625],
        fov: 34,
        lookAt: [0, 0.07, -0.01],
        fill: "fit",
      };
}

export default function InquiryLaptop({
  progress,
  zoom,
  dockHeight = 0,
  dockOffsetX = 0,
  dockOffsetY = 0,
  floating = false,
  className,
  screen,
  onHitbox,
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
  /** Jarak pusat kotak itu dari pusat viewport (px, ke kanan positif). */
  dockOffsetX?: number;
  /** Jarak pusat kotak itu dari pusat viewport (px, ke bawah positif). */
  dockOffsetY?: number;
  /** Nyalakan gerak melayang. Pemanggil yang memutuskan (mis. matikan saat
   *  prefers-reduced-motion), lihat kontrak frameloop di atas. */
  floating?: boolean;
  className?: string;
  /** DOM yang ditempel di layar (form inquiry). Kosongkan saat laptop tertutup. */
  screen?: ReactNode;
  /** Kotak laptop di layar, sebagai pecahan kotak canvas — lihat HitRect.
   *  ⚠️ Harus REFERENSI STABIL (useCallback): ia jadi dependensi efek pengukur,
   *  jadi fungsi baru tiap render = mengukur ulang tiap render. */
  onHitbox?: (rect: HitRect) => void;
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
   *              kotak seukuran dok dan ikut ditengahkan flex → laptop melompat ke atas dan
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
   * `dock` ikut ditulis di sini, bukan dioper sebagai prop, supaya bingkai
   * off-axis di `Laptop` tidak pernah melihat ukuran baru berpasangan dengan
   * dock lama.
   */
  const storeRef = useRef<RootStore | null>(null);
  const dock = useRef<DockGeometry>({ h: 0, dx: 0, dy: 0 });

  useLayoutEffect(() => {
    dock.current = { h: dockHeight, dx: dockOffsetX, dy: dockOffsetY };

    /* Geseran posisi ditulis di sini JUGA, bukan cuma tiap frame. Saat menutup,
       `dockHeight` kembali 0 di commit yang sama dengan turunnya frameloop ke
       "demand" — menunggu `useFrame` berikutnya berarti geseran lama (sampai
       ~120 px) tertinggal terpaku di layar entah sampai kapan. Ditulis SEBELUM
       host diukur, supaya `setSize` di bawah mendapat rect yang sudah final. */
    applyDockShift(wrapRef.current, dock.current, zoom.get());

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
    <div
      ref={wrapRef}
      className={className}
      aria-hidden={screen ? undefined : "true"}
    >
      <Canvas
        frameloop={active ? "always" : "demand"}
        dpr={[1, 1.5]}
        camera={camera}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          alpha: true,
        }}
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
            host={wrapRef}
            floating={active}
            rig={rig}
            screen={screen}
            onHitbox={onHitbox}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
