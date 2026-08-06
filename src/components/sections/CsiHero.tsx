"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, CSI_EASE, ScrollTrigger } from "@/lib/gsap/register";
import CsiParticleField from "@/components/motion/CsiParticleField";
import { FadeUpList, FadeUpItem } from "@/components/gsap/FadeUp";

const HEADING_LINES = [
  ["Think", "Beyond", "Software."],
  ["Build", "Intelligence."],
];

export default function CsiHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const [active, setActive] = useState(false);

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top bottom-=10%",
        end: "bottom top+=10%",
        onToggle: (self) => setActive(self.isActive),
      });

      gsap.from(paragraphRef.current, {
        opacity: 0,
        y: 8,
        duration: 0.5,
        ease: CSI_EASE,
        delay: 0.15,
        scrollTrigger: { trigger: paragraphRef.current, start: "top bottom", once: true },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      id="csi"
      ref={sectionRef}
      className="relative overflow-hidden bg-background px-6 py-16 sm:px-10 sm:py-20"
    >
      <div className="relative z-10 lg:grid lg:grid-cols-2 lg:gap-12">
        <div>
          <FadeUpList tag="div">
            <h2 className="text-5xl font-semibold tracking-tight text-zinc-100 sm:text-7xl lg:text-8xl">
              {HEADING_LINES.map((line, lineIdx) => (
                <span key={lineIdx} className="block">
                  {line.map((word) => (
                    <FadeUpItem key={word} tag="div" className="mr-[0.2em] inline-block last:mr-0">
                      {word}
                    </FadeUpItem>
                  ))}
                </span>
              ))}
            </h2>
          </FadeUpList>

          <p
            ref={paragraphRef}
            className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-400 sm:text-xl"
          >
            We turn scattered systems into intelligence your organization can
            act on — every day, every decision.
          </p>
        </div>

        <aside className="relative mt-8 lg:mt-0">
          <div className="h-56 lg:h-[20rem]">
            <CsiParticleField active={active} />
          </div>
        </aside>
      </div>
    </section>
  );
}
