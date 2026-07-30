"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import Disclosure from "@/components/motion/Disclosure";
import FlowDiagram from "@/components/motion/FlowDiagram";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const NODES: { name: string; desc: string }[] = [
  {
    name: "Citizen",
    desc: "Every interaction begins with people — citizens, users, and communities whose needs drive the system.",
  },
  {
    name: "Operations",
    desc: "Processes and workflows that translate intent into action across departments and services.",
  },
  {
    name: "Knowledge",
    desc: "Structured data, documents, and institutional memory that give context to every decision.",
  },
  {
    name: "Infrastructure",
    desc: "The technical foundation — cloud, APIs, and integrations that keep systems connected and resilient.",
  },
  {
    name: "Intelligence",
    desc: "AI and analytics layers that surface patterns, predictions, and recommendations from the data.",
  },
  {
    name: "Decision",
    desc: "The moment of clarity — where signals, context, and intelligence converge into a clear course of action.",
  },
  {
    name: "Action",
    desc: "Outcomes executed in the real world: communications sent, resources deployed, services delivered.",
  },
];

/**
 * T4 (simplified) — scroll-activated node reveal.
 * Name lights up progressively; desc is hidden behind Disclosure until opened.
 */
function NodeItem({
  node,
  index,
  progress,
}: {
  node: (typeof NODES)[0];
  index: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const n = NODES.length;
  const start = index / n;
  const end = Math.min((index + 1.5) / n, 1);

  const opacity = useTransform(progress, [start, end], [0.2, 1]);
  const nameColor = useTransform(progress, [start, end], ["#52525b", "#f4f4f5"]);

  return (
    <motion.li style={{ opacity }} className="border-b border-white/[0.08]">
      <Disclosure
        triggerClassName="group flex w-full items-center gap-6 py-5 text-left"
        contentClassName="pb-5 pl-16"
        trigger={(open) => (
          <>
            <span className="w-10 shrink-0 text-sm tabular-nums text-zinc-400">
              {String(index + 1).padStart(2, "0")}
            </span>
            <motion.h3 style={{ color: nameColor }} className="flex-1 font-medium">
              {node.name}
            </motion.h3>
            <span
              className={`shrink-0 text-sm text-zinc-400 transition-transform duration-200 group-hover:text-zinc-400 ${open ? "rotate-45" : "rotate-0"}`}
              aria-hidden="true"
            >
              +
            </span>
          </>
        )}
      >
        <p className="text-sm leading-relaxed text-zinc-300">{node.desc}</p>
      </Disclosure>
    </motion.li>
  );
}

export default function LivingArchitecture() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.7", "end 0.3"],
  });

  return (
    <section
      ref={sectionRef}
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

        {/* 2-col layout: list left, flow diagram right (desktop only) */}
        <div className="mt-12 lg:grid lg:grid-cols-[1fr_200px] lg:gap-12 xl:grid-cols-[1fr_220px] xl:gap-16">
          {/* Node list */}
          <ol className="border-t border-white/[0.08]">
            {NODES.map((node, i) =>
              reduced ? (
                <li key={node.name} className="border-b border-white/[0.08]">
                  <Disclosure
                    defaultOpen
                    triggerClassName="group flex w-full items-center gap-6 py-5 text-left"
                    contentClassName="pb-5 pl-16"
                    trigger={(open) => (
                      <>
                        <span className="w-10 shrink-0 text-sm tabular-nums text-zinc-400">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h3 className="flex-1 font-medium text-zinc-100">{node.name}</h3>
                        <span
                          className={`shrink-0 text-sm text-zinc-400 transition-transform duration-200 ${open ? "rotate-45" : "rotate-0"}`}
                          aria-hidden="true"
                        >
                          +
                        </span>
                      </>
                    )}
                  >
                    <p className="text-sm leading-relaxed text-zinc-300">{node.desc}</p>
                  </Disclosure>
                </li>
              ) : (
                <NodeItem key={node.name} node={node} index={i} progress={scrollYProgress} />
              )
            )}
          </ol>

          {/* Flow diagram — desktop only, sticky so it tracks scroll alongside the list */}
          {!reduced && (
            <aside className="hidden lg:block">
              <div className="sticky top-24 pt-1">
                <FlowDiagram progress={scrollYProgress} />
              </div>
            </aside>
          )}
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
