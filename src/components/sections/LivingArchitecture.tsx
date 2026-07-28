"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import LineMask from "@/components/motion/LineMask";

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
 * Each node progressively lights up as the section scrolls through the viewport.
 * Full sticky-pin (T4 spec) deferred; this delivers the same "sequence unfolding" feel.
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

  const opacity = useTransform(progress, [start, end], [0.15, 1]);
  const nameColor = useTransform(progress, [start, end], ["#52525b", "#f4f4f5"]);
  const descColor = useTransform(progress, [start, end], ["#27272a", "#71717a"]);

  return (
    <motion.li
      style={{ opacity }}
      className="grid gap-2 py-6 sm:grid-cols-[4rem_12rem_1fr] sm:gap-6"
    >
      <span className="text-sm text-zinc-600 tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>
      <motion.h3 style={{ color: nameColor }} className="font-medium">
        {node.name}
      </motion.h3>
      <motion.p style={{ color: descColor }} className="text-sm leading-relaxed">
        {node.desc}
      </motion.p>
    </motion.li>
  );
}

export default function LivingArchitecture() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  // Track scroll progress through the full section height
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.7", "end 0.3"],
  });

  return (
    <section
      ref={sectionRef}
      id="living-architecture"
      className="border-y border-zinc-900 bg-zinc-950/50"
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
          className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
        >
          We connect signals, context, knowledge, and workflows into adaptive systems that help
          organizations move from awareness to action.
        </motion.p>

        {/* Nodes — scroll-activated if motion allowed, static fallback if reduced */}
        <ol className="mt-12 divide-y divide-zinc-900 border-y border-zinc-900">
          {NODES.map((node, i) =>
            reduced ? (
              <li key={node.name} className="grid gap-2 py-6 sm:grid-cols-[4rem_12rem_1fr] sm:gap-6">
                <span className="text-sm text-zinc-600 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-medium text-zinc-100">{node.name}</h3>
                <p className="text-sm leading-relaxed text-zinc-500">{node.desc}</p>
              </li>
            ) : (
              <NodeItem key={node.name} node={node} index={i} progress={scrollYProgress} />
            )
          )}
        </ol>

        <p className="mt-8 text-xs tracking-widest text-zinc-600 uppercase">
          Signal Complete&nbsp;
          <span className="text-orange-500">→</span>
          &nbsp;From awareness to action.
        </p>
      </div>
    </section>
  );
}
