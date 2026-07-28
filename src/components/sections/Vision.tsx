"use client";

import { motion } from "motion/react";
import ScrollHighlight from "@/components/motion/ScrollHighlight";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const MISSIONS = [
  "Deliver innovative and high-quality software solutions.",
  "Accelerate digital transformation through intelligent technologies.",
  "Integrate Artificial Intelligence into practical business applications.",
  "Build long-term partnerships based on trust, collaboration, and excellence.",
  "Continuously innovate to help organizations thrive in the digital era.",
];

const VISION =
  "To become a trusted technology partner that empowers organizations through intelligent digital innovation — creating sustainable value for businesses and communities worldwide.";

export default function Vision() {
  return (
    <section id="vision" className="px-6 py-24 sm:px-10 sm:py-32">
      {/* T6 — eyebrow */}
      <motion.p
        className="text-xs tracking-widest text-zinc-400 uppercase"
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        Our Vision
      </motion.p>

      {/* T3 — scroll word-highlight (bookend with Manifesto) */}
      <ScrollHighlight
        text={VISION}
        className="mt-3 max-w-2xl text-2xl font-semibold leading-snug tracking-tight sm:text-3xl"
      />

      {/* T6 — mission eyebrow */}
      <motion.p
        className="mt-16 text-xs tracking-widest text-zinc-400 uppercase"
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        Our Mission
      </motion.p>

      {/* T2 — stagger missions */}
      <FadeUpList tag="ol" className="mt-6 space-y-4">
        {MISSIONS.map((m, i) => (
          <FadeUpItem key={m} tag="li" className="flex gap-4 border-b border-zinc-900 pb-4">
            <span className="text-sm text-zinc-600 tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="text-sm leading-relaxed text-zinc-300 sm:text-base">{m}</p>
          </FadeUpItem>
        ))}
      </FadeUpList>
    </section>
  );
}
