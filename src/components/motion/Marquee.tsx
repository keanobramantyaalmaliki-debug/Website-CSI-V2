"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap/register";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

/**
 * T5 — infinite horizontal marquee strip.
 * Items are duplicated to create a seamless loop (x: 0 → -50% → loop).
 */
export default function Marquee({
  items,
  speed = 25,
}: {
  items: string[];
  speed?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const duration = items.length * speed;

  useGSAP(
    () => {
      if (!trackRef.current) return;
      // Paused by default and toggled by ScrollTrigger — without this the
      // tween ticks forever from mount, even while the strip is nowhere near
      // the viewport (e.g. still on Hero).
      const tween = gsap.to(trackRef.current, {
        xPercent: -50,
        duration,
        ease: "none",
        repeat: -1,
        paused: true,
      });
      ScrollTrigger.create({
        trigger: trackRef.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (self.isActive ? tween.play() : tween.pause()),
      });
    },
    { scope: trackRef, dependencies: [duration] },
  );

  if (reduced) {
    return (
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200"
          >
            {item}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div ref={trackRef} className="flex w-max gap-6">
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className="whitespace-nowrap rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
