"use client";

import { motion } from "motion/react";
import LineMask, { LINE_STAGGER } from "@/components/motion/LineMask";
import { EASE } from "@/lib/motion/tokens";

const STATS = [
  { value: "8+", label: "Years in Operation" },
  { value: "50+", label: "Projects Delivered" },
  { value: "4", label: "Industry Sectors" },
];

export default function MeetingLead() {
  return (
    <section
      id="meeting-lead"
      className="relative z-10 border-b border-white/[0.06] px-6 py-20 sm:px-10 sm:py-28"
    >
      <div className="grid gap-12 lg:grid-cols-[1fr_auto]">
        {/* Left — heading */}
        <div className="max-w-2xl">
          <motion.p
            className="text-xs tracking-widest text-zinc-400 uppercase"
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            Meeting Room · The Work
          </motion.p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100 sm:text-5xl">
            {/* Patahannya dirancang, bukan hasil pembungkusan — makanya dua
                LineMask. Jaraknya memakai irama yang sama dengan heading yang
                patah sendiri. */}
            <LineMask>From Public Sector</LineMask>
            <LineMask delay={LINE_STAGGER}>to Enterprise.</LineMask>
          </h2>

          <motion.p
            className="mt-6 max-w-lg text-sm leading-relaxed text-zinc-400"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
          >
            Every project is an answer to a real problem — not a demo,
            not a prototype. Here is the work already running in the field,
            from citizen service portals to enterprise cloud infrastructure.
          </motion.p>
        </div>

        {/* Right — stats */}
        <motion.div
          className="flex flex-row gap-8 self-end lg:flex-col lg:gap-6 lg:text-right"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
        >
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="font-mono text-2xl font-semibold text-zinc-100 sm:text-3xl">
                {s.value}
              </p>
              <p className="mt-0.5 text-xs tracking-wider text-zinc-500 uppercase">
                {s.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
