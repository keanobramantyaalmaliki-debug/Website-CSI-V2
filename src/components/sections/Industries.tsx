"use client";

import type { SyntheticEvent } from "react";
import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import IndustriesGallery from "@/components/motion/IndustriesGallery";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import { INDUSTRIES } from "@/data/industries";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}

function MobileIndustryCard({ industry }: { industry: (typeof INDUSTRIES)[number] }) {
  const isCore = industry.tier === "core";

  return (
    <FadeUpItem tag="article">
      <div className="flex gap-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <img
          src={industry.image}
          alt={industry.imageAlt}
          loading="lazy"
          onError={hideOnError}
          className="h-20 w-20 shrink-0 rounded-xl object-cover"
        />
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-zinc-500">{industry.num}</span>
            {isCore && (
              <span className="text-xs tracking-widest text-accent uppercase">Core</span>
            )}
          </div>
          <h3 className="text-sm font-medium text-zinc-100">{industry.name}</h3>
          <p className="text-sm leading-relaxed text-zinc-400">{industry.desc}</p>
        </div>
      </div>
    </FadeUpItem>
  );
}

export default function Industries() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const total = String(INDUSTRIES.length).padStart(2, "0");
  const coreCount = INDUSTRIES.filter((s) => s.tier === "core").length;

  return (
    <section
      id="industries"
      className="relative z-10 overflow-x-clip border-y border-white/[0.08] bg-white/[0.02]"
    >
      <div className="px-6 py-24 sm:px-10 sm:py-32">
        <div className={cn("grid gap-10", isDesktop && "lg:grid-cols-[20rem_1fr]")}>
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
                {total} SECTORS · {coreCount} core
              </span>
            </div>
          </div>

          {isDesktop ? (
            <IndustriesGallery industries={INDUSTRIES} />
          ) : (
            <FadeUpList tag="div" className="flex flex-col gap-3">
              {INDUSTRIES.map((industry) => (
                <MobileIndustryCard key={industry.name} industry={industry} />
              ))}
            </FadeUpList>
          )}
        </div>
      </div>
    </section>
  );
}
