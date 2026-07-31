"use client";

import { useEffect, useRef } from "react";
import { Group } from "three";
import { ContactShadows } from "@react-three/drei";
import { useSceneStore, type RoomKey } from "@/lib/store/sceneStore";

/**
 * Bayangan kontak — "gelap di bawah meja".
 *
 * Scene ini TIDAK punya bayangan sama sekali: semua mesh `castShadow=false`
 * (Office.tsx) dan lightmap baked dimatikan (`LIGHTMAP_INTENSITY = 0`). Lantai
 * jadi terang rata, dan perabot terlihat melayang alih-alih menapak.
 *
 * ⚠️ INI BUKAN PENGGANTI LIGHTMAP, dan menaikkan `LIGHTMAP_INTENSITY` TIDAK
 * akan menolong. Lightmap lantai office (image 21) di-pack sebagai ORM: satu
 * texture dipakai serentak sebagai `occlusionTexture` DAN
 * `metallicRoughnessTexture`. three.js membaca lightMap sebagai `.rgb` penuh,
 * jadi menaikkan intensity membanjiri lantai dengan biru dari channel metallic
 * (terukur mean RGB 51/36/254). Dua lightmap lain juga mati:
 * M_SM_Wall_Cream_MeetingWest hitam pekat, M_MR_Parquet_MeetingWest kosong.
 *
 * ── Kenapa ContactShadows, bukan lampu + shadow map ────────────────────────
 * Komponen drei ini SAMA SEKALI tidak memakai lampu: ia memasang
 * `scene.overrideMaterial = MeshDepthMaterial`, merender scene dari kamera
 * ortografis yang memandang LURUS KE ATAS dari lantai, lalu mem-blur hasilnya
 * jadi tekstur bayangan. Jadi tidak perlu `gl.shadowMap` — dan JANGAN
 * menyalakannya, karena itu memaksa 291 mesh statis dievaluasi ulang.
 *
 * Karena kameranya memandang ke atas, benda RENDAH jadi gelap dan makin tinggi
 * makin pudar sampai terpotong `far`. Itu persis perilaku occlusion yang
 * dicari: kolong meja gelap, plafon tidak ikut menjatuhkan bayangan palsu.
 *
 * ⚠️ Depth clipping bekerja PER-FRAGMEN, bukan per-objek. Ini yang membuat
 * pendekatan ini mungkin di GLB yang sudah di-merge: `MG_Office_ODesk_BlackSteel`
 * membentang y 0,01..3,60 — meja dan geometri setinggi plafon di SATU mesh.
 * Mustahil dipisah lewat layer atau visibilitas, tapi near/far memotongnya
 * dengan benar. Sudah diuji empiris sebelum ditulis: papan meja di y 0,70–0,75
 * tertangkap, slab lantai ter-clip `near`, plafon ter-clip `far`.
 */

interface CatcherDef {
  /** [x, y0, z] — y0 = TEPAT DI ATAS permukaan lantai ruangan itu. */
  position: [number, number, number];
  /** [lebar, kedalaman] meter. Dibatasi per RUANGAN, bukan seukuran slab. */
  scale: [number, number];
  near: number;
  far: number;
  resolution: number;
  blur: number;
  opacity: number;
}

