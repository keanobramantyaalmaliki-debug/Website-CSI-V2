"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "motion/react";
import LineMask from "@/components/motion/LineMask";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const STEPS: { num: string; title: string }[] = [
  { num: "01", title: "Discovery" },
  { num: "02", title: "Strategy & Planning" },
  { num: "03", title: "Design" },
  { num: "04", title: "Development" },
  { num: "05", title: "Testing & QA" },
  { num: "06", title: "Deployment & Support" },
];

export default function Process() {
  const reduced = useReducedMotion();

  return (
    <section id="process" className="px-6 py-24 sm:px-10 sm:py-32">
      {/* T6 — eyebrow */}
      <motion.p
        className="text-xs tracking-widest text-zinc-400 uppercase"
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        Our Process
      </motion.p>

      {/* T1 — line-mask heading */}
      <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
        <LineMask>How We Work</LineMask>
      </h2>

      {/* Horizontal numbered flow — vertical list on mobile, arrow-connected on desktop */}
      <ol className="mt-12 flex flex-col border-t border-white/[0.08] sm:flex-row sm:items-start sm:border-0 sm:gap-3">
        {STEPS.map((step, i) => (
          <Fragment key={step.num}>
            <motion.li
              className="flex items-center gap-4 border-b border-white/[0.08] py-5 last:border-0 sm:flex-1 sm:flex-col sm:items-start sm:border-0 sm:py-0 sm:gap-1.5"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.07, ease: EASE }}
            >
              <span className="shrink-0 text-xs tabular-nums text-zinc-400 sm:mb-0.5">
                {step.num}
              </span>
              <h3 className="text-sm font-medium text-zinc-300">{step.title}</h3>
            </motion.li>
            {i < STEPS.length - 1 && (
              <span
                className="hidden sm:flex sm:items-start sm:pt-0.5 shrink-0 select-none text-zinc-600"
                aria-hidden="true"
              >
                →
              </span>
            )}
          </Fragment>
        ))}
      </ol>
    </section>
  );
}
