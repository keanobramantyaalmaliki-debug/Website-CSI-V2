"use client";

import { useDepthBuffer } from "@react-three/drei";
import LightCone, { type LightConeProps } from "./LightCone";

/**
 * Kumpulan kerucut cahaya + depth buffer bersama.
 *
 * Depth buffer-nya dibuat SEKALI di sini lalu dipakai bersama semua kerucut.
 * Kalau tiap kerucut punya sendiri, tiap satu menambah satu render pass penuh.
 *
 * ⚠️ ONGKOSNYA NYATA. useDepthBuffer merender ULANG seluruh scene tiap frame
 * ke render target terpisah. Scene ini 401 draw call (hasil merge dari 2522),
 * dan draw call itulah bottleneck-nya — bukan poly. Jadi depth fade praktis
 * MELIPATGANDAKAN draw call per frame.
 *
 * Karena itu `depthFade` dibuat bisa dimatikan. Nyalakan sambil menyetel look,
 * lalu ukur FPS-nya. Kalau turun, matikan dan kompensasi dengan memendekkan
 * kerucut supaya berhenti tepat sebelum menyentuh lantai — hasilnya mirip
 * dengan ongkos nol.
 */

/**
 * Posisi lampu, dibaca dari office.glb (koordinat dunia, sudah diverifikasi
 * lewat rantai transform node — bukan tebakan).
 *
 * Lantai ada di y ≈ 0, jadi `height` kira-kira setinggi posisi y lampunya.
 *
 * Tidak ada lagi penanda khusus per-lampu di sini: kerucut yang terlalu dekat
 * dengan kamera memudar sendiri (nearFadeStart/End di LightCone), termasuk
 * kalau kameranya sampai masuk ke dalamnya.
 */
export const LAMPS = {
  /** Lampu plafon area office, y=3.56. Plafon tinggi, lantai lega. */
  officeA: { position: [-10.579, 3.556, 1.035], height: 3.5 },
  officeB: { position: [-4.42, 3.556, 1.06], height: 3.5 },

  /** Meeting room, y=2.92 — 6 lampu berjajar TEPAT DI ATAS MEJA. */
  mrCeil0: { position: [-20.0, 2.92, -0.9], height: 2.9 },
  mrCeil1: { position: [-18.0, 2.92, -0.9], height: 2.9 },
  mrCeil2: { position: [-16.0, 2.92, -0.9], height: 2.9 },
  mrCeil3: { position: [-20.0, 2.92, 1.7], height: 2.9 },
  mrCeil4: { position: [-18.0, 2.92, 1.7], height: 2.9 },
  mrCeil5: { position: [-16.0, 2.92, 1.7], height: 2.9 },

  /** Function room, y=3.58. */
  frCeil0: { position: [-0.93, 3.582, -10.52], height: 3.5 },
  frCeil1: { position: [1.63, 3.582, -10.45], height: 3.5 },
  // Kamera view Function berdiri TEPAT DI DALAM kerucut ini (0,40 m dari
  // sumbu, radius di ketinggian mata 0,87 m) — jadi ia memudar habis dan
  // memang tidak terlihat dari sudut pandang ruangan itu. Sengaja dibiarkan
  // terdaftar: begitu VIEWS Function digeser sedikit menjauh, kerucutnya
  // muncul sendiri tanpa perlu diubah di sini.
  frCeil2: { position: [1.58, 3.582, -7.89], height: 3.5 },
  frCeil3: { position: [-0.94, 3.582, -7.96], height: 3.5 },
} as const satisfies Record<
  string,
  { position: readonly number[]; height: number }
>;

export type LampKey = keyof typeof LAMPS;

interface LightConesProps {
  /**
   * Lampu mana yang dinyalakan. Default satu saja — matangkan look-nya di satu
   * lampu dulu sebelum disebar (lihat Documentations.md soal cara kerja ini).
   */
  lamps?: LampKey[];
  depthFade?: boolean;
  debug?: boolean;
  /** Diteruskan ke tiap kerucut; untuk menyetel look di satu tempat. */
  look?: Partial<
    Omit<LightConeProps, "position" | "height" | "depthBuffer" | "debug">
  >;
}

export default function LightCones({
  lamps = ["officeA"],
  depthFade = true,
  debug = false,
  look,
}: LightConesProps) {
  // 256px sudah cukup: hasilnya cuma dipakai untuk memudarkan tepi, bukan
  // detail tajam. Ukuran kecil menekan fill rate, tapi TIDAK menekan draw call
  // — lihat peringatan di atas.
  //
  // ⚠️ Hook harus dipanggil tanpa syarat (aturan hooks). Saat depthFade mati,
  // frames: 0 membuatnya tidak pernah merender, jadi ongkosnya benar-benar nol.
  const depth = useDepthBuffer({ size: 256, frames: depthFade ? Infinity : 0 });

  return (
    <>
      {lamps.map((key) => {
        const lamp = LAMPS[key];
        return (
          <LightCone
            key={key}
            position={lamp.position as [number, number, number]}
            height={lamp.height}
            depthBuffer={depthFade ? depth : null}
            debug={debug}
            {...look}
          />
        );
      })}
    </>
  );
}
