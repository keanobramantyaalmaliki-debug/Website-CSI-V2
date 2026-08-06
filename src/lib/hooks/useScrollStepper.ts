import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scrollytelling stepper — tracks which of `count` step elements sits in a
 * thin band at the vertical center of the viewport, via IntersectionObserver
 * (no useScroll/scrollYProgress math, per the Phase 2 decision to keep
 * scroll-progress plumbing out of this codebase). Consumers ref each step
 * with `setRef(index)`; `activeIndex` follows whichever step is centered.
 */
export function useScrollStepper(count: number) {
  const [activeIndex, setActiveIndex] = useState(0);
  const elementsRef = useRef<(HTMLElement | null)[]>([]);
  const intersecting = useRef<Set<number>>(new Set());

  const setRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      elementsRef.current[index] = el;
    },
    [],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = elementsRef.current.indexOf(entry.target as HTMLElement);
          if (index === -1) continue;
          if (entry.isIntersecting) {
            intersecting.current.add(index);
          } else {
            intersecting.current.delete(index);
          }
        }
        if (intersecting.current.size > 0) {
          setActiveIndex(Math.min(...intersecting.current));
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    for (const el of elementsRef.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [count]);

  return { activeIndex, setRef };
}
