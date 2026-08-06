"use client";

import { useRef } from "react";
import { gsap, useGSAP, CSI_EASE } from "@/lib/gsap/register";
import LineMask from "@/components/gsap/LineMask";
import StaggeredGlyphSlider, { type SliderNode } from "@/components/motion/StaggeredGlyphSlider";
import { NODE_GLYPHS } from "@/components/motion/NodeGlyphs";

const NODES: { name: string; desc: string }[] = [
  {
    name: "Citizen",
    desc: "Every interaction starts with people — their needs drive the system.",
  },
  {
    name: "Operations",
    desc: "Workflows that turn intent into action across every department.",
  },
  {
    name: "Knowledge",
    desc: "Data and institutional memory that give every decision context.",
  },
  {
    name: "Infrastructure",
    desc: "Cloud, APIs, and integrations that keep everything connected.",
  },
  {
    name: "Intelligence",
    desc: "AI and analytics that surface patterns before you ask.",
  },
  {
    name: "Decision",
    desc: "Where signals and intelligence converge into a clear course.",
  },
  {
    name: "Action",
    desc: "Outcomes in the real world — sent, deployed, delivered.",
  },
];

const SLIDER_NODES: SliderNode[] = NODES.map((node, i) => ({
  ...node,
  Glyph: NODE_GLYPHS[i],
}));

function MobileNodeCard({ node, index }: { node: (typeof NODES)[0]; index: number }) {
  const Glyph = NODE_GLYPHS[index];
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(ref.current, {
        opacity: 0,
        y: 16,
        duration: 0.5,
        ease: CSI_EASE,
        delay: index * 0.05,
        scrollTrigger: {
          trigger: ref.current,
          start: "top bottom-=20%",
          once: true,
        },
      });
    },
    { scope: ref, dependencies: [index] },
  );

  return (
    <div
      ref={ref}
      className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5"
    >
      <span className="size-2 rounded-full bg-orange-500" aria-hidden="true" />
      <div className="mt-4 h-16 w-16 text-orange-500/80 sm:h-20 sm:w-20">
        <Glyph />
      </div>
      <div className="mt-4">
        <span className="text-xs tabular-nums text-zinc-500">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="mt-1 font-medium text-zinc-100">{node.name}</h3>
        <p className="mt-1 text-sm leading-relaxed text-zinc-300">{node.desc}</p>
      </div>
    </div>
  );
}

export default function LivingArchitecture() {
  const sectionRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      gsap.from(eyebrowRef.current, {
        opacity: 0,
        x: -8,
        duration: 0.5,
        ease: CSI_EASE,
        scrollTrigger: { trigger: eyebrowRef.current, start: "top bottom", once: true },
      });
      gsap.from(paragraphRef.current, {
        opacity: 0,
        y: 8,
        duration: 0.5,
        ease: CSI_EASE,
        delay: 0.15,
        scrollTrigger: { trigger: paragraphRef.current, start: "top bottom", once: true },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="living-architecture"
      className="relative z-10 border-y border-white/[0.08] bg-white/[0.02]"
    >
      <div className="px-6 py-24 sm:px-10 sm:py-32">
        {/* T6 — eyebrow */}
        <p
          ref={eyebrowRef}
          className="text-xs tracking-widest text-zinc-400 uppercase"
        >
          Living Architecture
        </p>

        {/* T1 — line-mask heading */}
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
          <LineMask>A Living Architecture For Decisions.</LineMask>
        </h2>

        <p
          ref={paragraphRef}
          className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400"
        >
          Signals, context, and knowledge — adaptive systems that move organizations from awareness to action.
        </p>

        {/* Desktop — staggered glyph slider, port of basement.studio's
            experiments/58.staggered-slider.tsx pattern. */}
        <div className="mt-12 hidden lg:block">
          <StaggeredGlyphSlider nodes={SLIDER_NODES} />
        </div>

        {/* Mobile/tablet — scroll-reveal list, one card at a time. */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
          {NODES.map((node, i) => (
            <MobileNodeCard key={node.name} node={node} index={i} />
          ))}
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
