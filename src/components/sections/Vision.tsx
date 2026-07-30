"use client";

import { useState } from "react";
import { motion } from "motion/react";
import ScrollHighlight from "@/components/motion/ScrollHighlight";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import NetworkField from "@/components/motion/backgrounds/NetworkField";
import AuroraField from "@/components/motion/backgrounds/AuroraField";
import SpotlightField from "@/components/motion/backgrounds/SpotlightField";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// PROTOTYPE-ONLY: lets us compare the 3 background directions live in Vision.
// Removed once a direction is chosen. (2026-07-30)
type Proto = "network" | "aurora" | "spotlight";
const PROTOS: { id: Proto; label: string }[] = [
  { id: "network", label: "1 · Network" },
  { id: "aurora", label: "2 · Aurora" },
  { id: "spotlight", label: "3 · Spotlight" },
];

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
  const [proto, setProto] = useState<Proto>("network");

  return (
    <section id="vision" className="relative overflow-hidden px-6 py-24 sm:px-10 sm:py-32">
      {/* PROTOTYPE background — one of three directions, switchable below. */}
      {proto === "network" && <NetworkField className="-z-0" />}
      {proto === "aurora" && <AuroraField className="-z-0" />}
      {proto === "spotlight" && <SpotlightField className="-z-0" />}

      {/* PROTOTYPE switcher — floating chips, top-right. Remove after decision. */}
      <div className="absolute right-4 top-4 z-20 flex gap-1.5">
        {PROTOS.map((p) => (
          <button
            key={p.id}
            onClick={() => setProto(p.id)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              proto === p.id
                ? "border-accent/60 bg-accent/15 text-zinc-100"
                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="relative z-10">
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
      </div>
    </section>
  );
}
