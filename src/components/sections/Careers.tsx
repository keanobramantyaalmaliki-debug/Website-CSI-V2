"use client";

import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import CareersPromote, { type CareerRole } from "./CareersPromote";
import HiringStack from "./HiringStack";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Shared hiring inbox; each role routes via the subject line. Swap the copy
// (blurb / this address) freely — it is content, not configuration.
const APPLY_EMAIL = "hello@cogniti.id";

// TODO(careers): blurbs are placeholder copy — replace with the real role
// descriptions from the hiring team before this ships publicly.
const RAW_ROLES: Omit<CareerRole, "applyHref">[] = [
  {
    title: "Innovation & Growth Manager",
    type: "Full-time",
    mode: "Remote",
    tag: "Growth",
    blurb:
      "Own how we find, test, and scale new bets — turning rough ideas into repeatable growth loops.",
  },
  {
    title: "Technical Lead",
    type: "Full-time",
    mode: "Hybrid",
    tag: "Engineering",
    blurb:
      "Set the technical direction, mentor the team, and keep our architecture honest as we grow.",
  },
  {
    title: "Product Builder",
    type: "Full-time",
    mode: "Remote",
    tag: "Product",
    blurb:
      "Take products from a fuzzy problem to a shipped, loved experience — end to end, hands on.",
  },
  {
    title: "Full Stack Engineer",
    type: "Full-time",
    mode: "Hybrid",
    tag: "Engineering",
    blurb:
      "Build across the stack on real features that reach users fast, with room to go deep where it counts.",
  },
];

const ROLES: CareerRole[] = RAW_ROLES.map((role) => ({
  ...role,
  applyHref: `mailto:${APPLY_EMAIL}?subject=${encodeURIComponent(
    `Application — ${role.title}`,
  )}`,
}));

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

      {/* Shared-element promote: one hero role + a strip of the rest. */}
      <CareersPromote roles={ROLES} />

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
