"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";

const PARTICLE_COUNT = 1000;
const LETTERS = ["C", "S", "I"] as const;

// Autoplay timeline: converge onto a letter, hold, disperse back to scatter, next letter.
const CONVERGE_MS = 1300;
const HOLD_MS = 1800;
const DISPERSE_MS = 900;

// Text-sampling canvas — sized to match the target bounding box below.
const SAMPLE_CANVAS_WIDTH = 860;
const SAMPLE_CANVAS_HEIGHT = 550;

// Target bounding box in Three.js space (mirrors ManifestoField's lattice extent).
const TARGET_WIDTH = 6.6;
const TARGET_HEIGHT = 4.275;
const TARGET_CENTER_X = 1.8;

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

function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export interface TimelineSegment {
  from: Float32Array;
  to: Float32Array;
  duration: number;
  hold: boolean;
}

// scatter → letter (converge) → hold → letter → scatter (disperse), repeated per letter.
export function buildTimeline(scatter: Float32Array, letterTargets: Float32Array[]): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  for (const target of letterTargets) {
    segments.push({ from: scatter, to: target, duration: CONVERGE_MS, hold: false });
    segments.push({ from: target, to: target, duration: HOLD_MS, hold: true });
    segments.push({ from: target, to: scatter, duration: DISPERSE_MS, hold: false });
  }
  return segments;
}

// Elapsed time is wrapped modulo the timeline's total duration, so the sequence loops forever.
export function sampleTimeline(
  segments: TimelineSegment[],
  elapsedMs: number,
): { from: Float32Array; to: Float32Array; eased: number } {
  const total = segments.reduce((sum, s) => sum + s.duration, 0);
  if (total <= 0 || segments.length === 0) {
    const empty = new Float32Array(0);
    return { from: empty, to: empty, eased: 0 };
  }

  let t = elapsedMs % total;
  for (const seg of segments) {
    if (t <= seg.duration) {
      const localT = seg.duration === 0 ? 1 : t / seg.duration;
      return { from: seg.from, to: seg.to, eased: seg.hold ? 1 : easeInOutQuad(localT) };
    }
    t -= seg.duration;
  }

  const last = segments[segments.length - 1];
  return { from: last.from, to: last.to, eased: 1 };
}

function Particles({ active }: { active: boolean }) {
  const { invalidate } = useThree();
  const pointsRef = useRef<THREE.Points>(null);

  const { scatter, opacities, timeline } = useMemo(() => {
    const scatter = new Float32Array(PARTICLE_COUNT * 3);
    const opacities = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const [sx, sy, sz] = scatterPosition();
      scatter[i * 3] = sx;
      scatter[i * 3 + 1] = sy;
      scatter[i * 3 + 2] = sz;
      opacities[i] = 0.25 + Math.random() * 0.25;
    }

    const letterTargets = LETTERS.map((letter) => sampleTextPoints(letter, PARTICLE_COUNT));
    return { scatter, opacities, timeline: buildTimeline(scatter, letterTargets) };
  }, []);

  const positions = useMemo(() => new Float32Array(scatter), [scatter]);

  const elapsedRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      lastTsRef.current = null;
      return;
    }

    let rafId: number;
    const tick = (ts: number) => {
      if (lastTsRef.current !== null) {
        elapsedRef.current += ts - lastTsRef.current;
      }
      lastTsRef.current = ts;

      const pos = pointsRef.current?.geometry.attributes.position as THREE.BufferAttribute | undefined;
      if (pos) {
        const { from, to, eased } = sampleTimeline(timeline, elapsedRef.current);
        for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
          pos.array[i] = lerp(from[i], to[i], eased);
        }
        pos.needsUpdate = true;
        invalidate();
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      lastTsRef.current = null;
    };
  }, [active, timeline, invalidate]);

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

export default function CsiParticleField({ active }: { active: boolean }) {
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
        <Particles active={active} />
      </Canvas>
    </div>
  );
}
