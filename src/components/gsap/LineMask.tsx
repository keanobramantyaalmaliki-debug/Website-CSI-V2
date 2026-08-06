"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, CSI_EASE } from "@/lib/gsap/register";

/** T1 (GSAP variant) — clip-mask heading reveal. Wrap text inside a heading/p element. */
export default function LineMask({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const outerRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(innerRef.current, {
          y: "110%",
          duration: 0.8,
          ease: CSI_EASE,
          delay,
          scrollTrigger: {
            trigger: outerRef.current,
            start: "top bottom-=60",
            once: true,
          },
        });
      });
    },
    { scope: outerRef, dependencies: [delay] },
  );

  return (
    <span ref={outerRef} className="block overflow-hidden">
      <span ref={innerRef} className="block">
        {children}
      </span>
    </span>
  );
}
