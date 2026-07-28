"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import type * as THREE from "three";
import { Color, Mesh, MeshBasicMaterial, Texture } from "three";

// GLB yang sama dengan Office — useGLTF nge-cache, jadi ini TIDAK memuat ulang
// file, cuma mengambil scene yang sudah ada lalu mencari mesh layar.
const MODEL_URL = "/export-test/office-mvp1-baked.glb";

/**
 * Naming mesh layar (dari CLAUDE.md "Naming mesh & target interaksi"):
 * - MR_TV_Screen        : TV 98" ruang meeting → nanti <VideoTexture> showreel
 * - OP_iMac_Screen_*    : iMac ruang office    → nanti <RenderTexture> UI idle
 *
 * TAHAP INI = STRUKTUR SAJA. Kita belum menaruh video/konten; layar diberi
 * material "idle glow" supaya tidak hitam-mati. Nanti tinggal:
 *   material.map = videoTexture   // TV
 *   material.map = renderTexture  // iMac
 * pada slot yang sama.
 */

const SCREEN_PATTERNS: { test: (name: string) => boolean; tint: string }[] = [
  // TV meeting — biru dingin lembut (idle "standby")
  { test: (n) => n === "MR_TV_Screen", tint: "#14304a" },
  // iMac office — abu kebiruan terang (idle "desktop")
  { test: (n) => /^OP_iMac_Screen/i.test(n), tint: "#243a52" },
];

function tintFor(name: string): string | null {
  for (const p of SCREEN_PATTERNS) if (p.test(name)) return p.tint;
  return null;
}

/**
 * Mengubah mesh layar jadi "nyala" (idle) dengan MeshBasicMaterial:
 * - MeshBasicMaterial tidak butuh cahaya → layar terlihat konsisten walau
 *   scene mengandalkan lightmap (yang di-set 0 di sini).
 * - toneMapped=false → warna layar tidak diredam ACES saat exposure rendah,
 *   sama seperti pola material emissive di Office.tsx (FIX 2).
 *
 * Nanti saat konten asli masuk, cukup set `mat.map = <texture>` dan
 * `mat.color = white` — kerangkanya sudah siap.
 */
export default function Screens() {
  const { scene } = useGLTF(MODEL_URL);

  useMemo(() => {
    const found: string[] = [];
    scene.traverse((obj: THREE.Object3D) => {
      if (!(obj instanceof Mesh)) return;
      const tint = tintFor(obj.name);
      if (!tint) return;

      const mat = new MeshBasicMaterial({
        color: new Color(tint),
        toneMapped: false,
      });
      // Slot map dibiarkan null (idle). Diisi VideoTexture/RenderTexture nanti.
      mat.map = null as Texture | null;
      obj.material = mat;
      found.push(obj.name);
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`[screens] idle layar terpasang: ${found.join(", ") || "(none)"}`);
    }
    return found;
  }, [scene]);

  // Tidak merender apa pun sendiri — hanya memodifikasi material di scene Office
  // yang sudah ada di graph. Office.tsx yang menaruh <primitive>-nya.
  return null;
}
