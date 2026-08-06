"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import Disclosure from "@/components/motion/Disclosure";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Spotlight = {
  client: string;
  year: string;
  industry: string;
  scope: string[];
  outcome: string;
  title: string;
  quote: string;
  desc: string;
  image: string;
};

// PLACEHOLDER — copy/outcomes are illustrative; images are curated Unsplash
// stock (same hotlink pattern as Office.tsx) keyed to each story's subject.
// Replace with actual CSI case studies + screenshots when available.
const SPOTLIGHTS: Spotlight[] = [
  {
    client: "Regional Government",
    year: "2024",
    industry: "Public Sector",
    scope: ["Web Platform", "SIPD Integration", "Staff Training"],
    outcome: "67% faster turnaround",
    title: "Citizen Service Portal",
    quote:
      "Thousands of requests a month, permits, letters, complaints, still processed by hand at a counter.",
    desc: "This regional government handles thousands of service requests every month: permits, official letters, complaints, all processed manually through physical counters. The process was slow, opaque, and required in-person attendance.\n\nCogniti designed a unified portal connecting every department under one interface. Citizens submit requests online, the system routes them to the right office, and they can track status in real time. Average processing time dropped from 5 days to under 2 days.",
    image: "https://images.unsplash.com/photo-1611639936963-b6d13dc44dbe?w=1400&q=80&auto=format&fit=crop",
  },
  {
    client: "State-Owned Infrastructure Co.",
    year: "2023",
    industry: "Infrastructure",
    scope: ["Mobile App", "Real-time Monitoring", "API Integration"],
    outcome: "30% cost reduction",
    title: "Field Operations Suite",
    quote:
      "Field teams across hundreds of sites, coordinating by phone, with information that arrived too late to matter.",
    desc: "Field teams spread across hundreds of sites, with no centralized visibility: coordination relied on phone calls and messaging apps. Incidents were frequently delayed because information never reached the right people in time.\n\nCogniti built a real-time monitoring and dispatch platform that links crew locations, asset data, and incident logs in a single workspace. Supervisors can see the full operation from one screen and dispatch teams within minutes.",
    image: "https://images.unsplash.com/photo-1742112125567-3e8967bad60f?w=1400&q=80&auto=format&fit=crop",
  },
];

function SpotlightItem({ spotlight }: { spotlight: Spotlight }) {
  const imageRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: imageRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 0.5, 1], reduced ? [0, 0, 0] : [-16, 0, 16]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], reduced ? [1, 1, 1] : [1.04, 1, 1.04]);

  return (
    <FadeUpItem
      tag="article"
      className="border-t border-white/[0.06] pt-8 first:border-t-0 first:pt-0 lg:pt-12"
    >
      <Disclosure
        className="border border-white/[0.06] bg-white/[0.01]"
        triggerClassName="group relative block w-full overflow-hidden text-left"
        contentClassName="flex flex-col gap-6 p-6"
        trigger={(open) => (
          <div ref={imageRef} className="relative overflow-hidden">
            <motion.img
              src={spotlight.image}
              alt=""
              loading="lazy"
              className="aspect-[3/4] w-full object-cover transition-[filter] duration-500 sm:aspect-[16/10] lg:aspect-auto lg:h-[480px] lg:group-hover:brightness-[0.45]"
              style={{ y, scale }}
              transition={{ duration: 0.6, ease: EASE }}
            />
            {/* Meta/title/outcome overlay — always visible below lg (no hover
                to reveal it there, hence the taller image gives it room),
                fades in on hover only at lg+ where the image is otherwise clean. */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 pt-20 opacity-100 transition-opacity duration-300 sm:gap-2 sm:p-6 lg:pt-16 lg:opacity-0 lg:group-hover:opacity-100">
              <p className="font-mono text-[11px] tracking-widest text-zinc-300 sm:text-xs">
                {spotlight.client} · {spotlight.industry} · {spotlight.year}
              </p>
              <h3 className="text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl lg:text-2xl">
                {spotlight.title}
              </h3>
              <p className="font-mono text-base font-bold text-zinc-50 sm:text-lg">
                {spotlight.outcome}
              </p>
              <span className="text-xs uppercase tracking-widest text-zinc-300">
                {open ? "Show less" : "Read the full story"} {open ? "−" : "+"}
              </span>
            </div>
          </div>
        )}
      >
        <p className="text-lg leading-snug font-medium text-zinc-200 sm:text-xl">
          &ldquo;{spotlight.quote}&rdquo;
        </p>

        <div className="flex flex-col gap-4">
          {spotlight.desc.split("\n\n").map((para, i) => (
            <p key={i} className="text-sm leading-relaxed text-zinc-400">
              {para}
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-white/[0.06] pt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] tracking-[0.18em] text-zinc-500 uppercase">
                Client
              </span>
              <span className="text-sm text-zinc-200">{spotlight.client}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] tracking-[0.18em] text-zinc-500 uppercase">
                Year
              </span>
              <span className="text-sm text-zinc-200">{spotlight.year}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] tracking-[0.18em] text-zinc-500 uppercase">
                Industry
              </span>
              <span className="text-sm text-zinc-200">{spotlight.industry}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[9px] tracking-[0.18em] text-zinc-500 uppercase">
              Scope
            </span>
            <div className="flex flex-wrap gap-1.5">
              {spotlight.scope.map((t) => (
                <span
                  key={t}
                  className="rounded-sm border border-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Disclosure>
    </FadeUpItem>
  );
}

export default function CaseStudySpotlight() {
  return (
    <section
      id="case-spotlight"
      className="relative z-10 border-t border-white/[0.06] px-6 py-20 sm:px-10 sm:py-28"
    >
      {/* Section header */}
      <div className="mb-12">
        <motion.p
          className="text-xs tracking-widest text-zinc-400 uppercase"
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          Featured
        </motion.p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
          <LineMask>Case Studies</LineMask>
        </h2>
      </div>

      {/* Spotlights */}
      <FadeUpList className="flex flex-col gap-10 lg:gap-16">
        {SPOTLIGHTS.map((s) => (
          <SpotlightItem key={s.title} spotlight={s} />
        ))}
      </FadeUpList>
    </section>
  );
}
