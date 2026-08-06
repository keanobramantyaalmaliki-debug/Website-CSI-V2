"use client";

import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";
import { PROCESS_GLYPHS } from "@/components/motion/ProcessGlyphs";
import { useScrollStepper } from "@/lib/hooks/useScrollStepper";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const STEPS: { num: string; kicker: string; title: string; desc: string }[] = [
  {
    num: "01",
    kicker: "UNDERSTAND",
    title: "Discovery",
    desc: "We map your current workflows, pain points, and goals before writing a line of code.",
  },
  {
    num: "02",
    kicker: "PLAN",
    title: "Strategy & Planning",
    desc: "Scope, architecture, and timeline locked in — so the build has a clear target.",
  },
  {
    num: "03",
    kicker: "SHAPE",
    title: "Design",
    desc: "Interfaces and flows prototyped and tested with real users before development starts.",
  },
  {
    num: "04",
    kicker: "BUILD",
    title: "Development",
    desc: "Engineers build in short, reviewable cycles — nothing lands without a second pair of eyes.",
  },
  {
    num: "05",
    kicker: "VERIFY",
    title: "Testing & QA",
    desc: "Automated and manual checks against real-world edge cases, not just the happy path.",
  },
  {
    num: "06",
    kicker: "LAUNCH",
    title: "Deployment & Support",
    desc: "Shipped with monitoring in place, and a team that stays on for what comes after launch.",
  },
];

export default function Process() {
  const { activeIndex, setRef } = useScrollStepper(STEPS.length);

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

      <div className="mt-16 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <FadeUpList tag="div" className="border-t border-white/[0.08]">
          {STEPS.map((step, i) => {
            const Glyph = PROCESS_GLYPHS[i];
            return (
              <FadeUpItem key={step.num} tag="div">
                <div
                  ref={setRef(i)}
                  className="grid gap-4 border-b border-white/[0.08] py-10 sm:grid-cols-[3rem_1fr] sm:py-14"
                >
                  <span className="text-xs tabular-nums text-zinc-500">{step.num}</span>
                  <div>
                    <span className="text-xs tracking-widest text-orange-500 uppercase">
                      {step.kicker}
                    </span>
                    <h3 className="mt-2 text-xl font-medium text-zinc-100 sm:text-2xl">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
                      {step.desc}
                    </p>
                    {/* Mobile/tablet only — desktop shows the same glyph in the
                        sticky panel, synced via scroll position instead. */}
                    <div className="mt-6 h-32 w-32 text-zinc-500 lg:hidden">
                      <Glyph />
                    </div>
                  </div>
                </div>
              </FadeUpItem>
            );
          })}
        </FadeUpList>

        <StickyScroll
          activeIndex={activeIndex}
          panels={STEPS.map((step, i) => {
            const Glyph = PROCESS_GLYPHS[i];
            return {
              content: (
                <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
                  <div className="h-32 w-32 text-zinc-400">
                    <Glyph />
                  </div>
                  <div className="text-center">
                    <span className="text-xs tracking-widest text-orange-500 uppercase">
                      {step.kicker}
                    </span>
                    <p className="mt-1 text-sm text-zinc-400">{step.title}</p>
                  </div>
                </div>
              ),
            };
          })}
        />
      </div>
    </section>
  );
}
