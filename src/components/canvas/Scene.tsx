"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, useProgress } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { ACESFilmicToneMapping } from "three";
import { Suspense } from "react";
import Office from "./Office";
import SceneEnvironment from "./SceneEnvironment";
import CharacterLights from "./CharacterLights";

/**
 * Konversi koordinat Blender → three.js (glTF Y-up):
 *   three(x, y, z) = blender(x, z, -y)
 * Dipakai supaya angka waypoint bisa disalin langsung dari Blender.
 */
const bl = (x: number, y: number, z: number): [number, number, number] => [
  x,
  z,
  -y,
];

// Titik awal kamera: berdiri di office area menghadap ke barat.
// Nanti jadi salah satu waypoint saat sistem point-and-click (B2) dibuat;
// empat lainnya ada di export-test/index.html.
const START_POS = bl(-6.0, -4.0, 1.6);
const START_TARGET = bl(-11.0, -3.0, 1.1);

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-zinc-400">Turning on the lights…</p>
        <p className="font-mono text-xs text-zinc-600 tabular-nums">
          {progress.toFixed(0)}%
        </p>
      </div>
    </Html>
  );
}

export default function Scene() {
  return (
    <Canvas
      // Setelan ini disalin dari viewer yang sudah diverifikasi
      // (export-test/index.html). Mengubahnya = hasilnya beda dari yang
      // sudah di-approve; lihat Documentations.md §4e.
      camera={{ position: START_POS, fov: 60, near: 0.05, far: 120 }}
      // 1.5 sudah cukup tajam di layar Retina; 2.0 = render 4× piksel.
      dpr={[1, 1.5]}
      // TIDAK ada `shadows`: bayangan sudah dipanggang ke lightmap.
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
    >
      <color attach="background" args={["#0a0a0c"]} />
      {/* Sengaja TANPA fog — kantor membentang 20m+, fog placeholder yang lama
          (near 8 / far 22) akan menutupi hampir seluruh ruangan. */}

      {/* Pengisi tipis untuk sisi yang tidak kena lightmap sama sekali. */}
      <ambientLight intensity={0.12} />
      <SceneEnvironment />
      <CharacterLights />

      <Suspense fallback={<Loader />}>
        <Office />
      </Suspense>

      {/* Sementara: bebas orbit untuk inspeksi. Diganti sistem waypoint +
          klik pintu + parallax mouse di B2 (lihat reference/ROADMAP.md). */}
      <OrbitControls
        target={START_TARGET}
        enableDamping
        makeDefault
        maxDistance={40}
      />

      <EffectComposer>
        {/* Bloom BUKAN sekadar hiasan di scene ini: LED strip lantai & bohlam
            mengandalkannya untuk terlihat menyala. Tanpa bloom, LED strip cuma
            garis putih tipis dan ruangan terasa jauh lebih mati (kecerahan
            terukur turun ke 0.53× dari viewer acuan).

            intensity 1.6 — BUKAN 0.4 seperti di viewer HTML. Viewer pakai
            UnrealBloomPass, di sini BloomEffect dari postprocessing; algoritmanya
            beda jadi angkanya tidak setara. 1.6 hasil kalibrasi terhadap
            screenshot viewer (rasio kecerahan 0.98 — praktis identik):
              0.4 → 0.75   0.8 → 0.85   1.2 → 0.92   1.6 → 0.98

            threshold 0.95 = hanya emissive yang berpendar. Kalau diturunkan,
            lantai & permukaan terang ikut glow seperti lava. */}
        <Bloom intensity={1.6} luminanceThreshold={0.95} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
