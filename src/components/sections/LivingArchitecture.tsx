"use client";

import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";
import { NODE_GLYPHS } from "@/components/motion/NodeGlyphs";
import { useScrollStepper } from "@/lib/hooks/useScrollStepper";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Group = "Foundation" | "Flow";

const NODES: { num: string; name: string; group: Group; desc: string }[] = [
  {
    num: "01",
    name: "Citizen",
    group: "Foundation",
    desc: "Every interaction starts with people — their needs drive the system.",
  },
  {
    num: "02",
    name: "Operations",
    group: "Foundation",
    desc: "Workflows that turn intent into action across every department.",
  },
  {
    num: "03",
    name: "Knowledge",
    group: "Foundation",
    desc: "Data and institutional memory that give every decision context.",
  },
  {
    num: "04",
    name: "Infrastructure",
    group: "Foundation",
    desc: "Cloud, APIs, and integrations that keep everything connected.",
  },
  {
    num: "05",
    name: "Intelligence",
    group: "Flow",
    desc: "AI and analytics that surface patterns before you ask.",
  },
  {
    num: "06",
    name: "Decision",
    group: "Flow",
    desc: "Where signals and intelligence converge into a clear course.",
  },
  {
    num: "07",
    name: "Action",
    group: "Flow",
    desc: "Outcomes in the real world — sent, deployed, delivered.",
  },
];

function railDotClass(active: boolean) {
  return cn(
    "-ml-[calc(1.5rem+1px)] h-[7px] w-[7px] rounded-full transition-colors",
    active ? "bg-orange-500" : "bg-zinc-700",
  );
}

function GroupHeader({ group, showConnector }: { group: Group; showConnector: boolean }) {
  return (
    <div className={cn("pb-4", showConnector && "pt-10")}>
      {showConnector && (
        <p className="pb-4 text-xs text-zinc-600" aria-hidden="true">
          ↓ runs on
        </p>
      )}
      <span className="text-xs tracking-widest text-orange-500 uppercase">{group}</span>
    </div>
  );
}

export default function LivingArchitecture() {
  const { activeIndex, setRef } = useScrollStepper(NODES.length);

  return (
    <section
      id="living-architecture"
      className="relative z-10 border-y border-white/[0.08] bg-white/[0.02]"
    >
      <div className="px-6 py-24 sm:px-10 sm:py-32">
        {/* T6 — eyebrow */}
        <motion.p
          className="text-xs tracking-widest text-zinc-400 uppercase"
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          Living Architecture
        </motion.p>

        {/* T1 — line-mask heading */}
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
          <LineMask>A Living Architecture For Decisions.</LineMask>
        </h2>

        <motion.p
          className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
        >
          Signals, context, and knowledge — adaptive systems that move organizations from awareness to action.
        </motion.p>

        <div className="mt-16 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <FadeUpList tag="div" className="border-t border-white/[0.08]">
            {NODES.map((node, i) => {
              const Glyph = NODE_GLYPHS[i];
              const opensGroup = i === 0 || NODES[i - 1].group !== node.group;
              return (
                <FadeUpItem key={node.name} tag="div">
                  {opensGroup && <GroupHeader group={node.group} showConnector={i > 0} />}
                  <div
                    ref={setRef(i)}
                    className="relative grid gap-4 border-b border-l border-white/[0.08] py-10 pl-6 sm:grid-cols-[3rem_1fr] sm:py-14 sm:pl-8"
                  >
                    <span className="flex items-center gap-3 text-xs tabular-nums text-zinc-500">
                      <span aria-hidden="true" className={railDotClass(i === activeIndex)} />
                      {node.num}
                    </span>
                    <div>
                      <h3 className="text-xl font-medium text-zinc-100 sm:text-2xl">{node.name}</h3>
                      <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">{node.desc}</p>
                      {/* Mobile/tablet — desktop shows the same glyph in the sticky panel. */}
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
            panels={NODES.map((node, i) => {
              const Glyph = NODE_GLYPHS[i];
              return {
                content: (
                  <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
                    <div className="h-32 w-32 text-zinc-400">
                      <Glyph />
                    </div>
                    <div className="text-center">
                      <span className="text-xs tracking-widest text-orange-500 uppercase">
                        {node.group}
                      </span>
                      <p className="mt-1 text-sm text-zinc-400">{node.name}</p>
                    </div>
                  </div>
                ),
              };
            })}
          />
        </div>

        <p className="mt-8 text-xs tracking-widest text-zinc-400 uppercase">
          Signal Complete&nbsp;
          <span className="text-orange-500">→</span>
          &nbsp;From awareness to action.
        </p>
      </div>
    </section>
  );
}
