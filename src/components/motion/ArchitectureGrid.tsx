"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { NODE_GLYPHS } from "@/components/motion/NodeGlyphs";
import { useScrollStepper } from "@/lib/hooks/useScrollStepper";
import type { ArchitectureNode } from "@/data/architectureNodes";
import { cn } from "@/lib/utils";

const EASE_CSS = "cubic-bezier(0.16,1,0.3,1)";

// Diagonal hairline revealed behind the focused cell — a pure-CSS
// repeating-linear-gradient (no dependency), giving the focused cell a subtle
// textured ground that sets it apart from the dimmed ones.
const DIAGONAL_PATTERN =
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 8px)";

/**
 * Fine-pointer detection. Drives the grid's focus model:
 *   - hover-capable (desktop) → the hovered cell is the focused one
 *   - touch (mobile)          → the scroll-centered cell is the focused one
 * Defaults to true so desktop paints correctly on first render; the effect
 * flips it on touch devices after mount.
 */
function useCanHover() {
  const [canHover, setCanHover] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia?.("(hover: hover) and (pointer: fine)");
    if (!mq) return;
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return canHover;
}

function GroupLabel({ group, showConnector }: { group: string; showConnector: boolean }) {
  return (
    <div className={cn(showConnector && "pt-12")}>
      {showConnector && (
        <p className="pb-3 text-xs text-zinc-600" aria-hidden="true">
          ↓ runs on
        </p>
      )}
      <span className="text-xs tracking-widest text-zinc-500 uppercase">{group}</span>
    </div>
  );
}

function NodeCell({
  node,
  index,
  glyphPlay,
  focused,
  dimmed,
  reduced,
  canHover,
  setRef,
  onFocusStart,
  onFocusEnd,
}: {
  node: ArchitectureNode;
  index: number;
  glyphPlay: boolean;
  focused: boolean;
  dimmed: boolean;
  reduced: boolean;
  canHover: boolean;
  setRef: (el: HTMLElement | null) => void;
  onFocusStart: () => void;
  onFocusEnd: () => void;
}) {
  const Glyph = NODE_GLYPHS[index];
  const interactive = !reduced && canHover;

  return (
    <div
      ref={setRef}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`${node.name}. ${node.desc}`}
      onMouseEnter={interactive ? onFocusStart : undefined}
      onMouseLeave={interactive ? onFocusEnd : undefined}
      onFocus={interactive ? onFocusStart : undefined}
      onBlur={interactive ? onFocusEnd : undefined}
      className="group relative flex h-56 flex-col items-center justify-center gap-3 overflow-hidden border border-white/[0.08] px-6 text-center outline-none sm:h-60"
    >
      {!reduced && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{ background: DIAGONAL_PATTERN, opacity: focused ? 1 : 0, transitionTimingFunction: EASE_CSS }}
          aria-hidden="true"
        />
      )}

      <span
        className={cn(
          "relative text-[0.65rem] tabular-nums tracking-widest transition-colors duration-300",
          focused ? "text-zinc-400" : "text-zinc-600",
        )}
      >
        {node.num}
      </span>

      <div
        className={cn(
          "relative h-14 w-14 transition-colors duration-300",
          focused ? "text-zinc-200" : dimmed ? "text-zinc-700" : "text-zinc-500",
        )}
      >
        <Glyph play={reduced || glyphPlay} reduced={reduced} />
      </div>

      <h3
        className={cn(
          "relative text-base font-medium tracking-tight transition-colors duration-300 sm:text-lg",
          focused ? "text-zinc-100" : dimmed ? "text-zinc-600" : "text-zinc-300",
        )}
      >
        {node.name}
      </h3>

      {/* Desc stays in the DOM (readable by AT and reduced-motion users) and
          reserves its own height, so revealing it never reflows the grid —
          only its opacity/offset animate. */}
      <p
        className="relative max-w-[16rem] text-sm leading-relaxed text-zinc-400"
        style={
          reduced
            ? undefined
            : {
                opacity: focused ? 1 : 0,
                transform: focused ? "translateY(0px)" : "translateY(4px)",
                transition: `opacity 0.35s ${EASE_CSS}, transform 0.35s ${EASE_CSS}`,
              }
        }
      >
        {node.desc}
      </p>
    </div>
  );
}

/**
 * Living Architecture as an interactive glyph grid. Name + glyph are always
 * visible; the description is the payload that reveals on focus. One "focused
 * node" concept, two drivers:
 *   - desktop (hover-capable): the cell under the pointer is focused
 *   - mobile (touch): the scroll-centered cell is focused, via useScrollStepper
 * Focused cell brightens + shows its desc; the rest dim. Reduced-motion: every
 * desc is shown, no dimming, no listeners.
 */
export default function ArchitectureGrid({ nodes }: { nodes: ArchitectureNode[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { activeIndex, setRef } = useScrollStepper(nodes.length);
  const reduced = !!useReducedMotion();
  const canHover = useCanHover();

  const gridRef = useRef<HTMLDivElement>(null);
  const entered = useInView(gridRef, { once: true, margin: "0px 0px -80px 0px" });
  const glyphsPlay = reduced || entered;

  // Which node is "focused": pointer on desktop, scroll on mobile. null on
  // desktop until the user hovers, so the grid has a calm resting state.
  const focusIndex = reduced ? null : canHover ? hoveredIndex : activeIndex;
  const anyFocused = focusIndex !== null;

  // Preserve narrative order while splitting into the labelled Foundation/Flow
  // bands, carrying each node's global index for glyph + scroll-ref pairing.
  const bands: { group: string; items: { node: ArchitectureNode; index: number }[] }[] = [];
  nodes.forEach((node, index) => {
    const last = bands[bands.length - 1];
    if (!last || last.group !== node.group) bands.push({ group: node.group, items: [] });
    bands[bands.length - 1].items.push({ node, index });
  });

  return (
    <div ref={gridRef}>
      {bands.map((band, bandIndex) => (
        <section key={band.group} aria-label={band.group}>
          <GroupLabel group={band.group} showConnector={bandIndex > 0} />
          <div className="mt-5 grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-4">
            {band.items.map(({ node, index }) => (
              <NodeCell
                key={node.name}
                node={node}
                index={index}
                glyphPlay={glyphsPlay}
                focused={index === focusIndex}
                dimmed={anyFocused && index !== focusIndex}
                reduced={reduced}
                canHover={canHover}
                setRef={setRef(index)}
                onFocusStart={() => setHoveredIndex(index)}
                onFocusEnd={() => setHoveredIndex(null)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
