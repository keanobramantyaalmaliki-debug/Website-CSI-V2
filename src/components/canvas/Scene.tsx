"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import PlaceholderRoom from "./PlaceholderRoom";

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [4, 2.2, 5], fov: 50, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      shadows
      gl={{ antialias: true }}
      onCreated={({ camera }) => camera.lookAt(0, 1, 0)}
    >
      {/* Latar gelap sinematik ala basement */}
      <color attach="background" args={["#0a0a0a"]} />
      <fog attach="fog" args={["#0a0a0a", 8, 22]} />

      <Suspense fallback={null}>
        <PlaceholderRoom />
      </Suspense>

      {/* Kamera statis (menghadap ke tengah ruangan) — nanti diganti
          sistem waypoint + klik pintu + parallax mouse di B2 */}
    </Canvas>
  );
}
