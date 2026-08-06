"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { gsap, useGSAP, CSI_EASE } from "@/lib/gsap/register";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

export type Brand = {
  name: string;
  href?: string;
};

// Diagonal hairline pattern revealed on cell hover. Pure CSS (repeating-linear-gradient),
// no new dependency — see reference/diskusi/interactive-section-bg-2026-07-30.md.
const DIAGONAL_PATTERN =
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 8px)";

const ABSOLUTE_OVERLAY: CSSProperties = { position: "absolute", inset: 0 };

function renderLabel(brand: string | null): ReactNode {
  return brand ? (
    <>
      Trusted by {brand} <span aria-hidden="true">↗</span>
    </>
  ) : (
    "Trusted by Visionaries"
  );
}

// Manual GSAP port of AnimatePresence mode="popLayout": the incoming label
// takes normal flow (sizes the container), the outgoing label is pinned
// absolute over the same box while it fades out — both visible mid-crossfade.
function TrustedByHeading({ hoveredBrand }: { hoveredBrand: string | null }) {
  const slotARef = useRef<HTMLSpanElement>(null);
  const slotBRef = useRef<HTMLSpanElement>(null);
  const prevBrand = useRef(hoveredBrand);
  const [state, setState] = useState<{ active: "a" | "b"; a: ReactNode; b: ReactNode }>({
    active: "a",
    a: renderLabel(hoveredBrand),
    b: null,
  });

  useEffect(() => {
    if (prevBrand.current === hoveredBrand) return;
    prevBrand.current = hoveredBrand;
    setState((prev) => {
      const next = prev.active === "a" ? "b" : "a";
      return { ...prev, active: next, [next]: renderLabel(hoveredBrand) };
    });
  }, [hoveredBrand]);

  useGSAP(
    () => {
      const activeEl = state.active === "a" ? slotARef.current : slotBRef.current;
      const inactiveEl = state.active === "a" ? slotBRef.current : slotARef.current;
      gsap.fromTo(activeEl, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, ease: CSI_EASE });
      if (inactiveEl) {
        gsap.to(inactiveEl, { opacity: 0, y: -6, duration: 0.3, ease: CSI_EASE });
      }
    },
    { dependencies: [state.active] },
  );

  return (
    <span className="relative inline-block">
      <span ref={slotARef} className="inline-block" style={state.active === "a" ? undefined : ABSOLUTE_OVERLAY}>
        {state.a}
      </span>
      <span ref={slotBRef} className="inline-block" style={state.active === "b" ? undefined : ABSOLUTE_OVERLAY}>
        {state.b}
      </span>
    </span>
  );
}

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
      <span
        className={`relative text-lg font-semibold tracking-tight transition-colors duration-300 sm:text-xl ${
          dimmed ? "text-zinc-600" : "text-zinc-300"
        }`}
      >
        {brand.name}
      </span>
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
  const reduced = usePrefersReducedMotion();

  return (
    <div>
      <h2 className="relative text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
        {reduced ? "Trusted by Visionaries" : <TrustedByHeading hoveredBrand={hoveredBrand} />}
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
