"use client";

import { useRef, useState, type SyntheticEvent } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import type { Industry } from "@/data/industries";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_CSS = "cubic-bezier(0.16,1,0.3,1)";

function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}

function GalleryColumn({
  industry,
  index,
  isActive,
  reduced,
  entered,
  onFocusStart,
  onFocusEnd,
}: {
  industry: Industry;
  index: number;
  isActive: boolean;
  reduced: boolean;
  entered: boolean;
  onFocusStart: () => void;
  onFocusEnd: () => void;
}) {
  const isCore = industry.tier === "core";

  return (
    <motion.button
      type="button"
      aria-current={isActive || undefined}
      onMouseEnter={onFocusStart}
      onFocus={onFocusStart}
      onMouseLeave={onFocusEnd}
      onBlur={onFocusEnd}
      onClick={onFocusStart}
      layout
      initial={{ opacity: 0, y: reduced ? 0 : 12 }}
      animate={entered ? { opacity: 1, y: 0 } : undefined}
      transition={
        reduced
          ? { duration: 0 }
          : {
              layout: { duration: 0.45, ease: EASE },
              duration: 0.4,
              ease: EASE,
              delay: index * 0.03,
            }
      }
      className={cn(
        "group relative flex h-full flex-col overflow-hidden border-l border-white/[0.08] bg-surface-2 text-left outline-none transition-colors last:border-r hover:border-accent/40 focus-visible:border-accent/40",
        isActive ? "flex-[4]" : "flex-1",
      )}
    >
      <div
        className="absolute inset-x-0 top-0 z-10 h-0.5 bg-accent transition-opacity duration-300"
        style={{ opacity: isActive ? 1 : 0 }}
        aria-hidden="true"
      />

      <img
        src={industry.image}
        alt={industry.imageAlt}
        loading="lazy"
        onError={hideOnError}
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          opacity: isActive ? 1 : 0,
          transition: reduced ? undefined : `opacity 0.4s ${EASE_CSS}`,
        }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"
        style={{
          opacity: isActive ? 1 : 0,
          transition: reduced ? undefined : `opacity 0.4s ${EASE_CSS}`,
        }}
        aria-hidden="true"
      />

      <div className="relative flex h-full flex-col justify-between p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-xs tabular-nums transition-colors duration-300",
              isActive ? "text-accent" : "text-zinc-500",
            )}
          >
            {industry.num}
          </span>
          <span
            data-testid={isActive ? "active-indicator" : undefined}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors duration-300",
              isActive ? "bg-accent" : isCore ? "bg-white/25" : "bg-transparent",
            )}
            aria-hidden="true"
          />
        </div>

        <div className="flex flex-1 items-center justify-center overflow-hidden py-4">
          <span
            className={cn(
              "[writing-mode:vertical-rl] rotate-180 text-sm font-medium tracking-tight whitespace-nowrap transition-colors duration-300",
              isActive ? "text-zinc-100" : "text-zinc-300",
            )}
          >
            {industry.name}
          </span>
        </div>
      </div>

      {/* Desc + core tag stay mounted (never conditionally rendered) so AT
          and reduced-motion users always get the payload — only opacity and
          offset animate, matching ArchitectureGrid's reveal pattern. */}
      <div
        className="absolute inset-x-0 bottom-0 p-4 sm:p-6"
        style={{
          opacity: isActive ? 1 : 0,
          transform: reduced ? undefined : isActive ? "translateY(0px)" : "translateY(6px)",
          transition: reduced ? undefined : `opacity 0.35s ${EASE_CSS}, transform 0.35s ${EASE_CSS}`,
          pointerEvents: isActive ? "auto" : "none",
        }}
      >
        <p className="text-sm leading-relaxed text-zinc-300">{industry.desc}</p>
        {isCore && (
          <span className="mt-2 inline-block text-xs tracking-widest text-accent uppercase">
            Core Focus
          </span>
        )}
      </div>
    </motion.button>
  );
}

/**
 * Expanding horizontal gallery — collapsed columns read as a thin spine
 * (vertical name), the hovered/focused one squeezes the rest open and fades
 * in an image + description overlay. Every description stays mounted at all
 * times (opacity/offset only) so it never reflows and stays readable by AT
 * and reduced-motion users, mirroring ArchitectureGrid's NodeCell.
 */
export default function IndustriesGallery({ industries }: { industries: Industry[] }) {
  const [active, setActive] = useState<number | null>(null);
  const reduced = !!useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const entered = useInView(containerRef, { once: true, margin: "0px 0px -80px 0px" });

  return (
    <div
      ref={containerRef}
      data-testid="industries-gallery"
      className="flex h-[28rem] w-full overflow-hidden rounded-2xl border border-white/[0.08]"
    >
      {industries.map((industry, index) => (
        <GalleryColumn
          key={industry.name}
          industry={industry}
          index={index}
          isActive={index === active}
          reduced={reduced}
          entered={entered}
          onFocusStart={() => setActive(index)}
          onFocusEnd={() => setActive((prev) => (prev === index ? null : prev))}
        />
      ))}
    </div>
  );
}
