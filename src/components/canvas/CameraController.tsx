"use client";

import { useEffect, useRef, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Vector3, type Camera, type PerspectiveCamera } from "three";
import {
  useSceneStore,
  VIEW_KEYS,
  START_ROOM,
  roomFromPath,
  type RoomKey,
  type Vec3,
} from "@/lib/store/sceneStore";

const bl = (x: number, y: number, z: number) => new Vector3(x, z, -y);

/**
 * Pandangan tiap ruangan.
 *
 * Angka-angka ini DIAMBIL LANGSUNG dari viewport Blender (29 Jul) — kamera
 * diarahkan manual sampai framing-nya pas, lalu posisi & arah pandangnya
 * dibaca dan dikonversi. Jangan diubah dengan cara menebak: sedikit saja
 * bergeser, kamera bisa menembus tembok atau kehilangan objek utamanya.
 *
 * Saat mengambil ulang, samakan dulu FOV kamera Blender ke 60° vertikal
 * (lens 20,78 mm pada sensor tinggi 24 mm) supaya bingkai di Blender sama
 * persis dengan yang muncul di browser — lihat DEFAULT_FOV di bawah.
 */
export const VIEWS: Record<RoomKey, { pos: Vector3; tgt: Vector3; disabled?: true }> = {
  Office:   { pos: bl( -3.97, -2.48, 1.13), tgt: bl( -7.80, -3.60, 0.79) },
  // Dimajukan 0,9 m dari titik yang diambil di Blender: posisi aslinya
  // menyisakan panel listrik (MG_Lounge_M_EP_*, di x≈2,3 z≈4,6–5,2) menempel
  // di tepi kanan layar.
  Lounge:   { pos: bl(  1.65, -4.98, 1.60), tgt: bl(  0.01, -2.37, 1.25) },
  Meeting:  { pos: bl(-14.91,  0.83, 1.37), tgt: bl(-18.46, -0.93, 0.81) },
  Function: { pos: bl(  1.46,  7.51, 1.37), tgt: bl( -1.08, 10.59, 1.05) },
  Pantry:   { pos: bl(-15.5,  -5.5,  1.7),  tgt: bl(-17.5,  -3.2,  1.2), disabled: true },
};

export const ACTIVE_KEYS = VIEW_KEYS.filter((k) => !VIEWS[k].disabled) as RoomKey[];

// ── Kamera minigame billiard: tegak lurus dari atas, ala 8 Ball Pool ────────
const TABLE_W = 1.3;   // lebar meja termasuk rail (sumbu X three)
const TABLE_L = 2.47;  // panjang meja termasuk rail (sumbu Z three)
const TABLE_TOP_Y = 0.807;
const TABLE_CX = 0.375;
const TABLE_CZ = -1.63;

/**
 * Ketinggian kamera dijepit dari DUA sisi.
 *
 * Atas: plafon 3,60 m. Bawah: 3 lampu gantung membentang sampai y = 2,11 —
 * kamera di bawah itu berada DI DALAM lampu. Pernah terjadi: kamera di 2,08
 * membuat bohlam emissive cuma 13 cm dari lensa, menutupi 60% layar, lalu
 * bloom membakarnya jadi putih penuh. Memudarkan lampu saja tidak menolong
 * kalau kameranya memang salah tempat.
 */
const CEILING_LIMIT = 3.45;
const LAMP_TOP_Y = 2.11;
const MIN_CAM_Y = LAMP_TOP_Y + 0.34;

/** FOV terlebar yang masih nyaman; di atas ini tepi meja mulai terlihat melar. */
const MAX_FOV = 72;

export interface BilliardView {
  pos: Vec3;
  tgt: Vec3;
  /**
   * FOV yang dipakai selama mode billiard. Karena kamera harus berada di ATAS
   * lampu, jaraknya jadi lebih jauh dari yang ideal — FOV dipersempit supaya
   * meja tetap memenuhi layar. Efek sampingnya justru bagus: perspektifnya
   * lebih rata, mendekati tampilan ortografis khas game biliar 2D.
   */
  fov: number;
  /** true = meja dibaringkan mendatar di layar (sisi panjang ke kiri-kanan). */
  rotated: boolean;
  /**
   * Vektor "atas" kamera — WAJIB diisi untuk pandangan tegak lurus ke bawah.
   * Arah pandang (0,−1,0) sejajar dengan up bawaan (0,1,0), dan lookAt() tidak
   * bisa menentukan orientasi dari dua vektor sejajar: hasilnya meja berputar
   * sendiri secara acak. Vektor ini yang mengunci sisi mana yang jadi atas layar.
   */
  up: Vec3;
}

