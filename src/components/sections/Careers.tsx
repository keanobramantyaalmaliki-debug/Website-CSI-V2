"use client";

import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const ROLES: { title: string; type: string; mode: string; tag: string }[] = [
  { title: "Innovation & Growth Manager", type: "Full-time", mode: "Remote",  tag: "Growth" },
  { title: "Technical Lead",              type: "Full-time", mode: "Hybrid",  tag: "Engineering" },
  { title: "Product Builder",             type: "Full-time", mode: "Remote",  tag: "Product" },
  { title: "Full Stack Engineer",         type: "Full-time", mode: "Hybrid",  tag: "Engineering" },
];

const HIRING_STAGES = [
  "Application",
  "Conversation",
  "Practical Challenge",
  "Final Interview",
  "Welcome Aboard",
];

export default function Careers() {
  return (
    <section id="careers" className="px-6 py-24 sm:px-10 sm:py-32">
      {/* T6 — eyebrow */}
      <motion.p
        className="text-xs tracking-widest text-zinc-400 uppercase"
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        Careers
      </motion.p>

      {/* T1 — line-mask heading */}
      <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
        <LineMask>Build What Comes Next.</LineMask>
      </h2>

      {/* T7 — role rows with hover underline wipe */}
      <FadeUpList className="mt-12 divide-y divide-zinc-900 border-y border-zinc-900">
        {ROLES.map((role) => (
          <FadeUpItem
            key={role.title}
            tag="article"
            className="group grid gap-2 py-6 sm:grid-cols-[1fr_auto] sm:gap-6"
          >
            <div>
              {/* T7 — underline wipe on hover */}
              <h3 className="relative w-fit font-medium text-zinc-100 after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-zinc-100 after:transition-[width] after:duration-300 after:content-[''] group-hover:after:w-full">
                {role.title}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                {role.type} · {role.mode}
              </p>
            </div>
            <span className="self-center rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
              {role.tag}
            </span>
          </FadeUpItem>
        ))}
      </FadeUpList>

      {/* T2 — hiring stages stagger */}
      <div className="mt-12">
        <motion.p
          className="text-xs tracking-widest text-zinc-400 uppercase"
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          How We Hire
        </motion.p>
        <FadeUpList tag="ol" className="mt-6 flex flex-wrap items-center gap-3">
          {HIRING_STAGES.map((stage, i) => (
            <FadeUpItem key={stage} tag="li" className="flex items-center gap-3">
              <span className="text-sm text-zinc-300">{stage}</span>
              {i < HIRING_STAGES.length - 1 && (
                <span className="text-orange-500">→</span>
              )}
            </FadeUpItem>
          ))}
        </FadeUpList>
      </div>
    </section>
  );
}
