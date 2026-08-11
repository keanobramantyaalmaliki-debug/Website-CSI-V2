/**
 * Original circuit/node-diagram glyphs, one per LivingArchitecture node.
 * Shares the line-art visual language of ProcessGlyphs — a system diagram
 * fits "Living Architecture" better than a stock photo, and matching
 * Process's style makes Deployments (the one section keeping photos) read
 * as a deliberate contrast rather than an inconsistency.
 *
 * viewBox is cropped to the artwork's bounding box (x 52-144, y 54-152) so
 * the glyph fills the frame instead of floating in unused margin, and every
 * stroked element uses non-scaling-stroke so strokeWidth renders in screen
 * pixels regardless of how small the viewBox is scaled down to.
 *
 * Each glyph is a controlled entry-reveal, same vocabulary and mechanism as
 * ProcessGlyphs.tsx: the parent decides `play` and the glyph traces itself in
 * via glyphMotion.ts. When `play` goes false the glyph resets to hidden, so a
 * parent that toggles `play` replays the reveal instead of only firing once
 * per mount. ArchitectureGrid drives `play` from a single in-view gate (all
 * glyphs trace in together as the grid enters), so focus/dim there is carried
 * by color, not by replaying the glyph.
 *
 * Timings are tuned much faster than ProcessGlyphs' defaults (0.03s stagger,
 * 0.18s draw, 0.15s pop vs. 0.08/0.6/0.4) because these rows are short
 * (~110-140px) and activeIndex can advance every row on a normal scroll —
 * ProcessGlyphs' slower reveal was still mid-draw when the next node became
 * active, so `play` flipped to false and the stroke visibly snapped back to
 * hidden before finishing. The full reveal now completes in ~0.3s.
 */

import { motion } from "motion/react";
import { makeContainer, makeDraw, makePop } from "./glyphMotion";

type GlyphProps = { play: boolean; reduced: boolean; className?: string };

const BASE = "h-full w-full";

const POP_STYLE = { transformBox: "fill-box", transformOrigin: "center" } as const;

export function CitizenGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="48 48 108 108"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced, 0.03)}
      data-active={play ? "true" : "false"}
    >
      <motion.circle cx="100" cy="72" r="18" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" vectorEffect="non-scaling-stroke" variants={makeDraw(reduced, 0.18)} />
      <motion.path d="M68 140 Q100 108 132 140" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" vectorEffect="non-scaling-stroke" variants={makeDraw(reduced, 0.18)} />
      <motion.circle cx="100" cy="72" r="4" fill="#f97316" variants={makePop(reduced, 1, 0.15)} style={POP_STYLE} />
      <motion.circle cx="60" cy="150" r="2" fill="currentColor" opacity="0.8" variants={makePop(reduced, 0.8, 0.15)} style={POP_STYLE} />
      <motion.circle cx="140" cy="150" r="2" fill="currentColor" opacity="0.8" variants={makePop(reduced, 0.8, 0.15)} style={POP_STYLE} />
    </motion.svg>
  );
}

export function OperationsGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="48 48 108 108"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced, 0.03)}
      data-active={play ? "true" : "false"}
    >
      <motion.path
        d="M100 60 A40 40 0 1 1 60 100"
        stroke="currentColor"
        strokeOpacity="0.7"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        variants={makeDraw(reduced, 0.18)}
      />
      <motion.path d="M60 100 L52 90 M60 100 L70 94" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" vectorEffect="non-scaling-stroke" variants={makeDraw(reduced, 0.18)} />
      <motion.circle cx="100" cy="60" r="4" fill="#f97316" variants={makePop(reduced, 1, 0.15)} style={POP_STYLE} />
      <motion.rect x="94" y="94" width="12" height="12" rx="2" stroke="#f97316" strokeWidth="1.5" vectorEffect="non-scaling-stroke" variants={makePop(reduced, 1, 0.15)} style={POP_STYLE} />
    </motion.svg>
  );
}

