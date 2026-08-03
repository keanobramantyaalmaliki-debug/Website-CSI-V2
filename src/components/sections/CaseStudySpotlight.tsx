"use client";

import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Spotlight = {
  client: string;
  year: string;
  industry: string;
  scope: string[];
  outcome: string;
  title: string;
  desc: string;
  image: string;
};

// PLACEHOLDER — replace with actual CSI case studies when available.
const SPOTLIGHTS: Spotlight[] = [
  {
    client: "Regional Government",
    year: "2024",
    industry: "Public Sector",
    scope: ["Web Platform", "SIPD Integration", "Staff Training"],
    outcome: "67% faster turnaround",
    title: "Citizen Service Portal",
    desc: "This regional government handles thousands of service requests every month — permits, official letters, complaints — all processed manually through physical counters. The process was slow, opaque, and required in-person attendance.\n\nCogniti designed a unified portal connecting every department under one interface. Citizens submit requests online, the system routes them to the right office, and status can be tracked in real time. Average processing time dropped from 5 days to under 2 days.",
    image: "https://picsum.photos/seed/csi-spotlight-citizen/1400/788",
  },
  {
    client: "State-Owned Infrastructure Co.",
    year: "2023",
    industry: "Infrastructure",
    scope: ["Mobile App", "Real-time Monitoring", "API Integration"],
    outcome: "30% cost reduction",
    title: "Field Operations Suite",
    desc: "Field teams spread across hundreds of sites — with no centralized visibility, coordination relied on phone calls and messaging apps. Incidents were frequently delayed because information never reached the right people in time.\n\nCogniti built a real-time monitoring and dispatch platform linking crew locations, asset data, and incident logs in a single workspace. Supervisors can see the full operation from one screen and dispatch teams within minutes.",
    image: "https://picsum.photos/seed/csi-spotlight-field/1400/788",
  },
];

type MetaRowProps = { label: string; value?: string; tags?: string[] };

function MetaRow({ label, value, tags }: MetaRowProps) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/[0.06] pb-4">
      <span className="font-mono text-[9px] tracking-[0.18em] text-zinc-500 uppercase">
        {label}
      </span>
      {value && <span className="text-sm text-zinc-200">{value}</span>}
      {tags && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-sm border border-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SpotlightItem({
  spotlight,
  flip = false,
}: {
  spotlight: Spotlight;
  flip?: boolean;
}) {
  return (
    <FadeUpItem
      tag="article"
      className="border-t border-white/[0.06] pt-8 first:border-t-0 first:pt-0 lg:pt-12"
    >
      <div
        className={`grid border border-white/[0.06] lg:grid-cols-[220px_1fr] ${flip ? "lg:grid-cols-[1fr_220px]" : ""}`}
      >
        {/* Sidebar — metadata only; desc hidden on mobile (shown in main below) */}
        <aside
          className={`flex flex-col gap-4 border-b border-white/[0.06] bg-white/[0.02] p-6 lg:border-b-0 lg:border-r ${flip ? "lg:order-2 lg:border-l lg:border-r-0" : ""}`}
        >
          <MetaRow label="Client" value={spotlight.client} />
          <MetaRow label="Year" value={spotlight.year} />
          <MetaRow label="Industry" value={spotlight.industry} />
          <MetaRow label="Scope" tags={spotlight.scope} />
          <MetaRow label="Outcome" value={spotlight.outcome} />

          {/* Only show teaser desc on desktop where sidebar sits beside content */}
          <div className="mt-auto hidden lg:block">
            <p className="text-xs leading-relaxed text-zinc-500">
              {spotlight.desc.split("\n\n")[0]}
            </p>
          </div>
        </aside>

        {/* Main — image + body */}
        <div className={`flex flex-col bg-white/[0.01] ${flip ? "lg:order-1" : ""}`}>
          <div className="overflow-hidden">
            <motion.img
              src={spotlight.image}
              alt=""
              loading="lazy"
              className="aspect-[16/9] w-full object-cover"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.6, ease: EASE }}
            />
          </div>

          <div className="flex flex-col gap-4 p-6">
            <h3 className="text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
              {spotlight.title}
            </h3>
            {spotlight.desc.split("\n\n").map((para, i) => (
              <p key={i} className="text-sm leading-relaxed text-zinc-400">
                {para}
              </p>
            ))}
          </div>
        </div>
      </div>
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
        {SPOTLIGHTS.map((s, i) => (
          <SpotlightItem key={s.title} spotlight={s} flip={i % 2 !== 0} />
        ))}
      </FadeUpList>
    </section>
  );
}
