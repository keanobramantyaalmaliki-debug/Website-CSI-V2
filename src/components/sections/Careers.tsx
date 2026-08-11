"use client";

import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import CareersRoleCard from "./CareersRoleCard";
import HiringStack from "./HiringStack";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const ROLES: { title: string; type: string; mode: string; tag: string }[] = [
  { title: "Innovation & Growth Manager", type: "Full-time", mode: "Remote",  tag: "Growth" },
  { title: "Technical Lead",              type: "Full-time", mode: "Hybrid",  tag: "Engineering" },
  { title: "Product Builder",             type: "Full-time", mode: "Remote",  tag: "Product" },
  { title: "Full Stack Engineer",         type: "Full-time", mode: "Hybrid",  tag: "Engineering" },
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

      {/* T7 — role cards with spotlight hover / idle-glow on mobile */}
      <FadeUpList className="mt-12 grid gap-4 sm:grid-cols-2">
        {ROLES.map((role, i) => (
          <FadeUpItem key={role.title} tag="div">
            <CareersRoleCard role={role} index={i} />
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
          How We Works
        </motion.p>
        <HiringStack />
      </div>
    </section>
  );
}