export function KnowledgeGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="48 48 108 108"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced, 0.03)}
      data-active={play ? "true" : "false"}
    >
      <motion.rect x="65" y="55" width="70" height="16" rx="3" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" vectorEffect="non-scaling-stroke" variants={makeDraw(reduced, 0.18)} />
      <motion.rect x="65" y="79" width="70" height="16" rx="3" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" vectorEffect="non-scaling-stroke" variants={makeDraw(reduced, 0.18)} />
      <motion.rect x="65" y="103" width="70" height="16" rx="3" stroke="#f97316" strokeWidth="1.5" vectorEffect="non-scaling-stroke" variants={makeDraw(reduced, 0.18)} />
      <motion.circle cx="76" cy="111" r="2" fill="#f97316" variants={makePop(reduced, 1, 0.15)} style={POP_STYLE} />
    </motion.svg>
  );
}

export function InfrastructureGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="48 48 108 108"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced, 0.03)}
      data-active={play ? "true" : "false"}
    >
      <motion.circle cx="70" cy="70" r="5" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" vectorEffect="non-scaling-stroke" variants={makeDraw(reduced, 0.18)} />
      <motion.circle cx="130" cy="70" r="5" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" vectorEffect="non-scaling-stroke" variants={makeDraw(reduced, 0.18)} />
      <motion.circle cx="100" cy="120" r="5" fill="#f97316" variants={makePop(reduced, 1, 0.15)} style={POP_STYLE} />
      <motion.path d="M74 74 L96 116 M126 74 L104 116" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" vectorEffect="non-scaling-stroke" variants={makeDraw(reduced, 0.18)} />
      <motion.path d="M75 70 L125 70" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" vectorEffect="non-scaling-stroke" variants={makeDraw(reduced, 0.18)} />
    </motion.svg>
  );
}

export function IntelligenceGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="48 48 108 108"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced, 0.03)}
      data-active={play ? "true" : "false"}
    >
      <motion.path
        d="M60 110 L82 80 L104 100 L140 65"
        stroke="currentColor"
        strokeOpacity="0.7"
        strokeWidth="1"
        strokeDasharray="3 4"
        vectorEffect="non-scaling-stroke"
        variants={makeDraw(reduced, 0.18)}
      />
      <motion.path d="M104 100 L140 65" stroke="#f97316" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" variants={makeDraw(reduced, 0.18)} />
      <motion.circle cx="140" cy="65" r="4" fill="#f97316" variants={makePop(reduced, 1, 0.15)} style={POP_STYLE} />
      <motion.circle cx="60" cy="110" r="2" fill="currentColor" opacity="0.8" variants={makePop(reduced, 0.8, 0.15)} style={POP_STYLE} />
      <motion.circle cx="82" cy="80" r="2" fill="currentColor" opacity="0.8" variants={makePop(reduced, 0.8, 0.15)} style={POP_STYLE} />
    </motion.svg>
  );
}

export function DecisionGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="48 48 108 108"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced, 0.03)}
      data-active={play ? "true" : "false"}
    >
      <motion.path d="M100 55 L135 100 L100 145 L65 100 Z" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" vectorEffect="non-scaling-stroke" variants={makeDraw(reduced, 0.18)} />
      <motion.path d="M100 55 L135 100 L100 145" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" variants={makeDraw(reduced, 0.18)} />
      <motion.circle cx="100" cy="100" r="3" fill="#f97316" variants={makePop(reduced, 1, 0.15)} style={POP_STYLE} />
    </motion.svg>
  );
}

export function ActionGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="48 48 108 108"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced, 0.03)}
      data-active={play ? "true" : "false"}
    >
      <motion.circle cx="100" cy="100" r="42" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" variants={makeDraw(reduced, 0.18)} />
      <motion.path d="M100 70 L100 130 M76 100 L124 100" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" vectorEffect="non-scaling-stroke" variants={makeDraw(reduced, 0.18)} />
      <motion.path d="M100 100 L128 78" stroke="#f97316" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" variants={makeDraw(reduced, 0.18)} />
      <motion.circle cx="128" cy="78" r="4" fill="#f97316" variants={makePop(reduced, 1, 0.15)} style={POP_STYLE} />
    </motion.svg>
  );
}

export const NODE_GLYPHS = [
  CitizenGlyph,
  OperationsGlyph,
  KnowledgeGlyph,
  InfrastructureGlyph,
  IntelligenceGlyph,
  DecisionGlyph,
  ActionGlyph,
];
