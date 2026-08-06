"use client";

import { useRef, useMemo, useEffect, useSyncExternalStore } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import type { MotionValue } from "motion/react";
import * as THREE from "three";

const PARTICLE_COUNT = 1000;

// Narrow viewport = not enough desktop-width space for the cluster's
// right-biased offset (see targetPosition below) — width, not pointer type,
// since this is about available layout space, not hover capability.
const NARROW_QUERY = "(max-width: 1023px)";

function useNarrowViewport(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(NARROW_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
}

// Scatter: random sphere, radius 3-5 (right side bias)
function scatterPosition(i: number): [number, number, number] {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 3 + Math.random() * 2;
  return [
    Math.sin(phi) * Math.cos(theta) * r + 1.5,
    Math.sin(phi) * Math.sin(theta) * r * 0.6,
    Math.cos(phi) * r * 0.4 - 1,
  ];
}

// Target: tight cluster / lattice converging center-right on desktop.
// Narrow viewports don't have the spare right-side space that offset
// assumes, so the cluster scales down and pulls toward center instead.
function targetPosition(i: number, narrow: boolean): [number, number, number] {
  const cols = narrow ? 24 : 40;
  const offset = narrow ? 0.3 : 1.0;
  const row = Math.floor(i / cols);
  const col = i % cols;
  return [
    (col - cols / 2) * 0.055 + offset,
    (row - (PARTICLE_COUNT / cols) / 2) * 0.055,
    0,
  ];
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function Particles({ progress, narrow }: { progress: MotionValue<number>; narrow: boolean }) {
  const { invalidate } = useThree();
  const pointsRef = useRef<THREE.Points>(null);

  const { scatter, target, opacities } = useMemo(() => {
    const scatter = new Float32Array(PARTICLE_COUNT * 3);
    const target = new Float32Array(PARTICLE_COUNT * 3);
    const opacities = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const [sx, sy, sz] = scatterPosition(i);
      const [tx, ty, tz] = targetPosition(i, narrow);
      scatter[i * 3] = sx;
      scatter[i * 3 + 1] = sy;
      scatter[i * 3 + 2] = sz;
      target[i * 3] = tx;
      target[i * 3 + 1] = ty;
      target[i * 3 + 2] = tz;
      // Base opacity varies per particle for natural density variation
      opacities[i] = 0.25 + Math.random() * 0.25;
    }
    return { scatter, target, opacities };
  }, [narrow]);

  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);

  useEffect(() => {
    // Subscribe to motion value — drive invalidate on change
    const unsub = progress.on("change", (t) => {
      if (!pointsRef.current) return;
      const geo = pointsRef.current.geometry;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease in-out quad

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pos.array[i * 3] = lerp(scatter[i * 3], target[i * 3], eased);
        pos.array[i * 3 + 1] = lerp(scatter[i * 3 + 1], target[i * 3 + 1], eased);
        pos.array[i * 3 + 2] = lerp(scatter[i * 3 + 2], target[i * 3 + 2], eased);
      }
      pos.needsUpdate = true;
      invalidate();
    });
    return unsub;
  }, [progress, scatter, target, invalidate]);

  // Initialize positions to scatter
  useMemo(() => {
    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
      positions[i] = scatter[i];
    }
  }, [positions, scatter]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={PARTICLE_COUNT}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-opacity"
          args={[opacities, 1]}
          count={PARTICLE_COUNT}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.022}
        color="#a1a1aa"
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export default function ManifestoField({ progress }: { progress: MotionValue<number> }) {
  const reduced = useReducedMotion();
  const narrow = useNarrowViewport();

  // No-WebGL / reduced-motion: render subtle gradient instead
  if (reduced) {
    return (
      <div
        className="pointer-events-none absolute inset-0 -z-0"
        aria-hidden="true"
        style={{
          background: narrow
            ? "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(63,63,70,0.18) 0%, transparent 70%)"
            : "radial-gradient(ellipse 60% 60% at 75% 50%, rgba(63,63,70,0.18) 0%, transparent 70%)",
        }}
      />
    );
  }

  const maskGradient = narrow
    ? "linear-gradient(to right, transparent 0%, black 55%, black 100%)"
    : "linear-gradient(to right, transparent 0%, black 35%, black 100%)";

  return (
    <div
      className="pointer-events-none absolute inset-0 -z-0"
      aria-hidden="true"
      style={{
        // Fade left edge so particles don't compete with text; narrow
        // viewports fade in later so the cluster doesn't clip near the edge.
        maskImage: maskGradient,
        WebkitMaskImage: maskGradient,
        opacity: narrow ? 0.7 : 1,
      }}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          alpha: true,
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <Particles progress={progress} narrow={narrow} />
      </Canvas>
    </div>
  );
}
