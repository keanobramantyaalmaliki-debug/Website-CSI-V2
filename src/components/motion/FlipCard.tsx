"use client";

import { useRef, useState, type ReactNode } from "react";
import { gsap, useGSAP, CSI_EASE } from "@/lib/gsap/register";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

/**
 * 3D flip card, extracted from LivingArchitecture's original NodeCard so
 * DeploymentCard can reuse the same mechanic. Fine-pointer devices flip on
 * hover; coarse-pointer (touch) devices have no hover state, so tap toggles
 * instead (INVARIANTS §6: the flip can't be hover-only). Reduced motion
 * skips the 3D transform and crossfades instead.
 */
export default function FlipCard({
  front,
  back,
  ariaLabel,
  className = "h-48 w-full sm:h-56",
}: {
  front: ReactNode;
  back: ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const coarse = useCoarsePointer();
  const reduced = usePrefersReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reduced) return;
      gsap.to(cardRef.current, {
        rotateY: flipped ? 180 : 0,
        duration: 0.5,
        ease: CSI_EASE,
      });
    },
    { scope: cardRef, dependencies: [flipped, reduced] },
  );

  return (
    <button
      type="button"
      aria-pressed={flipped}
      aria-label={ariaLabel}
      onMouseEnter={coarse ? undefined : () => setFlipped(true)}
      onMouseLeave={coarse ? undefined : () => setFlipped(false)}
      onClick={coarse ? () => setFlipped((v) => !v) : undefined}
      className={`relative text-left [perspective:1000px] ${className}`}
    >
      <div
        ref={cardRef}
        className="relative h-full w-full rounded-2xl [transform-style:preserve-3d]"
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] [backface-visibility:hidden]"
          style={reduced ? { opacity: flipped ? 0 : 1, transition: "opacity 0.2s" } : undefined}
        >
          {front}
        </div>

        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-white/[0.08] [backface-visibility:hidden]"
          style={
            reduced
              ? { opacity: flipped ? 1 : 0, transition: "opacity 0.2s" }
              : { transform: "rotateY(180deg)" }
          }
        >
          {back}
        </div>
      </div>
    </button>
  );
}
