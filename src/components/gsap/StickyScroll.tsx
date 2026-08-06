"use client";

import { useRef } from "react";
import { gsap, useGSAP, CSI_EASE } from "@/lib/gsap/register";
import { cn } from "@/lib/utils";

/**
 * GSAP variant of the shared StickyScroll (see
 * src/components/ui/sticky-scroll-reveal.tsx for the motion original and
 * its rationale). Same external contract: activeIndex-controlled crossfade,
 * purely decorative (aria-hidden).
 */
export function StickyScroll({
  activeIndex,
  panels,
  className,
}: {
  activeIndex: number;
  panels: { content: React.ReactNode }[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mounted = useRef(false);

  useGSAP(
    () => {
      const isFirstRun = !mounted.current;
      mounted.current = true;

      panelRefs.current.forEach((el, index) => {
        if (!el) return;
        const state = {
          opacity: activeIndex === index ? 1 : 0,
          scale: activeIndex === index ? 1 : 1.03,
        };
        if (isFirstRun) {
          gsap.set(el, state);
        } else {
          gsap.to(el, { ...state, duration: 0.35, ease: CSI_EASE });
        }
      });
    },
    { scope: containerRef, dependencies: [activeIndex] },
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "sticky top-32 hidden h-72 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] lg:block",
        className,
      )}
      aria-hidden="true"
    >
      {panels.map((panel, index) => (
        <div
          key={index}
          ref={(el) => {
            panelRefs.current[index] = el;
          }}
          className="absolute inset-0"
        >
          {panel.content}
        </div>
      ))}
    </div>
  );
}
