"use client";

import { motion, useReducedMotion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Sector = { num: string; name: string; desc: string; tier: "core" | "also" };

const SECTORS: Sector[] = [
  {
    num: "01",
    name: "Government & Public Sector",
    desc: "National platforms and citizen services, built to scale and stay accountable.",
    tier: "core",
  },
  {
    num: "02",
    name: "Smart Cities",
    desc: "Connected infrastructure that turns urban data into livable outcomes.",
    tier: "core",
  },
  {
    num: "03",
    name: "Digital Villages",
    desc: "Bringing modern services to rural communities, one connected village at a time.",
    tier: "core",
  },
  {
    num: "04",
    name: "Healthcare",
    desc: "Systems that keep patient care coordinated, secure, and on time.",
    tier: "also",
  },
  {
    num: "05",
    name: "Education",
    desc: "Platforms that put learning and administration on the same page.",
    tier: "also",
  },
  {
    num: "06",
    name: "Finance",
    desc: "Secure, compliant systems for money that has to move and be trusted.",
    tier: "also",
  },
  {
    num: "07",
    name: "Hospitality",
    desc: "Guest experiences that feel effortless from booking to checkout.",
    tier: "also",
  },
  {
    num: "08",
    name: "Retail & E-Commerce",
    desc: "Storefronts and operations that keep pace with demand.",
    tier: "also",
  },
  {
    num: "09",
    name: "Manufacturing",
    desc: "Floor-to-cloud visibility that keeps production moving.",
    tier: "also",
  },
  {
    num: "10",
    name: "Logistics",
    desc: "Tracking and routing that make every shipment predictable.",
    tier: "also",
  },
  {
    num: "11",
    name: "Property & Real Estate",
    desc: "Tools that manage spaces, tenants, and portfolios in one place.",
    tier: "also",
  },
  {
    num: "12",
    name: "Professional Services",
    desc: "Workflows that let expert teams bill, deliver, and scale.",
    tier: "also",
  },
  {
    num: "13",
    name: "Startups & Enterprises",
    desc: "From first MVP to enterprise rollout, built to grow with you.",
    tier: "also",
  },
];

const CORE_SECTORS = SECTORS.filter((s) => s.tier === "core");
const ALSO_SECTORS = SECTORS.filter((s) => s.tier === "also");

function NodeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <path
        d="M8 1.5L14.5 8L8 14.5L1.5 8L8 1.5Z"
        stroke="currentColor"
        strokeOpacity="0.7"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function GroupHeader({ children }: { children: string }) {
  return (
    <span className="text-xs tracking-widest text-zinc-500 uppercase">{children}</span>
  );
}

function SectorCard({ sector, reduced }: { sector: Sector; reduced: boolean }) {
  const isCore = sector.tier === "core";

  return (
    <FadeUpItem tag="article">
      <div
        className={cn(
          "group relative flex h-full flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] transition-colors duration-300 hover:border-accent/40",
          !reduced && "hover:[box-shadow:var(--elevation-1)] hover:-translate-y-0.5 motion-safe:transition-transform",
          isCore ? "gap-3 p-6 sm:p-8" : "gap-2 p-5",
          isCore && !reduced && "sm:animate-[careers-idle-glow_3s_ease-in-out_infinite] lg:animate-none",
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-zinc-500">{sector.num}</span>
          <span
            className={cn(
              "h-4 w-4 text-zinc-500 transition-colors duration-300 group-hover:text-accent",
              isCore && "h-5 w-5",
            )}
          >
            <NodeMark className="h-full w-full" />
          </span>
        </div>

        <h3
          className={cn(
            "font-medium text-zinc-100",
            isCore ? "text-lg sm:text-xl" : "text-sm",
          )}
        >
          {sector.name}
        </h3>

        <p
          className={cn(
            "text-sm leading-relaxed text-zinc-400 transition-opacity duration-300",
            isCore
              ? "opacity-100"
              : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
          )}
        >
          {sector.desc}
        </p>
      </div>
    </FadeUpItem>
  );
}

export default function Industries() {
  const reduced = !!useReducedMotion();
  const total = String(SECTORS.length).padStart(2, "0");

  return (
    <section id="industries" className="relative z-10 overflow-x-clip border-y border-white/[0.08] bg-white/[0.02]">
      <div className="px-6 py-24 sm:px-10 sm:py-32">
        <div className="grid gap-10 lg:grid-cols-[20rem_1fr]">
          {/* Sticky heading column — matches LivingArchitecture's pattern. */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <motion.p
              className="text-xs tracking-widest text-zinc-400 uppercase"
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              Industries
            </motion.p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
              <LineMask>Built Across Sectors</LineMask>
            </h2>

            <motion.p
              className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
            >
              From national platforms to neighborhood apps.
            </motion.p>

            <div
              className="mt-10 hidden border-t border-white/[0.08] pt-6 lg:block"
              aria-hidden="true"
            >
              <span className="text-xs tabular-nums text-zinc-500">
                {total} SECTORS · {CORE_SECTORS.length} core
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-10">
            <div>
              <div className="border-t border-white/[0.08] pt-4 pb-4">
                <GroupHeader>Core Focus</GroupHeader>
              </div>
              <FadeUpList tag="div" className="grid gap-4 sm:grid-cols-3">
                {CORE_SECTORS.map((sector) => (
                  <SectorCard key={sector.name} sector={sector} reduced={reduced} />
                ))}
              </FadeUpList>
            </div>

            <div>
              <div className="border-t border-white/[0.08] pt-4 pb-4">
                <GroupHeader>Also Serving</GroupHeader>
              </div>
              <FadeUpList tag="div" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ALSO_SECTORS.map((sector) => (
                  <SectorCard key={sector.name} sector={sector} reduced={reduced} />
                ))}
              </FadeUpList>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
