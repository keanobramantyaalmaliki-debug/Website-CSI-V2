"use client";

import { useReducedMotion } from "motion/react";

/**
 * Ambient aurora — soft accent-tinted light pools drifting slowly behind
 * content. Unlike a grain veil (which raises the whole section's mean
 * brightness into a flat gray on a near-black theme), aurora adds warm light
 * only where the radial gradients pool and fades to fully transparent
 * elsewhere, so the base #14161b stays truly dark. Distinct from Hero's static
 * glow and Vision's cursor constellation: this is slow autonomous motion.
 *
 * Non-interactive + aria-hidden. Reduced-motion: drift stops, pools stay put.
 */
export default function Aurora({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      <div
        className={reduced ? undefined : "aurora-blob aurora-blob-1"}
        style={{
          position: "absolute",
          top: "-10%",
          left: "-5%",
          width: "42%",
          height: "50%",
          background:
            "radial-gradient(circle, var(--accent-soft) 0%, transparent 65%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className={reduced ? undefined : "aurora-blob aurora-blob-2"}
        style={{
          position: "absolute",
          bottom: "-15%",
          right: "-5%",
          width: "38%",
          height: "48%",
          background:
            "radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />
    </div>
  );
}
