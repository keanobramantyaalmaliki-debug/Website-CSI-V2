"use client";

import { Canvas } from "@react-three/fiber";
import { Html, useProgress } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { ACESFilmicToneMapping } from "three";
import { Suspense } from "react";
import Office from "./Office";
import Screens from "./Screens";
import SceneEnvironment from "./SceneEnvironment";
import CharacterLights from "./CharacterLights";
import CameraController from "./CameraController";
import DustMotes from "./DustMotes";
import { PS1Effect } from "./PS1Effect";

// Posisi awal (Office) — CameraController snap ke sini saat mount.
const START_POS: [number, number, number] = [-6.0, 1.6, 4.0];

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
      camera={{ position: START_POS, fov: 60, near: 0.05, far: 120 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
    >
      <color attach="background" args={["#0a0a0c"]} />
      <ambientLight intensity={0.12} />
      <SceneEnvironment />
      <CharacterLights />
      <CameraController />

      <Suspense fallback={<Loader />}>
        <Office />
        {/* Idle glow untuk mesh layar (TV/iMac). Struktur siap-isi:
            VideoTexture/RenderTexture tinggal dipasang ke material.map. */}
        <Screens />
      </Suspense>

      <DustMotes />

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

        {/* Vignette — gelapkan tepi layar supaya mata tertuju ke tengah dan
            ruangan terasa lebih sinematik. Murni operasi 2D di ruang layar
            (bukan cahaya scene), jadi TIDAK mempengaruhi FPS/lightmap/bloom.
            offset 0.3 = mulai gelap agak jauh dari tepi; darkness 0.55 =
            cukup terasa tanpa menutup sudut ruangan yang berisi objek. */}
        <Vignette offset={0.3} darkness={0.55} />

        {/* PS1 retro look — HARUS terakhir (setelah Bloom) supaya glow ikut
            ter-pixelate & menyatu. Memberi identitas visual basement.studio. */}
        <PS1Effect pixelSize={0.10} colorLevels={32} scanline={0.18} grain={0.06} />
      </EffectComposer>
    </Canvas>
  );
}
