"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Desktop-only sticky photo panel driven by an external activeIndex (scroll
 * progress through the service list, or a hover/focus override — see
 * Office.tsx). Desktop's side-by-side layout keeps the panel visually
 * anchored to whichever row it tracks; stacked single-column layouts (mobile)
 * don't have that spatial link, so mobile gets its own per-row thumbnail +
 * tap-to-reveal treatment instead (see Office.tsx's card rows).
 *
 * Purely decorative (aria-hidden) — each panel's service title is already
 * announced by its row in the accordion list — but a sr-only label still
 * announces which service's photo is currently showing, as a progressive
 * enhancement for screen reader users tracking hover/scroll state.
 */
export default function PinnedServiceStack({
  activeIndex,
  panels,
  className,
}: {
  activeIndex: number;
  panels: { image: string; title: string }[];
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <div
      className={cn(
        "sticky top-32 hidden h-72 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] lg:block",
        className,
      )}
    >
      <div aria-hidden="true" className="relative h-full w-full">
        {panels.map((panel, index) => (
          <motion.div
            key={index}
            className="absolute inset-0"
            initial={false}
            animate={{
              opacity: activeIndex === index ? 1 : 0,
              scale: activeIndex === index ? 1 : 1.03,
            }}
            transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
          >
            <img
              src={panel.image}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </motion.div>
        ))}
      </div>
      <span className="sr-only">{panels[activeIndex]?.title}</span>
    </div>
  );
}
