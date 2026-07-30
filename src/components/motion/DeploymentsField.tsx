"use client";

import { useRef, useEffect, useMemo } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";

const POINT_COUNT = 350;

function DriftPoints() {
  const { invalidate } = useThree();
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(POINT_COUNT * 3);
    const vel = new Float32Array(POINT_COUNT * 2);
    for (let i = 0; i < POINT_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 9;
      pos[i * 3 + 2] = 0;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.003 + Math.random() * 0.004;
      vel[i * 2] = Math.cos(angle) * speed;
      vel[i * 2 + 1] = Math.sin(angle) * speed;
    }
    return { positions: pos, velocities: vel };
  }, []);

  // Drive ~8fps renders without spinning at 60fps when idle
  useEffect(() => {
    const id = setInterval(() => invalidate(), 125);
    return () => clearInterval(id);
  }, [invalidate]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const scale = delta * 60;

    for (let i = 0; i < POINT_COUNT; i++) {
      let x = arr[i * 3] + velocities[i * 2] * scale;
      let y = arr[i * 3 + 1] + velocities[i * 2 + 1] * scale;
      if (x > 7) x -= 14;
      if (x < -7) x += 14;
      if (y > 4.5) y -= 9;
      if (y < -4.5) y += 9;
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={POINT_COUNT}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.014}
        color="#52525b"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export default function DeploymentsField() {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div
        className="pointer-events-none absolute inset-0 -z-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(39,39,42,0.25) 0%, transparent 70%)",
        }}
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 -z-0"
      aria-hidden="true"
      style={{
        maskImage:
          "radial-gradient(ellipse 90% 80% at 50% 50%, black 30%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 90% 80% at 50% 50%, black 30%, transparent 100%)",
        opacity: 0.2,
      }}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 55 }}
        gl={{ antialias: false, powerPreference: "default", alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <DriftPoints />
      </Canvas>
    </div>
  );
}
