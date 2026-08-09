"use client";

import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
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
      <span className="text-xs tracking-widest text-zinc-500 uppercase">{group}</span>
    </div>
  );
}

export default function LivingArchitecture() {
  const { activeIndex, setRef } = useScrollStepper(NODES.length);
  const total = String(NODES.length).padStart(2, "0");

  return (
    <section
      id="living-architecture"
      className="relative z-10 overflow-x-clip border-y border-white/[0.08] bg-white/[0.02]"
    >
      <div className="px-6 py-24 sm:px-10 sm:py-32">
        <div className="grid gap-10 lg:grid-cols-[20rem_1fr]">
          {/* Sticky heading column — occupies the dead space Process.tsx's
              full-width heading would otherwise leave empty here, and keeps
              the two neighboring sections visually distinct despite sharing
              a glyph language. See ProcessGlyphs.tsx for the full rationale. */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <motion.p
              className="text-xs tracking-widest text-zinc-400 uppercase"
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              Living Architecture
            </motion.p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
              <LineMask>A Living Architecture For Decisions.</LineMask>
            </h2>

            <motion.p
              className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
            >
              Signals, context, and knowledge — adaptive systems that move organizations from awareness to action.
            </motion.p>

            <div
              className="mt-10 hidden border-t border-white/[0.08] pt-6 lg:block"
              aria-hidden="true"
            >
              <span className="text-xs tabular-nums text-zinc-500">
                {String(activeIndex + 1).padStart(2, "0")} / {total}
              </span>
              <p className="mt-2 text-xs tracking-widest text-zinc-400 uppercase">
                Signal Complete&nbsp;<span className="text-orange-500">→</span>&nbsp;From awareness to
                action.
              </p>
            </div>
          </div>

          <FadeUpList tag="div" className="border-t border-white/[0.08]">
            {NODES.map((node, i) => {
              const Glyph = NODE_GLYPHS[i];
              const opensGroup = i === 0 || NODES[i - 1].group !== node.group;
              return (
                <FadeUpItem key={node.name} tag="div">
                  {opensGroup && <GroupHeader group={node.group} showConnector={i > 0} />}
                  <div
                    ref={setRef(i)}
                    className="grid grid-cols-[2.5rem_2.5rem_1fr] items-center gap-x-4 gap-y-2 border-b border-l border-white/[0.08] py-6 pl-6 sm:grid-cols-[2.5rem_2.5rem_10rem_1fr] sm:py-7"
                  >
                    <span className="flex items-center gap-3 text-xs tabular-nums text-zinc-500">
                      <span aria-hidden="true" className={railDotClass(i === activeIndex)} />
                      {node.num}
                    </span>
                    <div className="h-10 w-10 text-zinc-500">
                      <Glyph />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-100 sm:text-xl">{node.name}</h3>
                    <p className="col-span-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:col-span-1">
                      {node.desc}
                    </p>
                  </div>
                </FadeUpItem>
              );
            })}
          </FadeUpList>
        </div>

        {/* Sub-lg only — the sticky column above renders this at lg and up. */}
        <p className="mt-8 text-xs tracking-widest text-zinc-400 uppercase lg:hidden">
          Signal Complete&nbsp;
          <span className="text-orange-500">→</span>
          &nbsp;From awareness to action.
        </p>
      </div>
    </section>
  );
}