/**
 * Hitung posisi kamera dari BENTUK LAYAR, bukan angka tetap.
 *
 * Meja 1,30 × 2,47 m (rasio 1,90). Di layar lebar, meja tegak cuma mengisi
 * 25% layar — makanya di situ meja dibaringkan mendatar (terisi 82%), dan di
 * layar tinggi (HP) dibiarkan tegak (78%).
 *
 * Diuji pada 9 bentuk layar dari ultrawide 21:9 sampai HP 9:21: meja selalu
 * muat penuh, kamera selalu ≥0,34 m di atas lampu, tidak ada yang menembus plafon.
 */
export function billiardView(aspect: number): BilliardView {
  const rotated = aspect > 1;
  const spanH = rotated ? TABLE_L : TABLE_W; // mengisi lebar layar
  const spanV = rotated ? TABLE_W : TABLE_L; // mengisi tinggi layar

  // Cari jarak minimum agar meja muat pada FOV maksimum yang masih nyaman.
  // FOV di atas ~75° membuat perspektifnya melebar dan meja terlihat melengkung
  // di tepi, jadi kalau butuh lebih lebar dari itu, kameranya yang dinaikkan.
  const maxTan = Math.tan((MAX_FOV / 2) * (Math.PI / 180));
  const minDist =
    Math.max(spanV / (2 * maxTan), spanH / (2 * maxTan * aspect)) * 1.06;

  // Ketinggian dijepit tiga hal: harus di atas lampu, di bawah plafon, dan
  // cukup jauh agar meja muat.
  const y = Math.min(
    Math.max(MIN_CAM_Y, TABLE_TOP_Y + minDist),
    CEILING_LIMIT,
  );
  const dist = y - TABLE_TOP_Y;

  // FOV terkecil yang masih memuat kedua sisi meja pada jarak itu, + margin 6%.
  const needV = 2 * Math.atan(spanV / (2 * dist));
  const needH = 2 * Math.atan(spanH / (2 * dist * aspect));
  const fov = Math.min(MAX_FOV, Math.max(needV, needH) * (180 / Math.PI) * 1.06);

  return {
    pos: [TABLE_CX, y, TABLE_CZ],
    tgt: [TABLE_CX, TABLE_TOP_Y, TABLE_CZ],
    fov,
    rotated,
    // Tegak: sisi jauh meja (−Z) mengarah ke atas layar, jadi rak bola ada di
    // atas dan bola putih di bawah — persis seperti gambar acuan.
    // Mendatar: meja dibaringkan, +X yang naik ke atas layar.
    up: rotated ? [1, 0, 0] : [0, 0, -1],
  };
}

const TWEEN_MS = 1400;

/** FOV normal scene — harus sama dengan yang dipasang di Scene.tsx. */
export const DEFAULT_FOV = 60;

/**
 * Ubah FOV kamera perspektif. Dipisah jadi fungsi karena tiga.js menyimpan FOV
 * sebagai properti biasa yang wajib diikuti `updateProjectionMatrix()` — kalau
 * lupa, nilainya berubah tapi gambarnya tidak.
 */
