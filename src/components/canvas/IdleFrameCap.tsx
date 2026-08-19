"use client";

import { useContext, useEffect } from "react";
import { EffectComposerContext } from "@react-three/postprocessing";
import { markSceneActivity, shouldDrawThisTick } from "./renderPace";

/**
 * Penerap cap 30 fps idle — pasang SEBAGAI ANAK <EffectComposer> di Scene.tsx.
 * Kebijakannya (definisi idle, kenapa bukan "demand") ada di renderPace.ts;
 * file ini cuma titik sambungnya.
 *
 * ── Cara kerjanya ──────────────────────────────────────────────────────────
 * @react-three/postprocessing merender lewat useFrame priority 1 yang
 * memanggil `composer.render(delta)` (diverifikasi di dist library). Method
 * itu dibungkus di sini: tick yang diputuskan skip oleh shouldDrawThisTick()
 * langsung return tanpa merender — seluruh rantai pass (N8AO, Bloom, grade)
 * tidak jalan, dan layar menahan frame sebelumnya karena canvas WebGL tidak
 * di-clear di tick yang tidak digambar.
 *
 * Kenapa titik ini yang dipilih:
 *   - Priority 1 berarti SEMUA useFrame priority 0 (CameraController yang
 *     menandai aktivitas, mixer, sweep) sudah jalan di tick yang sama —
 *     keputusan skip selalu membaca aktivitas yang paling segar.
 *   - Logika CPU per-tick tetap utuh 60×/detik, jadi tidak ada kontrak
 *     demand↔invalidate yang lahir kembali (lihat Scene.tsx).
 *
 * Komponen ini me-render null dan TIDAK menaruh objek apa pun ke scene graph,
 * jadi pemindaian anak-anak EffectComposer (yang mencari instance Effect/Pass)
 * tidak melihatnya sama sekali.
 *
 * Instance composer diambil dari EffectComposerContext, BUKAN ref dari luar:
 * context di-provide ulang setiap kali library membuat composer baru (ganti
 * kamera/gl/multisampling me-memo ulang), jadi effect di bawah ikut re-run dan
 * patch-nya selalu menempel di instance yang benar-benar dipakai.
 */
export default function IdleFrameCap() {
  const ctx = useContext(EffectComposerContext);
  const composer = ctx?.composer;

  useEffect(() => {
    if (!composer) return;
    const original = composer.render;
    composer.render = function (deltaTime?: number) {
      if (!shouldDrawThisTick()) return;
      original.call(composer, deltaTime);
    };
    return () => {
      composer.render = original;
    };
  }, [composer]);

  // Kursor bergerak/klik = pengunjung sedang berinteraksi → 60 fps, walau
  // kamera diam (hover hologram, HoverScan, membidik billiard). Di window,
  // bukan gl.domElement: murah, dan saat hero off-screen loop-nya memang
  // sudah mati total oleh FrameloopGate jadi tidak ada yang dirugikan.
  useEffect(() => {
    const mark = () => markSceneActivity();
    window.addEventListener("pointermove", mark, { passive: true });
    window.addEventListener("pointerdown", mark, { passive: true });
    return () => {
      window.removeEventListener("pointermove", mark);
      window.removeEventListener("pointerdown", mark);
    };
  }, []);

  return null;
}
