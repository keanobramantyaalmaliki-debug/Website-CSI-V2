"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import { motion, useReducedMotion } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const AUTO_ADVANCE_MS = 5000;

// Card size/opacity formula ported from basement.studio's staggered-slider
// (lab.basement.studio/experiments/58.staggered-slider.tsx): front card is
// biggest and fully opaque, each card behind shrinks and dims linearly.
// Scaled down from their 726px/280px (full-bleed photos) to card-sized
// values since ours hold a glyph + label, not a photo.
const BIGGEST_SIZE = 320;
const SMALLEST_SIZE = 140;
const MAX_OPACITY = 1;
const MIN_OPACITY = 0.4;

export type SliderNode = {
  name: string;
  desc: string;
  Glyph: ComponentType<{ className?: string }>;
};

function NodeFigure({
  node,
  displayIndex,
  total,
  onSelect,
}: {
  node: SliderNode;
  displayIndex: number;
  total: number;
  onSelect: () => void;
}) {
  const divisor = Math.max(total - 1, 1);
  const size = BIGGEST_SIZE - ((BIGGEST_SIZE - SMALLEST_SIZE) * displayIndex) / divisor;
  const opacity = MAX_OPACITY - ((MAX_OPACITY - MIN_OPACITY) * displayIndex) / divisor;
  const { Glyph } = node;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      data-active={displayIndex === 0 ? "true" : "false"}
      aria-label={`${node.name} — bring to front`}
      className="absolute top-1/2 -translate-y-1/2 flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-left"
      initial={false}
      animate={{
        width: size,
        height: size,
        left: `calc((100% - ${size}px) * ${displayIndex} / ${divisor})`,
        opacity,
        zIndex: total - displayIndex,
      }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <span className="size-2 rounded-full bg-orange-500" aria-hidden="true" />
      <div className="text-orange-500/80" style={{ width: size * 0.3, height: size * 0.3 }}>
        <Glyph className="h-full w-full" />
      </div>
      <h3 className="font-medium text-zinc-50">{node.name}</h3>
    </motion.button>
  );
}

function StaticGrid({ nodes }: { nodes: SliderNode[] }) {
  return (
    <div className="grid grid-cols-4 gap-4" data-testid="glyph-slider-static">
      {nodes.map((node) => {
        const { Glyph } = node;
        return (
          <div
            key={node.name}
            className="flex h-40 flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
          >
            <div className="h-10 w-10 text-orange-500/80">
              <Glyph className="h-full w-full" />
            </div>
            <h3 className="text-sm font-medium text-zinc-50">{node.name}</h3>
          </div>
        );
      })}
    </div>
  );
}

export default function StaggeredGlyphSlider({ nodes }: { nodes: SliderNode[] }) {
  const total = nodes.length;
  const reduced = !!useReducedMotion();
  const [order, setOrder] = useState<number[]>(() => nodes.map((_, i) => i));

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setOrder((prev) => [...prev.slice(1), prev[0]]);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [reduced]);

  const handleSelect = useCallback((originalIndex: number) => {
    setOrder((prev) => {
      const pos = prev.indexOf(originalIndex);
      if (pos <= 0) return prev;
      return [originalIndex, ...prev.slice(0, pos), ...prev.slice(pos + 1)];
    });
  }, []);

  if (reduced) {
    return <StaticGrid nodes={nodes} />;
  }

  return (
    <div className="relative h-[28rem] w-full" data-testid="glyph-slider">
      {order.map((originalIndex, displayIndex) => (
        <NodeFigure
          key={nodes[originalIndex].name}
          node={nodes[originalIndex]}
          displayIndex={displayIndex}
          total={total}
          onSelect={() => handleSelect(originalIndex)}
        />
      ))}
    </div>
  );
}
