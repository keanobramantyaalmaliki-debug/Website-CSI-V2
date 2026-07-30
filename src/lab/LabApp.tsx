"use client";

import { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import CannonField from "./scenes/CannonField";
import ControlPanel from "./ControlPanel";
import { usePauseWhenIdle } from "./shared/usePauseWhenIdle";
import {
  DEFAULT_PARAMS,
  normalizeParams,
  type EngineKind,
  type FieldParams,
} from "./shared/fieldConfig";

/**
 * LabApp — halaman uji physics 3D, TERPISAH dari App.tsx produksi.
 *
 * Diakses lewat lab.html (dev-only). Membandingkan engine di ruang yang sama;
 * untuk sekarang hanya cannon-es yang aktif — slot rapier disiapkan di panel
 * tapi dinonaktifkan sampai @react-three/rapier dipasang.
 */
export default function LabApp() {
  const [params, setParams] = useState<FieldParams>(DEFAULT_PARAMS);
  const [engine, setEngine] = useState<EngineKind>("cannon");
  const wrapRef = useRef<HTMLDivElement>(null);
  const paused = usePauseWhenIdle(wrapRef);

  // Perubahan param memicu pembuatan ulang world (lewat key), reset simulasi.
  const update = (patch: Partial<FieldParams>) =>
    setParams((prev) => normalizeParams({ ...prev, ...patch }));

  return (
    <div
      ref={wrapRef}
      style={{ position: "fixed", inset: 0, background: "#0a0a0c" }}
    >
      <Canvas
        camera={{ position: [0, 0, 9], fov: 55, near: 0.1, far: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#0a0a0c"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 6, 8]} intensity={1.1} />
        <directionalLight position={[-6, -3, 2]} intensity={0.3} />
        {engine === "cannon" && (
          <CannonField
            key={`${params.seed}-${params.count}-${params.gravityY}`}
            params={params}
            paused={paused}
          />
        )}
      </Canvas>

      <ControlPanel
        params={params}
        engine={engine}
        paused={paused}
        onChange={update}
        onEngine={setEngine}
        onReset={() => setParams({ ...DEFAULT_PARAMS, seed: params.seed + 1 })}
      />
    </div>
  );
}
