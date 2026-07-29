"use client";

import { useRef, useLayoutEffect } from "react";
import type * as THREE from "three";

/**
 * Lighting untuk objek DINAMIS (karakter).
 *
 * Scene kantor punya NOL lampu realtime — semua cahaya sudah dipanggang ke
 * lightmap (Documentations.md §4g). Itu yang bikin 50-60 FPS.
 *
 * Tapi karakter TIDAK BISA ikut di-bake karena dia bergerak (idle animation).
 * Kalau dibiarkan apa adanya, karakter cuma dapat ambientLight 0.12 + envmap
 * dan tampak gelap datar seperti stiker yang ditempel.
 *
 * Solusinya BUKAN menyalakan lampu scene lagi (itu balik ke 14 FPS), tapi
 * lampu ber-LAYER yang hanya menyinari karakter. Lampu di layer ini dilewati
 * saat merender ~300 objek statis, jadi biayanya nyaris nol.
 *
 * Sisi karakter di-opt-in dari Office.tsx lewat CHAR_LAYER.
 */
export const CHAR_LAYER = 1;

export default function CharacterLights() {
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);

  // layers.set() harus dipanggil setelah objek ada; ref callback dijalankan
  // tiap render jadi pakai layout effect sekali saja.
  useLayoutEffect(() => {
    key.current?.layers.set(CHAR_LAYER);
    fill.current?.layers.set(CHAR_LAYER);
  }, []);

  return (
    <>
      {/* Key hangat dari atas-depan, meniru arah track light & lampu gantung
          ruangan supaya karakter tidak terlihat disinari dari arah lain. */}
      <directionalLight
        ref={key}
        position={[3, 6, 4]}
        intensity={2.2}
        color="#ffe9d0"
      />
      {/* Fill dingin lembut dari sisi berlawanan — tanpa ini sisi gelapnya
          mati total jadi hitam pekat. */}
      <directionalLight
        ref={fill}
        position={[-4, 3, -3]}
        intensity={0.7}
        color="#cfe0ff"
      />
    </>
  );
}
