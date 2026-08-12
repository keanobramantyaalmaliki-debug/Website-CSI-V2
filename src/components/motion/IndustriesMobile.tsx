"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import type { Industry } from "@/data/industries";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}

function DetailPanel({
  industry,
  onBack,
  reduced,
}: {
  industry: Industry;
  onBack: () => void;
  reduced: boolean;
}) {
  const isCore = industry.tier === "core";
  const backRef = useRef<HTMLButtonElement>(null);

  // Land keyboard/AT focus on Back the moment the panel mounts, mirroring
  // CareersPromote's promoted-hero focus handoff.
  useEffect(() => {
    const id = requestAnimationFrame(() => backRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <motion.div
      data-testid="industries-mobile-detail"
      role="region"
      aria-label={industry.name}
      initial={{ opacity: reduced ? 1 : 0, x: reduced ? 0 : 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: reduced ? 1 : 0, x: reduced ? 0 : 16 }}
      transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
      className="absolute inset-x-0 top-0 z-10 overflow-hidden rounded-2xl border border-white/[0.08] bg-surface-2"
    >
      <button
        ref={backRef}
        type="button"
        aria-label="Back to sectors"
        onClick={onBack}
        className="absolute top-3 left-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-surface-2/80 text-zinc-400 outline-none transition-colors hover:border-accent/40 hover:text-accent focus-visible:border-accent/40"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="relative h-48 w-full">
        <img
          src={industry.image}
          alt={industry.imageAlt}
          loading="lazy"
          onError={hideOnError}
          className="h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"
          aria-hidden="true"
        />
      </div>

      <div className="p-4 sm:p-6">
        <span className="text-xs tabular-nums text-zinc-500">{industry.num}</span>
        <h3 className="mt-1 text-lg font-semibold text-zinc-100">{industry.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">{industry.desc}</p>
        {isCore && (
          <span className="mt-3 inline-block text-xs tracking-widest text-accent uppercase">
            Core Focus
          </span>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Master → detail for narrow screens. The grid stays mounted underneath so
 * tapping a card can hand focus back to it on close (CareersPromote's
 * ref+rAF idiom); the detail is an in-section overlay, not a route change,
 * so "back" is instant — no navigation, no scroll position lost.
 */
export default function IndustriesMobile({ industries }: { industries: Industry[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const reduced = !!useReducedMotion();
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function closeDetail() {
    const index = activeIndex;
    setActiveIndex(null);
    if (index !== null) {
      requestAnimationFrame(() => cardRefs.current[index]?.focus());
    }
  }

  const active = activeIndex !== null ? industries[activeIndex] : null;

  return (
    <div data-testid="industries-mobile" className="relative">
      <div
        data-testid="industries-mobile-grid"
        aria-hidden={active ? true : undefined}
        className={cn(
          "grid grid-cols-2 gap-3 transition-opacity duration-200",
          active && "pointer-events-none opacity-0",
        )}
      >
        {industries.map((industry, index) => (
          <button
            key={industry.name}
            ref={(el) => {
              cardRefs.current[index] = el;
            }}
            type="button"
            tabIndex={active ? -1 : undefined}
            onClick={() => setActiveIndex(index)}
            className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-surface-2 p-4 text-left outline-none transition-colors hover:border-accent/40 focus-visible:border-accent/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs tabular-nums text-zinc-500">{industry.num}</span>
              {industry.tier === "core" && (
                <span className="text-[10px] tracking-widest text-accent uppercase">
                  Core
                </span>
              )}
            </div>
            <span className="text-sm font-medium text-zinc-100">{industry.name}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <DetailPanel
            key={active.name}
            industry={active}
            onBack={closeDetail}
            reduced={reduced}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
