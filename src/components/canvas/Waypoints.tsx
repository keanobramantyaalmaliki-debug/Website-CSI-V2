"use client";

import { useEffect, useRef, useState } from "react";
import { shaderMaterial } from "@react-three/drei";
import { extend, useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  DoubleSide,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type ShaderMaterial,
} from "three";
import { useSceneStore, type RoomKey } from "@/lib/store/sceneStore";
import { ACTIVE_KEYS } from "./CameraController";

/**
 * Waypoint navigasi ala basement.studio.
 *
 * Bidang tak terlihat yang melayang di ruangan; saat kursor menyentuhnya
 * muncul overlay arsir + bracket di empat sudut + label nama ruangan, dan
 * sekali klik kamera meluncur ke sana.
 *
 * Kenapa bidang 3D, bukan tombol HTML: waypoint harus ikut perspektif —
 * mengecil saat jauh, tertutup tembok saat tidak terlihat, dan terasa menempel
 * di ruangan. Tombol DOM selalu menempel di layar dan langsung terbaca sebagai
 * antarmuka, bukan bagian dari dunia.
 */

/**
 * Satu waypoint = "dari ruangan A, ada jalan ke ruangan B di titik ini".
 *
 * Setiap waypoint MENEMPEL di bukaan pintu sungguhan — bidangnya sejajar
 * dinding, seukuran kusennya, di ketinggian tengah daun pintu. Bukan papan
 * melayang di tengah ruangan: menempel di pintu membuatnya ikut perspektif
 * dan langsung terbaca sebagai "lewat sini", persis seperti basement.studio.
 *
 * Semua koordinat di bawah DIUKUR dari objek pintu di Blender, bukan
 * dikira-kira. Nama objeknya dicatat di tiap entri supaya bisa diukur ulang
 * kalau modelnya berubah.
 *
 * Satu bukaan bisa muncul dua kali dengan `from` berbeda — misalnya pintu
 * GW_Door dipakai Lounge→Function dan Function→Lounge — karena arah masuknya
 * berbeda tergantung pemain sedang berdiri di mana.
 */
interface WaypointDef {
  /** Ruangan tempat pemain berada saat waypoint ini muncul. */
  from: RoomKey;
  /** Ruangan tujuan kalau diklik. */
  to: RoomKey;
  pos: [number, number, number];
  /** Rotasi Y (radian) — bidang harus SEJAJAR dinding tempat pintunya berada. */
  rotY: number;
  /** Ukuran bidang [lebar, tinggi] dalam meter, mengikuti bukaan pintunya. */
  size: [number, number];
  /**
   * true = bidang DIBARINGKAN di lantai, bukan berdiri di dinding.
   *
   * Dipakai untuk penanda arah yang menempel di petak lantai — ukurannya jadi
   * [lebar, kedalaman] dan `rotY` memutarnya pada bidang lantai. Label & bingkai
   * ikut rebah bersamanya, jadi terbaca seperti stiker di lantai.
   */
  floor?: true;
  /**
   * Teks label kalau nama ruangan tujuan saja kurang jelas.
   *
   * Dipakai saat waypoint-nya BUKAN pintu menuju ruangan baru melainkan jalan
   * balik — "Office" doang terbaca seperti tujuan baru, padahal maksudnya
   * kembali ke tempat asal.
   */
  label?: string;
}

