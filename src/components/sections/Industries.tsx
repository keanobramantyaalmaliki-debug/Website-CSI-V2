"use client";

import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import Marquee from "@/components/motion/Marquee";
import { EASE } from "@/lib/motion/tokens";

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
  return (
    <section id="industries" className="relative z-10 border-y border-white/[0.08] bg-white/[0.02]">
      <div className="px-6 py-24 sm:px-10 sm:py-32">
        {/* T6 — eyebrow */}
        <motion.p
          className="text-xs tracking-widest text-zinc-400 uppercase"
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          Industries
        </motion.p>

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
