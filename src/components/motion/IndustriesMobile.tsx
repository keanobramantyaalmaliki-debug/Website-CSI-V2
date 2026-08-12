"use client";

import { useEffect, useRef, type SyntheticEvent } from "react";
import { useReducedMotion } from "motion/react";
import type { Industry } from "@/data/industries";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

const AUTO_ADVANCE_MS = 4500;

function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}

/**
 * Swipeable mobile card carousel — native CSS scroll-snap (no drag library),
 * mirroring CaseGridMobileStack's pattern. Each card shows its photo full-bleed
 * with a dark gradient wash for legibility, unlike the desktop gallery's
 * hover-to-reveal: on a touch device every card is already "open", swipe is
 * the only interaction needed. overscroll-x-contain keeps the rubber-band
 * bounce at the last card from reading as "it jumped back to the start".
 *
 * Auto-advances while idle so the sector range is visible without a swipe,
 * and stops for good the instant the user touches the carousel — it never
 * fights a manual gesture, and interaction itself doubles as the WCAG
 * pause/stop control.
 */
export default function IndustriesMobile({ industries }: { industries: Industry[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeIndexRef = useRef(0);
  const reduced = !!useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = listRef.current;
    if (!el) return;

    const id = setInterval(() => {
      const nextIndex = (activeIndexRef.current + 1) % industries.length;
      const card = el.children[nextIndex] as HTMLElement | undefined;
      if (!card) return;
      activeIndexRef.current = nextIndex;
      el.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
    }, AUTO_ADVANCE_MS);
    intervalRef.current = id;

    return () => clearInterval(id);
  }, [reduced, industries.length]);

  const stopAutoAdvance = () => {
    if (intervalRef.current === null) return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  return (
    <div data-testid="industries-mobile" className="min-w-0">
      <FadeUpList
        ref={listRef}
        tag="div"
        onPointerDown={stopAutoAdvance}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2"
      >
        {industries.map((industry) => {
          const isCore = industry.tier === "core";
          return (
            <FadeUpItem
              key={industry.name}
              tag="article"
              className="relative h-[24rem] w-[85vw] shrink-0 snap-center overflow-hidden rounded-2xl border border-white/[0.08] bg-surface-2"
            >
              <img
                src={industry.image}
                alt={industry.imageAlt}
                loading="lazy"
                onError={hideOnError}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10"
                aria-hidden="true"
              />
              <div className="relative flex h-full flex-col justify-end p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs tabular-nums text-zinc-400">{industry.num}</span>
                  {isCore && (
                    <span className="text-xs tracking-widest text-accent uppercase">
                      Core Focus
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-zinc-100">
                  {industry.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  {industry.desc}
                </p>
              </div>
            </FadeUpItem>
          );
        })}
      </FadeUpList>
    </div>
  );
}
