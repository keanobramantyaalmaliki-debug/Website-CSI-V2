"use client";

import { motion } from "motion/react";
import ScrollHighlight from "@/components/motion/ScrollHighlight";
import Disclosure from "@/components/motion/Disclosure";
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

      {/* 5 verb labels — stagger entrance, detail behind Disclosure */}
      <FadeUpList tag="ol" className="mt-6 border-t border-zinc-900">
        {MISSIONS.map((m, i) => (
          <FadeUpItem key={m.verb} tag="li">
            <Disclosure
              className="border-b border-zinc-900"
              triggerClassName="group flex w-full items-center gap-5 py-5 text-left"
              contentClassName="pb-5 pl-14"
              trigger={(open) => (
                <>
                  <span className="w-8 shrink-0 text-xs tabular-nums text-zinc-600">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-lg font-medium text-zinc-300 transition-colors duration-200 group-hover:text-zinc-100">
                    {m.verb}
                  </span>
                  <span
                    className={`shrink-0 text-sm text-zinc-600 transition-transform duration-200 group-hover:text-zinc-400 ${open ? "rotate-45" : "rotate-0"}`}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </>
              )}
            >
              <p className="text-sm leading-relaxed text-zinc-500">{m.detail}</p>
            </Disclosure>
          </FadeUpItem>
        ))}
      </FadeUpList>
    </section>
  );
}
