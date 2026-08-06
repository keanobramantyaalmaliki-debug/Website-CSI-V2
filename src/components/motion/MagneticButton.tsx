"use client";

import { useReducedMotion, motion } from "motion/react";
import { useRef, useState, type ReactNode, type MouseEvent } from "react";

export default function MagneticButton({
  children,
  strength = 0.4,
  maxDistance = 14,
}: {
  children: ReactNode;
  strength?: number;
  maxDistance?: number;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  if (reduced) return <>{children}</>;

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const { width, height, left, top } = ref.current.getBoundingClientRect();
    let x = (e.clientX - (left + width / 2)) * strength;
    let y = (e.clientY - (top + height / 2)) * strength;

    const distance = Math.hypot(x, y);
    if (distance > maxDistance) {
      const scale = maxDistance / distance;
      x *= scale;
      y *= scale;
    }
    setPosition({ x, y });
  }

  function handleMouseLeave() {
    setPosition({ x: 0, y: 0 });
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 25, mass: 0.1 }}
      className="inline-block"
    >
      {children}
    </motion.div>
  );
}
