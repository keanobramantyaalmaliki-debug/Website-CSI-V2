"use client";

import { useRef } from "react";
import { gsap, useGSAP, CSI_EASE } from "@/lib/gsap/register";
import LineMask from "@/components/gsap/LineMask";
import Marquee from "@/components/motion/Marquee";

const INDUSTRIES = [
  "Government & Public Sector",
  "Smart Cities",
  "Digital Villages",
  "Healthcare",
  "Education",
  "Finance",
  "Hospitality",
  "Retail & E-Commerce",
  "Manufacturing",
  "Logistics",
  "Property & Real Estate",
  "Professional Services",
  "Startups & Enterprises",
];

export default function Industries() {
  const sectionRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      gsap.from(eyebrowRef.current, {
        opacity: 0,
        x: -8,
        duration: 0.5,
        ease: CSI_EASE,
        scrollTrigger: {
          trigger: eyebrowRef.current,
          start: "top bottom",
          once: true,
        },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="industries"
      className="relative z-10 border-y border-white/[0.08] bg-white/[0.02]"
    >
      <div className="px-6 py-24 sm:px-10 sm:py-32">
        {/* T6 — eyebrow */}
        <p
          ref={eyebrowRef}
          className="text-xs tracking-widest text-zinc-400 uppercase"
        >
          Industries
        </p>

        {/* T1 — line-mask heading */}
        <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
          <LineMask>Built Across Sectors</LineMask>
        </h2>
      </div>

      {/* T5 — marquee strip (outside padded container for full-bleed) */}
      <div className="pb-24 sm:pb-32">
        <Marquee items={INDUSTRIES} speed={30} />
      </div>
    </section>
  );
}
