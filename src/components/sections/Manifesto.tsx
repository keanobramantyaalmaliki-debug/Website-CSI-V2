"use client";

import { motion } from "motion/react";
import ScrollHighlight from "@/components/motion/ScrollHighlight";

const LINES = [
  "Software connects information. Intelligence connects decisions.",
  "Organizations are drowning in data. Yet struggling to act.",
  "The future belongs not to those who collect, but to those who act.",
  "Intelligence should exist across every interaction. Every workflow. Every decision.",
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Manifesto() {
  return (
    <section id="manifesto" className="px-6 py-24 sm:px-10 sm:py-32">
      {/* T6 — eyebrow slide-in */}
      <motion.p
        className="text-xs tracking-widest text-zinc-400 uppercase"
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        Manifesto
      </motion.p>

      {/* T3 — scroll word-highlight per line */}
      <div className="mt-8 flex flex-col gap-6">
        {LINES.map((line, i) => (
          <ScrollHighlight
            key={i}
            text={line}
            className="max-w-2xl text-xl font-medium leading-snug tracking-tight sm:text-2xl"
          />
        ))}
      </div>
    </section>
  );
}
