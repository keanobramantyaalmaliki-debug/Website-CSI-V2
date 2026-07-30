"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import {
  mulberry32,
  generateHomePositions,
  repelForce,
  stepAxis,
  distance2,
  linkOpacity,
  driftOffset,
} from "@/lib/field/fieldMath";

/**
 * NetworkField — connected constellation background.
 *
 * Prototype #1. Nodes drift on their own (alive at rest), connect to nearby
 * neighbours with hairlines, and both nodes + links react to the pointer:
 * nodes flee, links near the cursor brighten. The "connect" motif ties to the
 * manifesto ("Software connects information. Intelligence connects decisions.").
 *
 * Canvas 2D + rAF (not react-spring: that animates React props, not per-frame
 * canvas draws). Spring tuning borrowed from the react-spring physics guide.
 */

export interface NetworkFieldProps {
  count?: number;
  seed?: number;
  /** Node/line color as "r, g, b". */
  color?: string;
  /** Accent color for links nearest the pointer (brand orange by default). */
  accent?: string;
  /** Peak node opacity. */
  maxOpacity?: number;
  className?: string;
}

const LINK_DIST = 0.14; // normalized: connect nodes closer than this
const LINK_DIST2 = LINK_DIST * LINK_DIST;
const POINTER_RADIUS = 0.18;
const POINTER_STRENGTH = 0.05;
const POINTER_GLOW = 0.11; // links within this of pointer get accent tint
const CURSOR_GLOW = 0.13; // radius (normalized) of the soft light following cursor
const NODE_GLOW = 0.1; // nodes within this of cursor brighten
const STIFFNESS = 5;
const DAMPING = 1.3;
const DRIFT_AMP = 0.02;
const DRIFT_SPEED = 0.25;

export default function NetworkField({
  count = 70,
  seed = 7,
  color = "180, 190, 205",
  accent = "249, 115, 22",
  maxOpacity = 0.5,
  className,
}: NetworkFieldProps) {
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
    const home = generateHomePositions("scatter", count, rng);
    const pos = new Float32Array(home);
    const vel = new Float32Array(count * 2);
    const phase = new Float32Array(count);
    const nodeR = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      phase[i] = rng() * Math.PI * 2;
      nodeR[i] = 1.1 + rng() * 1.3;
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
    // Spring-lerped cursor for the soft glow (react-spring feel, hand-rolled).
    let gx = -1;
    let gy = -1;
    const loop = () => {
      if (!visible) {
        raf = 0;
        return;
      }
      t += dt;
      ctx.clearRect(0, 0, w, h);

      // Ease the glow toward the pointer; fade it out when the pointer leaves.
      if (px >= 0) {
        if (gx < 0) {
          gx = px;
          gy = py;
        } else {
          gx += (px - gx) * 0.12;
          gy += (py - gy) * 0.12;
        }
        // Soft radial light behind everything, tinted toward the accent.
        const cgx = gx * w;
        const cgy = gy * h;
        const r = CURSOR_GLOW * Math.max(w, h);
        const grad = ctx.createRadialGradient(cgx, cgy, 0, cgx, cgy, r);
        grad.addColorStop(0, `rgba(${accent}, 0.08)`);
        grad.addColorStop(0.5, `rgba(${color}, 0.03)`);
        grad.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } else {
        gx = -1;
        gy = -1;
      }

      // Advance node positions: home + self-drift, spring, pointer repulsion.
      for (let i = 0; i < count; i++) {
        const ix = i * 2;
        const iy = ix + 1;
        const [dox, doy] = driftOffset(t, phase[i], DRIFT_AMP, DRIFT_SPEED);
        const hx = home[ix] + dox;
        const hy = home[iy] + doy;
        let fx = 0;
        let fy = 0;
        if (px >= 0) {
          const [rx, ry] = repelForce(pos[ix], pos[iy], px, py, POINTER_RADIUS, POINTER_STRENGTH);
          fx = rx;
          fy = ry;
        }
        const sx = stepAxis(pos[ix], vel[ix], hx, fx, STIFFNESS, DAMPING, dt);
        const sy = stepAxis(pos[iy], vel[iy], hy, fy, STIFFNESS, DAMPING, dt);
        pos[ix] = sx.pos;
        vel[ix] = sx.vel;
        pos[iy] = sy.pos;
        vel[iy] = sy.vel;
      }

      // Draw links first (behind nodes).
      for (let i = 0; i < count; i++) {
        const ax = pos[i * 2];
        const ay = pos[i * 2 + 1];
        for (let j = i + 1; j < count; j++) {
          const bx = pos[j * 2];
          const by = pos[j * 2 + 1];
          const d2 = distance2(ax, ay, bx, by);
          const lo = linkOpacity(d2, LINK_DIST2);
          if (lo <= 0) continue;
          // Brighten + tint links whose midpoint is near the pointer.
          let a = lo * maxOpacity * 0.5;
          let col = color;
          if (px >= 0) {
            const mx = (ax + bx) / 2;
            const my = (ay + by) / 2;
            const near = 1 - Math.min(1, Math.hypot(mx - px, my - py) / POINTER_GLOW);
            if (near > 0) {
              a += near * 0.35;
              col = accent;
            }
          }
          ctx.beginPath();
          ctx.moveTo(ax * w, ay * h);
          ctx.lineTo(bx * w, by * h);
          ctx.strokeStyle = `rgba(${col}, ${a})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Draw nodes. Those near the cursor brighten and gain a soft accent halo.
      for (let i = 0; i < count; i++) {
        const nx = pos[i * 2];
        const ny = pos[i * 2 + 1];
        const x = nx * w;
        const y = ny * h;

        let near = 0;
        if (px >= 0) {
          near = 1 - Math.min(1, Math.hypot(nx - px, ny - py) / NODE_GLOW);
        }

        if (near > 0) {
          // Accent halo — makes the interaction obvious right around the cursor.
          const halo = ctx.createRadialGradient(x, y, 0, x, y, nodeR[i] * 6);
          halo.addColorStop(0, `rgba(${accent}, ${0.35 * near})`);
          halo.addColorStop(1, `rgba(${accent}, 0)`);
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(x, y, nodeR[i] * 6, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x, y, nodeR[i] + near * 0.6, 0, Math.PI * 2);
        // Blend node color toward the accent as it nears the cursor.
        const nodeCol = near > 0.5 ? accent : color;
        ctx.fillStyle = `rgba(${nodeCol}, ${Math.min(1, maxOpacity + near * 0.4)})`;
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
  }, [reduced, count, seed, color, accent, maxOpacity]);

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
