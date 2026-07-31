"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import type { MotionValue } from "motion/react";
import * as THREE from "three";

const PARTICLE_COUNT = 1000;

// Text-sampling canvas — sized to match the target bounding box below.
const SAMPLE_CANVAS_WIDTH = 860;
const SAMPLE_CANVAS_HEIGHT = 550;

// Target bounding box in Three.js space (mirrors ManifestoField's lattice extent).
const TARGET_WIDTH = 2.15;
const TARGET_HEIGHT = 1.375;
const TARGET_CENTER_X = 1.0;

// Scatter: random sphere, radius 3-5 (right side bias)
function scatterPosition(): [number, number, number] {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 3 + Math.random() * 2;
  return [
    Math.sin(phi) * Math.cos(theta) * r + 1.5,
    Math.sin(phi) * Math.sin(theta) * r * 0.6,
    Math.cos(phi) * r * 0.4 - 1,
  ];
}

interface PixelPoint {
  x: number;
  y: number;
}

// Rasterize `text` onto an offscreen 2D canvas and collect opaque pixel coords.
// Returns null when a 2D context isn't available (e.g. jsdom in tests).
function getTextPixels(text: string, width: number, height: number): PixelPoint[] | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${Math.floor(height * 0.7)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);

  const { data } = ctx.getImageData(0, 0, width, height);
  const points: PixelPoint[] = [];
  const step = 2;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 128) points.push({ x, y });
    }
  }
  return points;
}

// Reservoir sample `count` items from `arr` without allocating past its length.
function subsample<T>(arr: T[], count: number): T[] {
  if (arr.length <= count) return arr;
  const result = arr.slice(0, count);
  for (let i = count; i < arr.length; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    if (j < count) result[j] = arr[i];
  }
  return result;
}

// Sample `count` target points shaped like `text`, normalized into Three.js space.
// Falls back to the ManifestoField-style lattice when canvas 2D isn't available.
export function sampleTextPoints(text: string, count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const pixels = getTextPixels(text, SAMPLE_CANVAS_WIDTH, SAMPLE_CANVAS_HEIGHT);

  if (!pixels || pixels.length === 0) {
    const cols = 40;
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      positions[i * 3] = (col - cols / 2) * 0.055 + TARGET_CENTER_X;
      positions[i * 3 + 1] = (row - count / cols / 2) * 0.055;
      positions[i * 3 + 2] = 0;
    }
    return positions;
  }

  const sampled = subsample(pixels, count);
  for (let i = 0; i < count; i++) {
    const p = sampled[i % sampled.length];
    positions[i * 3] = (p.x / SAMPLE_CANVAS_WIDTH - 0.5) * TARGET_WIDTH + TARGET_CENTER_X;
    positions[i * 3 + 1] = -(p.y / SAMPLE_CANVAS_HEIGHT - 0.5) * TARGET_HEIGHT;
    positions[i * 3 + 2] = 0;
  }
  return positions;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function Particles({ progress }: { progress: MotionValue<number> }) {
  const { invalidate } = useThree();
  const pointsRef = useRef<THREE.Points>(null);

  const { scatter, target, opacities } = useMemo(() => {
    const scatter = new Float32Array(PARTICLE_COUNT * 3);
    const opacities = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const [sx, sy, sz] = scatterPosition();
      scatter[i * 3] = sx;
      scatter[i * 3 + 1] = sy;
      scatter[i * 3 + 2] = sz;
      opacities[i] = 0.25 + Math.random() * 0.25;
    }

    const target = sampleTextPoints("CSI", PARTICLE_COUNT);
    return { scatter, target, opacities };
  }, []);

  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);

  useEffect(() => {
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

export default function CsiParticleField({ progress }: { progress: MotionValue<number> }) {
  const reduced = useReducedMotion();

  // No-WebGL / reduced-motion: render subtle gradient instead
  if (reduced) {
    return (
      <div
        className="pointer-events-none absolute inset-0 -z-0"
        aria-hidden="true"
        style={{
          background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(63,63,70,0.18) 0%, transparent 70%)",
        }}
      />
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden="true">
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
        <Particles progress={progress} />
      </Canvas>
    </div>
  );
}
