"use client";

import { Link } from "react-router-dom";
import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Office deep-dive pillars — reorganized from the 9-item SERVICES list in
 * Services.tsx (Lounge accordion) into 5 thematic pillars, each rewritten
 * with fresh copy so the two pages don't read as duplicates.
 */
const PILLARS: { num: string; title: string; desc: string }[] = [
  {
    num: "01",
    title: "Custom Software & Platforms",
    desc: "From first workflow diagram to production rollout, we build software platforms that carry your operations — not just your requirements list.",
  },
  {
    num: "02",
    title: "Web & Mobile Experiences",
    desc: "From first tap to daily habit, we craft web and mobile experiences that keep people coming back, on whatever device they reach for.",
  },
  {
    num: "03",
    title: "Artificial Intelligence Solutions",
    desc: "From raw data to daily decisions, we embed AI that turns information into action — knowledge assistants, process automation, and analytics built around how your team already works.",
  },
  {
    num: "04",
    title: "Systems & Cloud Infrastructure",
    desc: "From siloed tools to a single source of truth, we connect systems and cloud infrastructure so your organization runs as one, not as a dozen disconnected parts.",
  },
  {
    num: "05",
    title: "Ongoing Partnership",
    desc: "From launch day onward, we stay close — maintaining, monitoring, and evolving what we build so it keeps working as your organization grows.",
  },
];

export default function Office() {
  return (
    <section id="office-services" className="relative z-10 px-6 py-24 sm:px-10 sm:py-32">
      {/* T6 — eyebrow */}
      <motion.p
        className="text-xs tracking-widest text-zinc-400 uppercase"
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        Office
      </motion.p>

      {/* T1 — line-mask heading */}
      <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-5xl">
        <LineMask>Where Software Becomes Intelligence.</LineMask>
      </h2>

      {/* Overview — [what we build] + [impact on audience] + [who we serve, X to Y] */}
      <motion.p
        className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
      >
        We build the software platforms, AI systems, and cloud infrastructure
        that turn scattered operations into decisions your team can act on
        immediately. From government agencies modernizing public services to
        enterprises running complex, multi-site operations across Indonesia
        and beyond, our clients trust us with the systems their work actually
        depends on.
      </motion.p>

      {/* Pillar grid — large cards with breathing room, distinct from the
          Lounge accordion's dense single-column list. */}
      <FadeUpList
        tag="ul"
        className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-3"
      >
        {PILLARS.map((p) => (
          <FadeUpItem
            key={p.num}
            tag="li"
            className="flex flex-col gap-4 bg-background p-8"
          >
            <span
              className="text-4xl font-bold tabular-nums leading-none text-zinc-600 sm:text-5xl"
              aria-hidden="true"
            >
              {p.num}
            </span>
            <h3 className="text-lg font-medium text-zinc-100">{p.title}</h3>
            <p className="text-sm leading-relaxed text-zinc-400">{p.desc}</p>
          </FadeUpItem>
        ))}
      </FadeUpList>

      {/* Testimonial — structural placeholder mirroring basement.studio's single
          client-quote section. No real client quote exists yet, so this is a
          dashed-border stand-in rather than fabricated social proof.
          TODO(content): replace with an actual client quote + name/role/company. */}
      <motion.blockquote
        className="mt-16 rounded-2xl border border-dashed border-white/15 p-8 sm:p-10"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
      >
        <p className="max-w-xl text-lg leading-relaxed text-zinc-500 italic sm:text-xl">
          “Client testimonial — pending.”
        </p>
        <footer className="mt-4 text-sm text-zinc-600">
          Name, role — Company (placeholder, awaiting real quote)
        </footer>
      </motion.blockquote>

      {/* Recognition strip — structural placeholder mirroring basement.studio's
          awards strip. No verified award history exists yet, so no badge count
          or award names are invented here.
          TODO(content): replace with real award/recognition list, if any. */}
      <motion.div
        className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-white/15 p-8 sm:p-10"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
      >
        <p className="text-sm text-zinc-600">
          Recognition &amp; awards — pending (placeholder)
        </p>
      </motion.div>

      {/* CTA — links back to Contact in Lounge (only room where #contact exists) */}
      <motion.div
        className="mt-16 flex flex-wrap items-center gap-4"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.25 }}
      >
        <Link
          to="/#contact"
          className="group relative inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
        >
          Talk to us
          <span className="grid h-5 w-5 place-items-center rounded-full bg-zinc-900/10 text-zinc-900 transition-transform duration-200 group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </motion.div>
    </section>
  );
}
