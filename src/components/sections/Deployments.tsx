"use client";

import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const DEPLOYMENTS = [
  {
    num: "01",
    sector: "Public Services",
    region: "Indonesia",
    desc: "Digital transformation initiatives for citizen engagement, operational visibility, and service coordination.",
  },
  {
    num: "02",
    sector: "Infrastructure",
    region: "Indonesia",
    desc: "Integrated monitoring environments connecting assets, operations, and situational awareness.",
  },
  {
    num: "03",
    sector: "Logistics",
    region: "International",
    desc: "Operational intelligence deployments supporting visibility, workflow optimization, and decision support.",
  },
  {
    num: "04",
    sector: "Hospitality",
    region: "Southeast Asia",
    desc: "Intelligence-driven engagement frameworks for modern guest experiences.",
  },
  {
    num: "05",
    sector: "Communities",
    region: "Indonesia",
    desc: "Connected environments that improve communication, participation, and collective action.",
  },
];

export default function Deployments() {
  return (
    <section id="deployments" className="px-6 py-24 sm:px-10 sm:py-32">
      {/* T6 — eyebrow */}
      <motion.p
        className="text-xs tracking-widest text-zinc-400 uppercase"
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        Deployments
      </motion.p>

      {/* T1 — line-mask heading */}
      <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
        <LineMask>Built for real-world environments where decisions matter.</LineMask>
      </h2>

      {/* T2 — stagger deployment rows */}
      <FadeUpList className="mt-12 divide-y divide-zinc-900 border-y border-zinc-900">
        {DEPLOYMENTS.map((d) => (
          <FadeUpItem
            key={d.num}
            tag="article"
            className="group grid gap-2 py-6 sm:grid-cols-[4rem_1fr_1fr] sm:gap-6"
          >
            <span className="text-sm text-zinc-600 tabular-nums">{d.num}</span>
            <div>
              <h3 className="font-medium text-zinc-100 transition-colors group-hover:text-white">
                {d.sector}
              </h3>
              <p className="mt-1 text-xs text-zinc-600">{d.region}</p>
            </div>
            <p className="text-sm leading-relaxed text-zinc-500">{d.desc}</p>
          </FadeUpItem>
        ))}
      </FadeUpList>
    </section>
  );
}
