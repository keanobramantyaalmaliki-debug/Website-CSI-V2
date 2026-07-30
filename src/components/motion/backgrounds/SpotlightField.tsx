"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

/**
 * SpotlightField — cursor-driven light that reveals a hidden grid + glow.
 *
 * Prototype #3. At rest the section is calm and near-empty; a slow "breathing"
 * ambient glow keeps it from being fully dead. As the pointer moves, a soft
 * spotlight follows (spring-eased) and reveals a fine grid + accent glow around
 * the cursor. This is the most OBVIOUS interaction — moving the mouse clearly
 * lights the area — at the cost of leaning on the pointer for its liveliness.
 *
 * Implemented with layered CSS radial-gradients driven by a spring-lerped
 * pointer; a static SVG grid is masked by the same light. No per-particle draw.
 */

export interface SpotlightFieldProps {
  /** Spotlight tint "r, g, b". */
  color?: string;
  /** Accent ring tint "r, g, b". */
  accent?: string;
  /** Spotlight radius in px. */
  radius?: number;
  className?: string;
}

const GRID = 42; // px grid cell

export default function SpotlightField({
  color = "200, 210, 230",
  accent = "249, 115, 22",
  radius = 260,
  className,
}: SpotlightFieldProps) {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    const glow = glowRef.current;
    const grid = gridRef.current;
    if (!wrap || !glow || !grid) return;

    // Start off-screen so nothing shows until the pointer enters.
    let tx = -9999;
    let ty = -9999;
    let cx = -9999;
    let cy = -9999;
    let inside = false;

    const onMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      if (inside) {
        tx = x;
        ty = y;
      }
    };
    const onLeave = () => {
      inside = false;
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

    let raf = 0;
    let t = 0;
    const loop = () => {
      if (!visible) {
        raf = 0;
        return;
      }
      t += 1 / 60;
      // Spring-lerp the light toward the pointer (react-spring feel, hand-rolled).
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;

      // Ambient breathing so it's alive even without pointer movement.
      const breathe = 0.5 + 0.5 * Math.sin(t * 0.8);
      const revealOpacity = inside ? 1 : 0.14 + 0.06 * breathe;

      glow.style.background = `radial-gradient(${radius}px ${radius}px at ${cx}px ${cy}px, rgba(${accent}, ${0.1 * revealOpacity}) 0%, rgba(${color}, ${0.06 * revealOpacity}) 30%, transparent 65%)`;
      grid.style.maskImage = `radial-gradient(${radius * 1.1}px ${radius * 1.1}px at ${cx}px ${cy}px, #000 0%, transparent 70%)`;
      grid.style.webkitMaskImage = grid.style.maskImage;
      grid.style.opacity = String(revealOpacity);

      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, color, accent, radius]);

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
            "radial-gradient(ellipse 60% 60% at 50% 40%, rgba(200,210,230,0.05) 0%, transparent 70%)",
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
      {/* Fine grid, revealed only where the light falls */}
      <div
        ref={gridRef}
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(to right, rgba(${color},0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(${color},0.5) 1px, transparent 1px)`,
          backgroundSize: `${GRID}px ${GRID}px`,
          opacity: 0,
        }}
      />
      {/* Soft accent glow following the cursor */}
      <div ref={glowRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
