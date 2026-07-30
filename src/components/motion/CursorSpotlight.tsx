"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
} from "motion/react";

/**
 * Ambient glow that follows the cursor inside its bounds — subtle "alive"
 * atmosphere behind content (no WebGL cost). Reuses the pointer pattern from
 * DeploymentRow: motion values driven from onMouseMove, no React re-render.
 *
 * Reduced-motion: no listener, no glow layer — children render untouched.
 */
export default function CursorSpotlight({
  children,
  className,
  radius = 500,
  color = "var(--accent-soft)",
}: {
  children: ReactNode;
  className?: string;
  radius?: number;
  color?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(-1000);
  const y = useMotionValue(-1000);
  const glow = useMotionTemplate`radial-gradient(${radius}px circle at ${x}px ${y}px, ${color} 0%, transparent 70%)`;

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set(e.clientX - r.left);
    y.set(e.clientY - r.top);
  }

  return (
    <div
      ref={ref}
      className={`relative ${className ?? ""}`}
      onMouseMove={reduced ? undefined : onMouseMove}
    >
      {!reduced && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-0"
          style={{ background: glow }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
