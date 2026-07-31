"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
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
 * Scroll-activated node reveal. Name + description both visible (comfort: no
 * click to read); scroll only lifts a subtle dim→full emphasis, never hides text.
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

  // Emphasis only — floor at 0.6 so every node stays readable before it's "active".
  const opacity = useTransform(progress, [start, end], [0.6, 1]);
  const nameColor = useTransform(progress, [start, end], ["#a9adb6", "#f4f5f7"]);

  return (
    <motion.li style={{ opacity }} className="border-b border-white/[0.08]">
      <div className="flex items-baseline gap-6 py-5">
        <span className="w-10 shrink-0 text-sm tabular-nums text-zinc-400">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex-1">
          <motion.h3 style={{ color: nameColor }} className="font-medium">
            {node.name}
          </motion.h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{node.desc}</p>
        </div>
      </div>
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
          {/* Node list — name + desc always visible; NodeItem's scroll emphasis
              is inert under reduced motion (MotionValues stay at rest). */}
          <ol className="border-t border-white/[0.08]">
            {NODES.map((node, i) => (
              <NodeItem key={node.name} node={node} index={i} progress={scrollYProgress} />
            ))}
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