/**
 * Penempatan bidang penangkap bayangan per ruangan.
 *
 * Semua angka DIUKUR dari office.glb (parse rantai transform node + POSITION
 * accessor min/max), bukan dikira-kira.
 *
 * Rumus alpha bayangan, dari shader-nya sendiri (`(1.0 - fragCoordZ)`):
 *   alpha = 1 − (h − y0 − near) / (far − near)
 * untuk occluder di ketinggian dunia `h`. Pakai ini untuk memperkirakan
 * seberapa pekat sesuatu akan tergambar sebelum mencoba.
 *
 * ⚠️ `y0` BEDA-BEDA per ruangan karena tinggi lantainya beda: Office 0,00 ·
 * Meeting parquet 0,00 · Lounge rug 0,012 · Function rug 0,018. Kalau bayangan
 * hilang di SATU ruangan saja, ini tersangka pertama.
 *
 * ⚠️ `scale` dan `width`/`height` SALING DIKALI di drei (`width = width *
 * scale`, default 1). Kirim `scale` saja, jangan dua-duanya.
 *
 * ⚠️ `blur` dipatok ke resolusi 256: `uniforms.h.value = blur * 1 / 256`.
 * Jadi nilai blur TIDAK sebanding antar resolusi — di 1024 satu satuan blur
 * menutup seperempat area dibanding di 256. Itu sebabnya Office (1024) pakai
 * 2,2 sementara ruangan lain (512) pakai 2,0. Kalau mengubah resolution,
 * setel ulang blur-nya; jangan dibawa apa adanya.
 */
const SHADOW_CATCHERS: Partial<Record<RoomKey, CatcherDef>> = {
  // Meja + kursi office membentang x −12,03..−2,26 / z 3,55..7,64 → pusat
  // (−7,15, 5,60), lalu diberi bantalan jadi 10,4 × 4,8 supaya blur meluruh DI
  // DALAM bidang, bukan terpotong di tepinya.
  //
  // Sengaja BUKAN seukuran slab lantai (x −14,68..2,45, z −11,55..8,35): slab
  // itu satu mesh yang menyeberangi beberapa ruangan.
  //
  // Perkiraan alpha di setelan ini: kaki kursi (0,20) → 0,93 · panel bawah meja
  // (0,30) → 0,84 · daun meja (0,75) → 0,45 · sandaran kursi (1,05) → 0,19 ·
  // iMac (1,24) → 0,03 · whiteboard (1,70) → terpotong.
  //
  // Resolusi 1024 hanya di sini: 10,4 m / 1024 ≈ 1 cm per piksel.
  Office: {
    position: [-7.15, 0.02, 5.6],
    scale: [10.4, 4.8],
    near: 0.1,
    far: 1.25,
    resolution: 1024,
    blur: 2.2,
    opacity: 0.75,
  },

  // Lantai parquet MG_MeetingWest_M_MR_Parquet puncaknya y 0,00 → y0 0,02.
  //
  // ── UKURAN: 8,45 × 5,40, JANGAN dikecilkan ───────────────────────────────
  // Versi pertama dibuat 7,4 × 4,6 (pas occluder + bantalan 0,25 m) dan itu
  // SALAH dengan cara yang terlihat jelas: tepi timurnya (x −14,35) memotong
  // occluder yang membentang sampai −14,45, jadi bayangan deretan kursi kanan
  // TERPOTONG di garis vertikal, meninggalkan pita terang bertangga di lantai.
  // Sempat dikira z-fighting `near`; ternyata murni bidangnya kurang lebar.
  //
  // Occluder sesungguhnya: x −21,70..−14,45 / z −1,77..2,60. Bantalannya
  // sengaja ~0,5 m di tiap sisi, JAUH lebih longgar dari ruangan lain, karena
  // blur 2,6 menyebarkan bayangan beberapa sentimeter keluar dari siluetnya —
  // kalau bidangnya mepet, hasil blur itu terpotong dan tepinya jadi garis.
  //
  // ── far 0,80, bukan 1,20 ─────────────────────────────────────────────────
  // Papan meja meeting ada di y 0,69–0,75 (MG_MeetingWest_MR_TableTray) — jauh
  // lebih rendah dari meja office. Pada far 1,20 alpha-nya cuma
  // 1−(0,745/1,15) = 0,35, lalu dikali opacity: praktis tak terlihat di atas
  // parquet yang sudah digelapkan AO. far 0,80 menaikkannya ke 0,60.
  //
  // Batas 0,80 dipilih karena tepat DI ATAS papan meja (0,75) tapi masih di
  // bawah sandaran kursi (1,16) — jadi meja & kursi menghasilkan bayangan
  // penuh sementara sandaran tidak ikut melebarkan bayangannya.
  //
  // resolution 1024 (naik dari 512): 8,45 m / 1024 ≈ 8 mm/px. blur ikut
  // disetel ulang ke 2,6 — ingat blur dipatok /256, jadi menaikkan resolusi
  // TIDAK otomatis menghaluskan.
  //
  // ── opacity 1,0 (bukan 0,65) ─────────────────────────────────────────────
  // N8AO sudah menggelapkan seluruh lantai, jadi bayangan yang lebih lembut
  // tenggelam tanpa sisa. Terukur di piksel yang sama di bawah meja: 37 tanpa
  // bayangan → 33 dengan bayangan; di lantai terbuka 44,9 vs bawah meja 17,7
  // (61% lebih gelap).
  Meeting: {
    position: [-18.025, 0.02, 0.4],
    scale: [8.45, 5.4],
    near: 0.06,
    far: 0.8,
    resolution: 1024,
    blur: 2.6,
    opacity: 1.0,
  },

  // Rug MG_Lounge_M_Rug_Lounge.001 puncaknya y 0,012 → y0 0,02.
  // far 1,10 memotong kap lampu billiard (1,73+) dan cermin (1,78) supaya
  // keduanya tidak menjatuhkan bayangan yang tidak masuk akal di lantai.
  //
  // opacity 0,55 (bukan 0,75 seperti Office): di atas rug sudah ada AO baked,
  // dan bayangan kontak menumpuk di atasnya — kalau sama pekat, jadi dobel gelap.
  Lounge: {
    position: [0.2, 0.02, -2.3],
    scale: [4.8, 5.6],
    near: 0.05,
    far: 1.1,
    resolution: 512,
    blur: 2.0,
    opacity: 0.55,
  },

  // Rug MG_Function_M_SM_Rug_Grey puncaknya y 0,018 → y0 0,03 (tertinggi dari
  // keempat ruangan). far 1,15 memotong cakram SM (1,55–2,41) dan TV dinding
  // (1,02–1,88). opacity 0,55 dengan alasan sama seperti Lounge.
  Function: {
    position: [0.2, 0.03, -9.3],
    scale: [4.8, 4.8],
    near: 0.05,
    far: 1.15,
    resolution: 512,
    blur: 2.0,
    opacity: 0.55,
  },

  // Pantry sengaja tidak ada: VIEWS.Pantry masih `disabled` di CameraController.
};

