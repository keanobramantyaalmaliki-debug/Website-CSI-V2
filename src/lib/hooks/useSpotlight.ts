import { useRef } from "react";
import { useMotionValue, useMotionTemplate, type MotionValue } from "motion/react";

/**
 * Mouse-tracked radial-gradient spotlight, extracted from the original
 * inline implementation in DeploymentRow.tsx. `reduced` disables tracking
 * entirely (INVARIANTS §6 pairs with this: spotlight is decorative-only,
 * never the sole way to reveal content).
 */
export function useSpotlight(reduced: boolean) {
  const ref = useRef<HTMLElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const background = useMotionTemplate`radial-gradient(280px circle at ${mouseX}px ${mouseY}px, rgba(63,63,70,0.22) 0%, transparent 80%)`;

  function onMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - r.left);
    mouseY.set(e.clientY - r.top);
  }

  return { ref, background: background as MotionValue<string>, onMouseMove };
}
