"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import {
  mulberry32,
  generateHomePositions,
  repelForce,
  stepAxis,
  type FieldVariant,
} from "@/lib/field/fieldMath";

/**
 * InteractiveField — a lightweight, comfort-first interactive background.
 *
 * Design intent (agreed with the team, 2026-07-30):
 * - "Repulsion halus": ~100 low-contrast dots drift to a per-section home layout
 *   and gently flee the pointer. No collision solver → cheap on any device.
 * - "Visible but polite": the aha-moment comes from *reactivity* to the mouse,
 *   not from loudness. Text always wins.
 * - Canvas 2D (not WebGL): avoids burning a scarce WebGL context and runs on
 *   low-end phones without a dedicated GPU.
 *
 * Perf guards:
 * - Paused entirely while off-screen (IntersectionObserver).
 * - DPR clamped; particle count is a prop the caller can scale down.
 * - prefers-reduced-motion → renders a single static gradient instead.
 */

export interface InteractiveFieldProps {
  /** Layout character for this section. */
  variant?: FieldVariant;
  /** Particle count. Keep modest; 90–120 reads full without cost. */
  count?: number;
  /** Dot RGB (matches the surface palette; kept low-contrast by opacity). */
  color?: string;
  /** Peak dot opacity — the "visible but polite" dial. */
  maxOpacity?: number;
  /** Stable seed so the layout is deterministic across reloads. */
  seed?: number;
  className?: string;
}

const POINTER_RADIUS = 0.16; // normalized: repulsion reach
const POINTER_STRENGTH = 0.045; // normalized: push magnitude
const STIFFNESS = 6;
const DAMPING = 1.4;

export default function InteractiveField({
  variant = "scatter",
  count = 100,
  color = "244, 245, 247", // --foreground as "r, g, b"
  maxOpacity = 0.22,
  seed = 1,
  className,
}: InteractiveFieldProps) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return; // static gradient path below handles this case
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const rng = mulberry32(seed);
    const home = generateHomePositions(variant, count, rng);
    // Per-particle live state (start at home, zero velocity).
    const pos = new Float32Array(home);
    const vel = new Float32Array(count * 2);
    // Per-particle radius + base opacity for natural density variation.
    const dotR = new Float32Array(count);
    const dotA = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      dotR[i] = 0.8 + rng() * 1.4;
      dotA[i] = 0.4 + rng() * 0.6;
    }

    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // Pointer in normalized coords; off-screen sentinel when absent.
    let px = -1;
    let py = -1;
    const onMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      px = (e.clientX - rect.left) / rect.width;
      py = (e.clientY - rect.top) / rect.height;
    };
    const onLeave = () => {
      px = -1;
      py = -1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave, { passive: true });

    // Only animate while the section is on-screen.
    let visible = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && raf === 0) loop();
      },
      { threshold: 0 }
    );
    io.observe(wrap);

    const dt = 1 / 60;
    let raf = 0;
    const loop = () => {
      if (!visible) {
        raf = 0;
        return;
      }
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < count; i++) {
        const ix = i * 2;
        const iy = ix + 1;
        let fx = 0;
        let fy = 0;
        if (px >= 0) {
          const [rx, ry] = repelForce(
            pos[ix],
            pos[iy],
            px,
            py,
            POINTER_RADIUS,
            POINTER_STRENGTH
          );
          fx = rx;
          fy = ry;
        }
        const sx = stepAxis(pos[ix], vel[ix], home[ix], fx, STIFFNESS, DAMPING, dt);
        const sy = stepAxis(pos[iy], vel[iy], home[iy], fy, STIFFNESS, DAMPING, dt);
        pos[ix] = sx.pos;
        vel[ix] = sx.vel;
        pos[iy] = sy.pos;
        vel[iy] = sy.vel;

        const x = pos[ix] * w;
        const y = pos[iy] * h;
        ctx.beginPath();
        ctx.arc(x, y, dotR[i], 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${dotA[i] * maxOpacity})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, variant, count, color, maxOpacity, seed]);

  // Reduced-motion / no-JS-friendly: a calm static gradient, no animation.
  if (reduced) {
    return (
      <div
        className={className}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 60% 60% at 50% 45%, rgba(255,255,255,0.05) 0%, transparent 70%)",
        }}
      />
    );
  }

  return (
    <div
      ref={wrapRef}
      className={className}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
