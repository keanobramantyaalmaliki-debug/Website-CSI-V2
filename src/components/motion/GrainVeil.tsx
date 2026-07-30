"use client";

import { useReducedMotion } from "motion/react";

/**
 * Ambient grain/dither veil — a faint, slowly-drifting film grain behind
 * content. Nods to izanami's dither-dissolve texture, but static-by-nature:
 * NOT cursor-driven (distinct from Vision's NetworkField halo and Hero's
 * cursor glow) and needs no WebGL canvas — pure SVG fractal noise, GPU-cheap.
 *
 * Non-interactive (pointer-events-none) and aria-hidden. Under reduced-motion
 * the drift animation is dropped; a still grain remains (no motion, still calm).
 */
export default function GrainVeil({
  className,
  opacity = 0.04,
}: {
  className?: string;
  opacity?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      {/* Oversized so the drift never exposes an edge. */}
      <div
        className={reduced ? undefined : "grain-veil-drift"}
        style={{
          position: "absolute",
          inset: "-25%",
          opacity,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          mixBlendMode: "overlay",
          willChange: reduced ? undefined : "transform",
        }}
      />
    </div>
  );
}
