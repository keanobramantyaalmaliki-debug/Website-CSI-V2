"use client";

import { motion } from "motion/react";
import ScrollHighlight from "@/components/motion/ScrollHighlight";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const MISSIONS: { verb: string; detail: string }[] = [
  {
    verb: "Deliver",
    detail: "Innovative and high-quality software solutions.",
  },
  {
    verb: "Accelerate",
    detail: "Digital transformation through intelligent technologies.",
  },
  {
    verb: "Integrate",
    detail: "Artificial Intelligence into practical business applications.",
  },
  {
    verb: "Partner",
    detail: "Long-term relationships built on trust, collaboration, and excellence.",
  },
  {
    verb: "Innovate",
    detail: "Continuously help organizations thrive in the digital era.",
  },
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

      {/* T3 — scroll word-highlight bookend */}
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

      {/* 5 mission verbs — verb + detail on one row, always visible (comfort) */}
      <FadeUpList tag="ol" className="mt-6 border-t border-white/[0.08]">
        {MISSIONS.map((m, i) => (
          <FadeUpItem key={m.verb} tag="li" className="border-b border-white/[0.08]">
            <div className="grid grid-cols-[2rem_1fr] items-baseline gap-5 py-5 sm:grid-cols-[2rem_10rem_1fr]">
              <span className="text-xs tabular-nums text-zinc-400">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-lg font-medium text-zinc-100">{m.verb}</span>
              <p className="col-span-2 text-sm leading-relaxed text-zinc-400 sm:col-span-1">
                {m.detail}
              </p>
            </div>
          </FadeUpItem>
        ))}
      </FadeUpList>
    </section>
  );
}
