"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { mulberry32, driftOffset } from "@/lib/field/fieldMath";

/**
 * AuroraField — soft flowing color, no particles.
 *
 * Prototype #2. A few large, blurred radial blobs (surface tints + a hint of
 * accent) drift slowly like an aurora. The pointer nudges the blobs, so moving
 * the mouse visibly shifts the light. Calmest / most "premium" option, and has
 * no affordance problem: it's obviously alive at rest.
 *
 * Rendered at low internal resolution + CSS blur → cheap despite big fills.
 */

export interface AuroraFieldProps {
  /** Blob tints as ["r, g, b", ...]. Kept close to surface + one accent. */
  tints?: string[];
  /** Peak blob alpha (the visibility dial). */
  intensity?: number;
  seed?: number;
  className?: string;
}

const BLOB_COUNT = 5;
const DRIFT_AMP = 0.22;
const DRIFT_SPEED = 0.12;
const POINTER_PULL = 0.12;
const INTERNAL_SCALE = 0.25; // render at 1/4 res, CSS-blur up

export default function AuroraField({
  tints = ["120, 130, 160", "80, 90, 120", "249, 115, 22", "90, 100, 130", "150, 140, 170"],
  intensity = 0.22,
  seed = 11,
  className,
}: AuroraFieldProps) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const rng = mulberry32(seed);
    const blobs = Array.from({ length: BLOB_COUNT }, (_, i) => ({
      hx: 0.15 + rng() * 0.7,
      hy: 0.15 + rng() * 0.7,
      phase: rng() * Math.PI * 2,
      radius: 0.35 + rng() * 0.3,
      tint: tints[i % tints.length],
      x: 0,
      y: 0,
    }));

    let w = 0;
    let h = 0;
    let iw = 0;
    let ih = 0;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      iw = Math.max(1, Math.floor(w * INTERNAL_SCALE));
      ih = Math.max(1, Math.floor(h * INTERNAL_SCALE));
      canvas.width = iw;
      canvas.height = ih;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

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
    let t = 0;
    let raf = 0;
    const loop = () => {
      if (!visible) {
        raf = 0;
        return;
      }
      t += dt;
      ctx.clearRect(0, 0, iw, ih);
      ctx.globalCompositeOperation = "lighter"; // additive → colors blend like light

      for (const b of blobs) {
        const [dox, doy] = driftOffset(t, b.phase, DRIFT_AMP, DRIFT_SPEED);
        let tx = b.hx + dox;
        let ty = b.hy + doy;
        if (px >= 0) {
          tx += (px - tx) * POINTER_PULL;
          ty += (py - ty) * POINTER_PULL;
        }
        // ease toward target for smoothness
        b.x += (tx - b.x) * 0.05;
        b.y += (ty - b.y) * 0.05;

        const cx = b.x * iw;
        const cy = b.y * ih;
        const r = b.radius * Math.max(iw, ih);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(${b.tint}, ${intensity})`);
        grad.addColorStop(1, `rgba(${b.tint}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, iw, ih);
      }
      ctx.globalCompositeOperation = "source-over";
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
  }, [reduced, tints, intensity, seed]);

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
            "radial-gradient(ellipse 70% 60% at 40% 40%, rgba(120,130,160,0.08) 0%, transparent 70%)",
        }}
      />
    );
  }

  return (
    <div
      ref={wrapRef}
      className={className}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
    >
      <canvas ref={canvasRef} style={{ filter: "blur(40px)", transform: "scale(1.1)" }} />
    </div>
  );
}
