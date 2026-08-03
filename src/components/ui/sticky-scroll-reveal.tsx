"use client";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Adapted from Aceternity UI's StickyScroll — the original tracks an
 * internal scroll container and swaps a gradient background. This version
 * is controlled from the outside (activeIndex prop) so it can sync with an
 * accordion's hover/open state instead of its own scroll, and swaps an icon
 * instead of a gradient panel.
 *
 * Purely decorative (aria-hidden): the service title this icon represents is
 * already announced by its row in the accordion list, so no label is
 * rendered here — avoids a duplicate, screen-reader-redundant echo.
 */
export function StickyScroll({
  activeIndex,
  panels,
  className,
}: {
  activeIndex: number;
  panels: { icon: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-32 hidden h-72 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] lg:flex",
        className,
      )}
      aria-hidden="true"
    >
      {panels.map((panel, index) => (
        <motion.div
          key={index}
          className="absolute flex items-center justify-center"
          initial={false}
          animate={{
            opacity: activeIndex === index ? 1 : 0,
            scale: activeIndex === index ? 1 : 0.94,
          }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          {panel.icon}
        </motion.div>
      ))}
    </div>
  );
}
