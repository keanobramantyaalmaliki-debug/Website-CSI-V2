"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export type Brand = {
  name: string;
  href?: string;
  // Optional monochrome SVG logo. Rendered with fill="currentColor" so it
  // inherits the cell's zinc color and hover/dim transitions; falls back to
  // the wordmark (brand.name) when absent.
  logo?: { viewBox: string; path: string };
};

// Diagonal hairline pattern revealed on cell hover. Pure CSS (repeating-linear-gradient),
// no new dependency — see reference/diskusi/interactive-section-bg-2026-07-30.md.
const DIAGONAL_PATTERN =
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 8px)";

function BrandCell({
  brand,
  hovered,
  dimmed,
  reduced,
  onHoverStart,
  onHoverEnd,
}: {
  brand: Brand;
  hovered: boolean;
  dimmed: boolean;
  reduced: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const Tag = brand.href ? "a" : "div";

  return (
    <Tag
      {...(brand.href ? { href: brand.href, target: "_blank", rel: "noreferrer" } : {})}
      className="group relative flex h-28 items-center justify-center overflow-hidden border border-white/[0.08] sm:h-32"
      onMouseEnter={reduced ? undefined : onHoverStart}
      onMouseLeave={reduced ? undefined : onHoverEnd}
      onFocus={reduced ? undefined : onHoverStart}
      onBlur={reduced ? undefined : onHoverEnd}
      onTouchStart={reduced ? undefined : onHoverStart}
      onTouchEnd={reduced ? undefined : onHoverEnd}
    >
      {!reduced && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: DIAGONAL_PATTERN,
            opacity: hovered ? 1 : 0,
            transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
          }}
          aria-hidden="true"
        />
      )}
      {brand.logo ? (
        <svg
          viewBox={brand.logo.viewBox}
          role="img"
          aria-label={brand.name}
          className={`relative h-8 w-auto transition-colors duration-300 sm:h-9 ${
            dimmed ? "text-zinc-600" : "text-zinc-300"
          }`}
          fill="currentColor"
        >
          <title>{brand.name}</title>
          <path d={brand.logo.path} />
        </svg>
      ) : (
        <span
          className={`relative text-lg font-semibold tracking-tight transition-colors duration-300 sm:text-xl ${
            dimmed ? "text-zinc-600" : "text-zinc-300"
          }`}
        >
          {brand.name}
        </span>
      )}
    </Tag>
  );
}

/**
 * Grid client logos with live-swapping heading on hover:
 * "Trusted by Visionaries" -> "Trusted by {Brand} ↗".
 * Reduced-motion: static grid, no hover-swap listeners, heading stays default.
 */
export default function TrustedByGrid({ brands }: { brands: Brand[] }) {
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);
  const reduced = !!useReducedMotion();

  return (
    <div>
      <h2 className="relative text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
        {reduced ? (
          "Trusted by Visionaries"
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.span
              key={hoveredBrand ?? "default"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="inline-block"
            >
              {hoveredBrand ? (
                <>
                  Trusted by {hoveredBrand} <span aria-hidden="true">↗</span>
                </>
              ) : (
                "Trusted by Visionaries"
              )}
            </motion.span>
          </AnimatePresence>
        )}
      </h2>

      <div className="mt-12 grid grid-cols-2 gap-0 sm:grid-cols-3 md:grid-cols-4">
        {brands.map((brand) => (
          <BrandCell
            key={brand.name}
            brand={brand}
            reduced={reduced}
            hovered={hoveredBrand === brand.name}
            dimmed={!reduced && hoveredBrand !== null && hoveredBrand !== brand.name}
            onHoverStart={() => setHoveredBrand(brand.name)}
            onHoverEnd={() => setHoveredBrand(null)}
          />
        ))}
      </div>
    </div>
  );
}