const WAYPOINTS: WaypointDef[] = [
  // ── Dari Office ─────────────────────────────────────────────────────────
  // Meeting: SELURUH fasad kacanya, bukan cuma daun pintunya.
  //
  // Meeting room dibatasi dinding kaca penuh di x = −14,55 — dari kantor yang
  // terlihat adalah bidang kaca lebar itu, dengan bukaan pintu di ujung utara.
  // Daun pintunya sendiri sedang TERBUKA mengayun ke dalam (GWM_Door_Glass ada
  // di x −15,48..−14,58, tegak lurus fasad), jadi mustahil dijadikan sasaran:
  // dari kantor ia cuma terlihat setipis garis. Maka waypoint-nya dibentangkan
  // seukuran kaca + bukaannya, persis seperti basement.studio menandai bukaan
  // ruangan sebagai satu bidang utuh.
  //
  // Batasnya diukur di Blender (29 Jul), bukan dikira: kaca GWM_Glass_A
  // membentang three-z −2,45..0,72 dan bukaan pintunya berlanjut sampai tepi
  // GWM_Header di three-z 1,67 — total 4,12 m, setinggi kaca 2,45 m.
  // Diverifikasi lewat render dari kamera Office: bidangnya menutup persis
  // fasad kacanya, tidak tertutup perabot apa pun.
  {
    from: "Office",
    to: "Meeting",
    pos: [-14.55, 1.225, 0.39],
    rotY: Math.PI / 2,
    size: [4.12, 2.45],
  },
  // Jalan balik ke Lounge — DIBARINGKAN DI LANTAI, bukan di dinding.
  //
  // Pernah ada versi di dinding di sini: bidang menempel di panel kaca
  // GWL_N1_Glass (x = −2,03, three-z −0,33). Dihapus 30 Jul karena TIDAK
  // PERNAH terlihat — kamera Office memandang ke arah −X, sedangkan bukaan itu
  // di sisi +X, tepat di punggung kamera (dot −2,65 terhadap arah pandang;
  // −2,99 pada VIEWS.Office yang lama, jadi ia mati sejak ditulis, bukan
  // tertinggal setelah kameranya digeser).
  //
  // Penanda di lantai adalah penggantinya, dan justru lebih terbaca: petak
  // lantai tepat di depan pemain memang jalan menuju ke sana, dan penanda
  // rebah terasa seperti stiker arah di lantai, bukan papan melayang.
  //
  // ⚠️ Waypoint ini kini SATU-SATUNYA jalan keluar dari Office. Jangan dihapus
  // tanpa menyiapkan gantinya.
  //
  // Batasnya mengikuti GARIS LED LANTAI yang sudah ada, jadi bidangnya jatuh
  // persis di dalam satu petak — bukan kotak asing yang memotong pola lantai.
  // Diukur di Blender (29 Jul) dari OP_LEDStrip_Floor:
  //   barat  three-x −8,66 = strip membujur-Z (seg5)
  //   timur  three-x −5,54 = strip membujur-Z (seg3)
  //   selatan three-z 1,83 = strip membujur-X (seg10, blender y −1,85)
  //   utara  three-z −0,60 = berhenti sebelum OP_Shelf_Cubby_A, yang raycast
  //                          tunjukkan menutupi petak di sisi utara
  //   y 0,012              = 2 mm di atas LED strip (z 0,002..0,010) supaya
  //                          tidak z-fighting dengan garisnya
  {
    from: "Office",
    to: "Lounge",
    pos: [-7.1, 0.012, 0.615],
    rotY: 0,
    size: [3.12, 2.43],
    floor: true,
    label: "Go back to Lounge",
  },

  // ── Dari Lounge ─────────────────────────────────────────────────────────
  // Menempel PERSIS di bukaan pintunya, bukan melayang di tengah ruangan,
  // supaya ikut perspektif dan terbaca sebagai "pintu ini bisa dimasuki".
  //
  // Office: CELAH di dinding kaca lounge (x = −2,00), antara GWL_S_Glass yang
  // berakhir di z=3,15 dan GWL_N1_Glass yang mulai di z=0,65 — bukaan selebar
  // 2,5 m. Ini ambang masuk kantor, bukan daun pintunya.
  //
  // Diverifikasi dengan memproyeksikan area yang ditandai di screenshot ke
  // bidang x=−2,00: keempat sudutnya jatuh di z 0,66..3,09 — persis celah itu.
  // Bidang sejajar dinding, jadi rotY = 90°.
  {
    from: "Lounge",
    to: "Office",
    pos: [-2.0, 1.22, 1.9],
    rotY: Math.PI / 2,
    size: [2.5, 2.45],
  },
  // Function: bukaan pintu GW_Door di dinding z = −6,90, antara GW_Frame_R
  // (x 1,50) dan GW_DoorFrame_R (x 2,39). Dinding menghadap +Z, rotY = 0.
  {
    from: "Lounge",
    to: "Function",
    pos: [1.95, 1.22, -6.87],
    rotY: 0,
    size: [0.89, 2.45],
  },

  // ── Dari Meeting ────────────────────────────────────────────────────────
  // Jalan balik ke kantor — DI DINDING UTARA, bukan di pintunya.
  //
  // Pintu meeting room ada di timur, sedangkan VIEWS.Meeting menghadap ke
  // BARAT (ke TV & whiteboard). Waypoint di pintu jadi mustahil terlihat:
  // diverifikasi lewat proyeksi kamera, titiknya jatuh di BELAKANG kamera
  // (dot −0,24 terhadap arah pandang).
  //
  // Maka penanda "kembali ke kantor" ditempel di bidang dinding krem
  // (OP_Wall_Perimeter_NW, three-z −1,60) di sisi timur pilar OP_Pillar_N2 —
  // bagian yang justru terlihat di tepi kanan layar. Ini penanda arah, bukan
  // bukaan sungguhan, jadi labelnya ditulis eksplisit "Go back to office".
  //
  // Batas diukur di Blender (29 Jul):
  //   kiri  three-x −17,675 = muka timur pilar OP_Pillar_N2
  //   kanan three-x −16,30  = jauh melewati tepi layar di semua rasio umum,
  //                           supaya tepi kanannya tidak pernah terlihat
  //   atas  three-y  2,94   = setinggi plafon meeting room
  //   z     −1,585          = 1,5 cm di depan muka AirVent (2,155..2,505),
  //                           jadi bidangnya lewat DI DEPAN kisi AC, bukan
  //                           menembusnya — sekaligus cegah z-fighting
  //
  // Sengaja dibuat lebih besar dari bagian dinding yang terlihat: tepi kanan
  // & atasnya memang dibiarkan keluar bingkai supaya yang tampak di layar
  // hanya bidang penuh, bukan kotak yang terpotong di tengah dinding.
  {
    from: "Meeting",
    to: "Office",
    pos: [-16.9875, 1.47, -1.585],
    rotY: 0,
    size: [1.375, 2.94],
    label: "Go back to office",
  },

  // ── Dari Function ───────────────────────────────────────────────────────
  // Jalan balik ke lounge — DI DINDING UTARA, bukan di pintunya.
  //
  // Kasusnya persis sama dengan Meeting→Office: pintu GW_Door ada di SELATAN
  // (three-z −6,95) sedangkan VIEWS.Function menghadap ke UTARA (ke TV di
  // dinding z −11,5). Waypoint lama yang menempel di pintu itu MUSTAHIL
  // terlihat — diverifikasi lewat proyeksi kamera, titiknya jatuh jauh di
  // BELAKANG kamera (dot −0,96 terhadap arah pandang), jadi selama ini tidak
  // pernah tergambar sama sekali. Ia dihapus, bukan dipertahankan: dua
  // waypoint Function→Lounge sama-sama di dinding akan berbagi React key
  // yang sama dan hover-nya menyala bersamaan.
  //
  // Penggantinya ditempel di bidang dinding gelap di sisi KANAN TV — bagian
  // yang memang terlihat di tepi kanan layar. Letaknya DITANDAI LANGSUNG oleh
  // user dengan garis annotate di Blender (30 Jul), lalu batasnya di-snap ke
  // geometri terdekat supaya tidak menggantung di tengah dinding:
  //   kiri  three-x 1,105  = muka kanan MG_Function_M_SM_Cabinet_White
  //                          (coretan mulai 1,141 — dirapatkan ke kabinetnya)
  //   kanan three-x 2,450  = sudut ruangan, muka dalam SM_Wall_E
  //                          (coretan berhenti 2,434 — dirapatkan ke sudut)
  //   atas  three-y 3,600  = setinggi plafon; dinaikkan dari batas coretan
  //                          (2,62) atas permintaan — zona 2,62..3,60 sudah
  //                          dicek raycast, kosong sampai plafon
  //   z     −11,53         = 2 cm di depan SM_Wall_N (−11,55), cegah z-fighting
  //
  // Raycast 5×5 dari kamera: 25 dari 25 titik BEBAS, tidak ada perabot yang
  // menutupinya. Seperti Meeting→Office, tepi kanannya sengaja dibiarkan
  // keluar bingkai supaya tidak terbaca sebagai kotak yang terpotong.
  //
  // Catatan rasio: terlihat 100% di 21:9, 59% di 16:9, 43% di 16:10, 16% di
  // 4:3, dan TIDAK terlihat sama sekali di layar 1:1 ke bawah (potret) —
  // dinding ini memang di luar bingkai pada rasio sempit.
  //
  // ⚠️ Sejak scroll & swipe dihapus (30 Jul), di layar potret ini berpotensi
  // JALAN BUNTU untuk pengguna sentuh: waypoint-nya di luar bingkai, dan
  // panah keyboard tidak ada di HP. Yang masih menyelamatkan cuma dropdown
  // ruangan di Navbar. Kalau Function Room mau benar-benar aman di HP,
  // waypoint ini perlu dipindah ke bidang yang terlihat di rasio potret —
  // misalnya dibaringkan di lantai seperti Office→Lounge.
  {
    from: "Function",
    to: "Lounge",
    pos: [1.7775, 1.8, -11.53],
    rotY: 0,
    size: [1.345, 3.6],
    label: "Go back to Lounge",
  },
];

