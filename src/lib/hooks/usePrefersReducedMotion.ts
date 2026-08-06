import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * GSAP-track replacement for motion's useReducedMotion. Use this only where
 * React must render different markup (Marquee -> static grid, etc). For
 * tween behavior, use gsap.matchMedia() inside useGSAP instead — it reverts
 * automatically when the preference changes, which this hook does not.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
