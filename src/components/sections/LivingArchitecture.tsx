"use client";

import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import ArchitectureGrid from "@/components/motion/ArchitectureGrid";
import { ARCHITECTURE_NODES } from "@/data/architectureNodes";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function LivingArchitecture() {
  return (
    <section
      id="living-architecture"
      className="relative z-10 overflow-x-clip border-y border-white/[0.08] bg-white/[0.02]"
    >
      <div className="px-6 py-24 sm:px-10 sm:py-32">
        <div className="max-w-2xl">
          <motion.p
            className="text-xs tracking-widest text-zinc-400 uppercase"
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            Living Architecture
          </motion.p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
            <LineMask>A Living Architecture for Decisions.</LineMask>
          </h2>

          <motion.p
            className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
          >
            Signals, context, and knowledge — adaptive systems that move organizations from awareness
            to action.
          </motion.p>
        </div>

        <div className="mt-14">
          <ArchitectureGrid nodes={ARCHITECTURE_NODES} />
        </div>

        <p className="mt-12 text-xs tracking-widest text-zinc-400 uppercase">
          Signal Complete&nbsp;<span className="text-orange-500">→</span>&nbsp;From awareness to
          action.
        </p>
      </div>
    </section>
  );
}