/**
 * Material arsir diagonal — pola garis miring yang mengisi area waypoint saat
 * di-hover, meniru penanda di basement.studio.
 *
 * Dibuat sebagai shader, bukan tekstur, supaya polanya tetap rapat & tajam
 * berapa pun jarak kamera (tekstur akan melar saat didekati) dan tidak perlu
 * aset tambahan yang harus ikut di-load.
 */
const HatchMaterial = shaderMaterial(
  { uOpacity: 0, uTime: 0 },
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform float uOpacity;
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      if (uOpacity <= 0.001) discard;
      // Garis miring 45°: jarak antar garis tetap dalam ruang UV, jadi
      // kerapatannya konsisten walau bidangnya tidak persegi.
      // uTime menggeser fasa garis: arsirnya merayap pelan menyilang bidang,
      // memberi tanda "hidup" tanpa perlu menaikkan kontras.
      float d = (vUv.x + vUv.y) * 40.0 - uTime * 0.6;
      // Ambang tinggi = pita sempit: garis rapat tapi masing-masing tipis.
      float stripe = step(0.94, fract(d));
      // Isian tipis di seluruh area supaya batasnya tetap terbaca meski
      // sedang berada di antara dua garis.
      float a = (stripe * 0.06 + 0.015) * uOpacity;
      gl_FragColor = vec4(1.0, 1.0, 1.0, a);
    }
  `,
);

extend({ HatchMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    hatchMaterial: ThreeElements["shaderMaterial"] & {
      uOpacity?: number;
      uTime?: number;
    };
  }
}

const LABELS: Record<RoomKey, string> = {
  Office: "Office",
  Lounge: "Lounge",
  Meeting: "Meeting Room",
  Function: "Function Room",
  Pantry: "Pantry",
};

export default function Waypoints() {
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const goTo = useSceneStore((s) => s.goTo);
  const heroInView = useSceneStore((s) => s.heroInView);
  const billiardActive = useSceneStore((s) => s.billiardActive);

  // Disembunyikan saat main billiard atau saat hero sudah tergulir keluar —
  // sama seperti perilaku RoomNav sebelumnya.
  if (!heroInView || billiardActive) return null;

  return (
    <>
      {WAYPOINTS.filter(
        (w) => w.from === currentRoom && ACTIVE_KEYS.includes(w.to),
      ).map((w) => (
        // Kunci menyertakan `floor` karena satu pasang ruangan BOLEH punya dua
        // waypoint — satu di bukaan pintunya, satu lagi di lantai. Sejak
        // Office→Lounge versi dinding dihapus (30 Jul) tidak ada lagi pasangan
        // kembar, tapi kuncinya dipertahankan: tanpa pembeda ini, dua waypoint
        // dengan from/to sama akan dianggap React sebagai elemen yang sama dan
        // hover-nya menyala bersamaan.
        <Waypoint
          key={`${w.from}-${w.to}-${w.floor ? "floor" : "wall"}`}
          def={w}
          onSelect={() => goTo?.(w.to)}
        />
      ))}
    </>
  );
}

function Waypoint({
  def,
  onSelect,
}: {
  def: WaypointDef;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const mesh = useRef<Mesh>(null);
  const setHoveredWaypoint = useSceneStore((s) => s.setHoveredWaypoint);

  /** Teks label waypoint ini — dipakai sebagai identitasnya di store. */
  const text = def.label ?? LABELS[def.to];

  /**
   * Kekuatan hover 0..1 yang dianimasikan sendiri, BUKAN state React.
   *
   * Kenapa ref + useFrame dan bukan useState: nilainya berubah tiap frame:
   * lewat state, tiap frame memicu render ulang React di seluruh subtree —
   * mahal dan tidak perlu, karena yang berubah cuma angka di material dan
   * skala group. Ref membiarkan React diam sementara Three.js yang bekerja.
   */
  const k = useRef(0);
  const group = useRef<Group>(null);
  const hatch = useRef<ShaderMaterial>(null);

  useFrame((_, dt) => {
    // Peluruhan eksponensial: mendekati target ~15%/frame pada 60 fps, dan
    // dinormalkan ke dt supaya kecepatannya sama di layar 120 Hz maupun 30 Hz.
    const target = hovered ? 1 : 0;
    k.current += (target - k.current) * (1 - Math.exp(-dt * 12));
    // Snap saat sudah sangat dekat, supaya tidak menggantung di 0,999
    // selamanya dan arsirnya benar-benar hilang saat tidak di-hover.
    if (Math.abs(target - k.current) < 0.001) k.current = target;

    const e = k.current;
    if (hatch.current) {
      hatch.current.uniforms.uOpacity.value = e;
      hatch.current.uniforms.uTime.value += dt;
    }
    // Mengembang tipis saat disentuh — 1,5% saja: cukup terasa sebagai
    // respons, tidak sampai terlihat bergeser dari dinding tempatnya menempel.
    if (group.current) {
      const s = 1 + e * 0.015;
      group.current.scale.set(s, s, 1);
    }
  });

  const enter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    setHoveredWaypoint(text);
    document.body.style.cursor = "pointer";
  };
  const leave = () => {
    setHovered(false);
    // ⚠️ Kosongkan HANYA kalau label yang tampil memang milik waypoint ini.
    // Saat kursor berpindah langsung dari waypoint A ke B yang bersinggungan,
    // R3F mengirim enter(B) SEBELUM leave(A); tanpa penjaga ini leave(A) akan
    // menghapus label B yang baru saja menyala dan labelnya berkedip hilang.
    if (useSceneStore.getState().hoveredWaypoint === text) {
      setHoveredWaypoint(null);
    }
    document.body.style.cursor = "";
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    leave();
    onSelect();
  };

  // Jaring pengaman saat unmount: waypoint dilepas begitu ruangan berganti
  // (daftar di-filter oleh `currentRoom`) atau saat minigame billiard dibuka.
  // Kalau itu terjadi selagi kursor masih di atasnya, `leave` TIDAK PERNAH
  // dipanggil — labelnya akan menggantung di layar selamanya.
  useEffect(() => {
    return () => {
      if (useSceneStore.getState().hoveredWaypoint === text) {
        useSceneStore.getState().setHoveredWaypoint(null);
      }
      document.body.style.cursor = "";
    };
  }, [text]);

  // Bidang lantai perlu direbahkan −90° pada sumbu X: planeGeometry lahir
  // tegak menghadap +Z, sedangkan penanda lantai harus menghadap ke atas.
  // Rotasi ruangannya (rotY) tetap diterapkan setelahnya.
  const rot: [number, number, number] = def.floor
    ? [-Math.PI / 2, 0, def.rotY]
    : [0, def.rotY, 0];

  return (
    <group ref={group} position={def.pos} rotation={rot}>
      {/* Bidang penangkap kursor. Materialnya shader arsir diagonal — pola
          garis miring seperti referensi basement, bukan blok warna rata.
          Digambar hanya saat hover (uOpacity 0 saat tidak), tapi mesh-nya
          selalu ada supaya tetap bisa di-raycast.

          depthTest=false + renderOrder tinggi: waypoint SENGAJA digambar di
          atas segalanya, termasuk front desk dan perabot yang berdiri di
          depannya. Posisinya tetap di ambang pintu sungguhan sehingga
          perspektif & ukurannya benar, tapi tidak ikut tertutup — supaya
          jelas terbaca sebagai penanda navigasi, bukan objek dalam ruangan. */}
      <mesh
        ref={mesh}
        renderOrder={10}
        onPointerOver={enter}
        onPointerOut={leave}
        onClick={click}
      >
        <planeGeometry args={def.size} />
        {/* uOpacity & uTime disetir useFrame lewat ref, bukan lewat prop:
            nilainya berubah tiap frame dan tidak boleh melalui React. */}
        <hatchMaterial
          ref={hatch}
          transparent
          side={DoubleSide}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>

      {/* Bingkai + penanda silang di sudut + label.
          Tetap dipasang meski tidak di-hover — kalau di-unmount, transisi
          keluarnya mustahil (elemennya sudah hilang sebelum sempat memudar).
          Yang meredupkannya adalah `k` di useFrame. */}
      <Frame w={def.size[0]} h={def.size[1]} k={k} />

      {/* Labelnya TIDAK di sini lagi.
          Dulu di titik ini ada <Html> drei yang menempelkan nama ruangan di
          tengah bidang. Sejak 31 Jul label mengekor kursor, jadi ia elemen
          screen-space dan pindah ke overlay DOM di luar Canvas:
          src/components/ui/WaypointLabel.tsx. Yang tersisa di sini hanya
          pelaporan hover ke store lewat `enter`/`leave` di atas. */}
    </group>
  );
}

/**
 * Bingkai tipis + penanda SILANG (+) di empat sudut.
 *
 * Mengikuti referensi basement: garis tepi mengelilingi seluruh area, dan
 * di tiap sudut ada tanda plus kecil — bukan siku. Digambar dari garis tipis
 * alih-alih tekstur supaya tetap tajam di segala jarak.
 */
function Frame({
  w,
  h,
  k,
}: {
  w: number;
  h: number;
  /** Kekuatan hover 0..1 dari induknya, dibaca tiap frame. */
  k: React.RefObject<number>;
}) {
  const hw = w / 2;
  const hh = h / 2;
  /** Panjang lengan tanda silang. */
  const a = Math.min(w, h) * 0.035;
  const t = 0.0025; // tebal garis — setipis mungkin sebelum mulai putus-putus

  const root = useRef<Group>(null);

  useFrame(() => {
    const g = root.current;
    if (!g) return;
    const e = k.current ?? 0;
    // Berhenti menggambar sama sekali saat padam — 12 garis per waypoint,
    // satu draw call masing-masing.
    g.visible = e > 0.002;
    if (!g.visible) return;
    for (const child of g.children) {
      // Sudut dibungkus <group>; garis lepas berada langsung di root.
      for (const m of child.type === "Group" ? child.children : [child]) {
        const mat = (m as Mesh).material as MeshBasicMaterial | undefined;
        // `base` = opacity penuh garis ini, ditanam lewat prop userData saat
        // dibuat. Tanpa itu meredupkan bingkai akan menyamakan garis tepi yang
        // samar dengan silang sudut yang lebih terang.
        if (mat?.userData?.base !== undefined) {
          mat.opacity = (mat.userData.base as number) * e;
        }
      }
    }
  });

  const corners: [number, number][] = [
    [-hw, hh],
    [hw, hh],
    [-hw, -hh],
    [hw, -hh],
  ];

  const line = (
    key: string,
    x: number,
    y: number,
    lw: number,
    lh: number,
    op: number,
  ) => (
    // renderOrder 11 — satu tingkat di atas bidang arsir, supaya bingkai &
    // silang selalu tergambar di depannya, bukan berebut urutan.
    <mesh key={key} position={[x, y, 0]} renderOrder={11}>
      <planeGeometry args={[lw, lh]} />
      <meshBasicMaterial
        userData={{ base: op }}
        color="#ffffff"
        toneMapped={false}
        transparent
        opacity={0}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );

  return (
    <group ref={root} position={[0, 0, 0.01]}>
      {/* Bingkai penuh, samar — menandai batas area tanpa mendominasi. */}
      {line("top", 0, hh, w, t, 0.22)}
      {line("bottom", 0, -hh, w, t, 0.22)}
      {line("left", -hw, 0, t, h, 0.22)}
      {line("right", hw, 0, t, h, 0.22)}

      {/* Silang di tiap sudut, lebih terang dari bingkainya. */}
      {corners.map(([x, y], i) => (
        <group key={i}>
          {line(`h${i}`, x, y, a * 2, t, 0.55)}
          {line(`v${i}`, x, y, t, a * 2, 0.55)}
        </group>
      ))}
    </group>
  );
}