function setFov(cam: Camera, fov: number) {
  const p = cam as PerspectiveCamera;
  if (!p.isPerspectiveCamera) return;
  p.fov = fov;
  p.updateProjectionMatrix();
}

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export default function CameraController() {
  const { camera } = useThree();
  const setCurrentRoom = useSceneStore((s) => s.setCurrentRoom);
  const registerGoTo   = useSceneStore((s) => s.registerGoTo);
  const registerGoToView = useSceneStore((s) => s.registerGoToView);

  const currentRoomRef = useRef<RoomKey>(START_ROOM);
  const animating      = useRef(false);
  const tweenStart     = useRef(0);
  const fromPos        = useRef(new Vector3());
  const fromTgt        = useRef(new Vector3());
  const toPos          = useRef(new Vector3());
  const toTgt          = useRef(new Vector3());
  const lookTarget     = useRef(new Vector3());
  const fromUp         = useRef(new Vector3(0, 1, 0));
  const toUp           = useRef(new Vector3(0, 1, 0));
  const fromFov        = useRef(DEFAULT_FOV);
  const toFov          = useRef(DEFAULT_FOV);

  // snap to start on mount
  useEffect(() => {
    const v = VIEWS[START_ROOM];
    camera.position.copy(v.pos);
    lookTarget.current.copy(v.tgt);
    camera.lookAt(v.tgt);
  }, [camera]);

  const goTo = useCallback(
    (name: RoomKey) => {
      if (VIEWS[name]?.disabled) return;
      if (animating.current) return;
      if (name === currentRoomRef.current) return;

      fromPos.current.copy(camera.position);
      fromTgt.current.copy(lookTarget.current);
      fromUp.current.copy(camera.up);
      toPos.current.copy(VIEWS[name].pos);
      toTgt.current.copy(VIEWS[name].tgt);
      // Navigasi ruangan biasa selalu kembali ke up & FOV normal — kalau tidak,
      // keluar dari billiard meninggalkan kamera miring dan menyempit.
      toUp.current.set(0, 1, 0);
      if ("fov" in camera) {
        fromFov.current = camera.fov;
        toFov.current = DEFAULT_FOV;
      }
      tweenStart.current = performance.now();
      animating.current  = true;
      currentRoomRef.current = name;
      setCurrentRoom(name);
      // URL diperbarui oleh RoomRouteSync di DOM (punya router context).
    },
    [camera, setCurrentRoom],
  );

  // register goTo in store so RoomNav (outside Canvas) can call it
  useEffect(() => {
    registerGoTo(goTo);
    return () => registerGoTo(() => {});
  }, [goTo, registerGoTo]);

  /** Tween ke posisi bebas. Beda dari goTo: tidak menyentuh currentRoom / hash
   *  URL, jadi setelah keluar dari billiard pemain tetap "berada" di Lounge.
   *
   *  `up` hanya perlu diisi untuk pandangan tegak lurus ke bawah — lihat
   *  penjelasan di BilliardView.up. */
  const goToView = useCallback(
    (pos: Vec3, tgt: Vec3, up?: Vec3, fov?: number) => {
      fromPos.current.copy(camera.position);
      fromTgt.current.copy(lookTarget.current);
      fromUp.current.copy(camera.up);
      toPos.current.set(pos[0], pos[1], pos[2]);
      toTgt.current.set(tgt[0], tgt[1], tgt[2]);
      toUp.current.set(...(up ?? [0, 1, 0]));
      if ("fov" in camera) {
        fromFov.current = camera.fov;
        toFov.current = fov ?? DEFAULT_FOV;
      }
      tweenStart.current = performance.now();
      animating.current = true;
    },
    [camera],
  );

  useEffect(() => {
    registerGoToView(goToView);
    return () => registerGoToView(() => {});
  }, [goToView, registerGoToView]);

  /**
   * TIDAK ADA navigasi berbasis gerakan atau tombol di sini — dengan sengaja.
   *
   * Perpindahan ruangan hanya lewat klik waypoint 3D (Waypoints.tsx). Scroll
   * wheel, swipe layar, dan panah keyboard semuanya dihapus 30 Jul.
   *
   * ⚠️ Baris ini dulu menyebut "dan dropdown ruangan di Navbar" sebagai jalur
   * kedua. Itu TIDAK BENAR sejak `a1a857a` menghapus RoomNav: grep `goTo` di
   * seluruh src/ dan satu-satunya pemanggil adalah Waypoints.tsx. Jalur kedua
   * itu perlu DIBANGUN, dan §6 INVARIANTS.md sekarang bergantung padanya —
   * sejak waypoint dimatikan di perangkat sentuh (3 Agu), navbar adalah
   * satu-satunya jalan berpindah ruangan di HP.
   *
   * Alasannya: scroll & swipe punya arti ganda — di atas canvas ia memindah
   * ruangan, di luar canvas ia menggulir halaman, dan pemain tidak bisa
   * menebak yang mana yang akan terjadi. Panah keyboard tidak punya masalah
   * itu, tapi ikut dihapus supaya tidak ada jalur tersembunyi yang tidak
   * terlihat di layar: satu-satunya cara berpindah harus yang tergambar.
   *
   * Konsekuensi yang perlu diingat kalau menambah ruangan: setiap ruangan
   * WAJIB punya minimal satu waypoint keluar yang benar-benar terlihat dari
   * VIEWS-nya. Tidak ada lagi next/prev room sebagai jaring pengaman.
   */

  // Snap kamera ke room yang diminta pathname saat pertama mount (deep-link).
  // Back/forward browser ditangani React Router → RoomRouteSync memanggil goTo.
  useEffect(() => {
    const key = roomFromPath(window.location.pathname);
    if (key && !VIEWS[key].disabled && key !== START_ROOM) {
      currentRoomRef.current = key;
      setCurrentRoom(key);
      camera.position.copy(VIEWS[key].pos);
      lookTarget.current.copy(VIEWS[key].tgt);
      camera.lookAt(VIEWS[key].tgt);
    }
  }, [camera, setCurrentRoom]);

  useFrame(() => {
    if (!animating.current) return;
    const t = Math.min((performance.now() - tweenStart.current) / TWEEN_MS, 1);
    const e = ease(t);
    camera.position.lerpVectors(fromPos.current, toPos.current, e);
    lookTarget.current.lerpVectors(fromTgt.current, toTgt.current, e);
    // up ikut di-tween supaya perpindahan ke/dari pandangan atas tidak
    // "menjentik" di frame terakhir.
    camera.up.lerpVectors(fromUp.current, toUp.current, e).normalize();
    camera.lookAt(lookTarget.current);
    if (fromFov.current !== toFov.current) {
      setFov(camera, fromFov.current + (toFov.current - fromFov.current) * e);
    }
    if (t >= 1) animating.current = false;
  });

  return null;
}
