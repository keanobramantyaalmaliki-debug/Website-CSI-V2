"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import CsiParticleField from "@/components/motion/CsiParticleField";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const HEADING_LINES = [
  ["Think", "Beyond", "Software."],
  ["Build", "Intelligence."],
];

export default function CsiHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: false, margin: "-10% 0px -10% 0px" });

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

          <motion.p
            className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-400 sm:text-xl"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
          >
            We turn scattered systems into intelligence your organization can
            act on — every day, every decision.
          </motion.p>
        </div>

        <aside className="relative mt-8 lg:mt-0">
          <div className="h-56 lg:h-[20rem]">
            <CsiParticleField active={inView} />
          </div>
        </aside>
      </div>
    </section>
  );
}