export default function ContactShadowsRig() {
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const billiardActive = useSceneStore((s) => s.billiardActive);
  const catcher = useRef<Group>(null);

  const cfg = SHADOW_CATCHERS[currentRoom];

  // ── WAJIB saat N8AO aktif: tandai MESH-nya opaque ────────────────────────
  //
  // N8AO memindahkan objek yang `transparent && !depthWrite &&
  // !userData.treatAsOpaque` ke pass transparansinya sendiri, dan di pass itu
  // AO TIDAK diterapkan pada piksel di baliknya. Bidang penangkap bayangan ini
  // persis memenuhi ketiga syarat itu, jadi lantai di bawahnya kehilangan
  // penggelapan AO — dan bayangannya BERBALIK MENERANGI lantai.
  //
  // Terukur di piksel yang sama, bawah meja (30 Jul):
  //   AO nyala, tanpa flag : 37 → 54 saat bayangan dihidupkan  (SALAH arah)
  //   AO nyala, dengan flag: 37 → 33                            (benar)
  //   AO mati              : 113 → 103                          (benar)
  // Baris terakhir itu yang membuat bug ini sulit dilacak: tanpa AO semuanya
  // tampak beres, jadi gejalanya cuma muncul di kombinasi keduanya.
  //
  // ⚠️ Flag HARUS di userData MESH. Memasangnya lewat prop `userData` pada
  // <ContactShadows> menempel ke GRUP luarnya dan TIDAK terbaca N8AO — sudah
  // dicoba, angkanya tidak bergerak sama sekali.
  useEffect(() => {
    const g = catcher.current;
    if (!g) return;
    g.traverse((o) => {
      const m = o as unknown as {
        isMesh?: boolean;
        material?: { transparent?: boolean };
        userData: Record<string, unknown>;
      };
      if (m.isMesh && m.material?.transparent) m.userData.treatAsOpaque = true;
    });
  }, [currentRoom]);

  // Disembunyikan saat main billiard. Dua alasan, dan yang kedua bukan
  // kosmetik:
  //
  // 1. Kamera minigame memandang lurus ke bawah dari ≥2,45 m, jadi bidang
  //    transparan di dekat lantai cuma menghalangi.
  // 2. lamps.ts memudarkan 3 lampu gantung lewat `m.opacity` — dan pass depth
  //    MENGABAIKAN opacity sepenuhnya (overrideMaterial mengganti material
  //    seutuhnya). Jadi lampu yang sudah tak terlihat di mata tetap melempar
  //    bayangan penuh. Keadaan akhir sebetulnya aman karena lamps.ts juga
  //    menyetel `visible=false` (itu DIHORMATI pass render), tapi jendela ~0,3
  //    detik saat memudar tidak. Guard ini melewatinya.
  if (!cfg || billiardActive) return null;

  return (
    // key={currentRoom} WAJIB. `frames` terbatas berarti bayangan dipanggang
    // sekali lalu berhenti; tanpa remount, pindah ruangan akan membawa
    // bayangan ruangan LAMA (render target-nya tidak pernah digambar ulang).
    // Remount memaksa render target baru, jadi bake ulang terjadi sendiri.
    <group ref={catcher}>
    <ContactShadows
      key={currentRoom}
      {...cfg}
      // ⚠️ WAJIB saat N8AO aktif (Scene.tsx). Bidang penangkap ini
      // `transparent: true` + `depthWrite: false`, dan N8AO memasukkan objek
      // seperti itu ke pass transparansinya sendiri:
      //   obj.material.transparent && !obj.material.depthWrite
      //     && !obj.userData.treatAsOpaque
      // Di pass itu AO TIDAK diterapkan pada piksel di baliknya, jadi lantai
      // di bawah bidang kehilangan penggelapan AO — dan bayangan ini berbalik
      // MENERANGI lantai. Terukur di bawah meja: 23,2 tanpa bayangan → 29,3
      // dengan bayangan. Gejalanya persis kebalikan dari maksudnya, jadi
      // sangat menyesatkan saat dilacak.
      //
      // `treatAsOpaque` mengeluarkannya dari klasifikasi itu. JANGAN pakai
      // `cannotReceiveAO` — flag itu justru MENAMBAHKAN objek ke pass
      // transparan (lihat N8AO.js:1499), memperburuk masalahnya.
      userData={{ treatAsOpaque: true }}
      // Dipanggang sekali lalu berhenti — biaya steady-state NOL draw call.
      // Bake ~4 frame × ~75 draw call, sekali per masuk ruangan, dan jatuh
      // bersamaan dengan tween kamera 1400ms yang memang sedang animasi.
      //
      // ⚠️ JANGAN 1. Office ada di dalam <Suspense>, dan materialnya masih
      // dimutasi setelah mount (needsUpdate di Office.tsx + PMREM di
      // SceneEnvironment). frames=1 mengunci keadaan tick pertama — yang bisa
      // jadi scene kosong — dan tidak pernah menyegarkannya.
      //
      // Konsekuensi yang diterima: bayangan karakter beku di pose saat bake.
      // Yang dicari di sini bayangan perabot, dan perabot tidak bergerak.
      frames={4}
    />
    </group>
  );
}
