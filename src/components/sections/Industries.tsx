"use client";

import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import IndustriesGallery from "@/components/motion/IndustriesGallery";
import IndustriesMobile from "@/components/motion/IndustriesMobile";
import { INDUSTRIES } from "@/data/industries";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Industries() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const total = String(INDUSTRIES.length).padStart(2, "0");
  const coreCount = INDUSTRIES.filter((s) => s.tier === "core").length;

  return (
    <section
      id="industries"
      className="relative z-10 overflow-x-clip border-y border-white/[0.08] bg-white/[0.02]"
    >
      <div className="px-3 py-24 sm:py-32">
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
            <IndustriesMobile industries={INDUSTRIES} />
          )}
        </div>
      </div>
    </section>
  );
}
