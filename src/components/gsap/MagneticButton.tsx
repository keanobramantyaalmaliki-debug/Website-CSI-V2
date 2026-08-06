"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import { gsap, useGSAP } from "@/lib/gsap/register";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

export default function MagneticButton({
  children,
  strength = 0.4,
  maxDistance = 14,
}: {
  children: ReactNode;
  strength?: number;
  maxDistance?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const quickX = useRef<gsap.QuickToFunc | null>(null);
  const quickY = useRef<gsap.QuickToFunc | null>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      quickX.current = gsap.quickTo(ref.current, "x", {
        duration: 0.4,
        ease: "power3.out",
      });
      quickY.current = gsap.quickTo(ref.current, "y", {
        duration: 0.4,
        ease: "power3.out",
      });
    },
    { scope: ref },
  );

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
    quickX.current?.(x);
    quickY.current?.(y);
  }

  function handleMouseLeave() {
    quickX.current?.(0);
    quickY.current?.(0);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="inline-block"
    >
      {children}
    </div>
  );
}
