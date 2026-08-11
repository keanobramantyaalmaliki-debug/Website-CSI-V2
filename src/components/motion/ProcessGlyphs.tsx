/**
 * Original line-art glyphs, one per Process step. Abstract rather than
 * photographic — same visual language reused in NodeGlyphs so Process and
 * LivingArchitecture read as one system, deliberately distinct from
 * Deployments (which keeps photos as real-world proof).
 *
 * Because the two sections share this glyph language AND sit back-to-back
 * in roomContent.tsx, LivingArchitecture deliberately does NOT reuse
 * Process's layout (full-width heading above, glyph panel sticky on the
 * right). It flips to a sticky heading column on the left with dense,
 * single-line rows on the right instead — otherwise two adjacent sections
 * with near-identical glyphs and near-identical layout would read as a
 * repeat, not a system. Do not "normalize" this back to Process's pattern.
 *
 * Each glyph is a controlled entry-reveal: the parent decides `play` (scroll
 * into view once on mobile, active sticky-panel step on desktop) and the
 * glyph traces itself in via the shared vocabulary in glyphMotion.ts. When
 * `play` goes false the glyph resets to hidden, so re-activating a step
 * replays the reveal instead of only firing once per mount.
 */

import { motion } from "motion/react";
import { makeContainer, makeDraw, makePop, makeFade, makeGrowX } from "./glyphMotion";

type GlyphProps = { play: boolean; reduced: boolean; className?: string };

const BASE = "h-full w-full";

const POP_STYLE = { transformBox: "fill-box", transformOrigin: "center" } as const;
const GROW_STYLE = { transformBox: "fill-box", transformOrigin: "left center" } as const;

export function DiscoveryGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced)}
    >
      <motion.circle cx="100" cy="100" r="60" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="4 6" variants={makeDraw(reduced)} />
      <motion.circle cx="100" cy="100" r="34" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="2 5" variants={makeDraw(reduced)} />
      <motion.path d="M100 40 A60 60 0 0 1 152 70" stroke="#f97316" strokeWidth="2" strokeLinecap="round" variants={makeDraw(reduced)} />
      <motion.g variants={makePop(reduced)} style={POP_STYLE}>
        <circle cx="152" cy="70" r="4" fill="#f97316" />
        <circle cx="152" cy="70" r="8" stroke="#f97316" strokeWidth="1" strokeOpacity="0.5" />
      </motion.g>
      <motion.circle cx="60" cy="140" r="1.5" fill="currentColor" variants={makeFade(reduced, 0.6)} />
      <motion.circle cx="140" cy="150" r="1.5" fill="currentColor" variants={makeFade(reduced, 0.4)} />
      <motion.circle cx="50" cy="80" r="1.5" fill="currentColor" variants={makeFade(reduced, 0.5)} />
    </motion.svg>
  );
}

export function StrategyGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced)}
    >
      <motion.path
        d="M40 150 L80 110 L110 135 L150 60"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1"
        strokeDasharray="3 5"
        variants={makeDraw(reduced)}
      />
      <motion.path d="M110 135 L150 60" stroke="#f97316" strokeWidth="2" strokeLinecap="round" variants={makeDraw(reduced)} />
      <motion.circle cx="40" cy="150" r="3" fill="currentColor" variants={makePop(reduced, 0.6)} style={POP_STYLE} />
      <motion.circle cx="80" cy="110" r="3" fill="currentColor" variants={makePop(reduced, 0.6)} style={POP_STYLE} />
      <motion.circle cx="110" cy="135" r="3" fill="currentColor" variants={makePop(reduced, 0.6)} style={POP_STYLE} />
      <motion.g variants={makePop(reduced)} style={POP_STYLE}>
        <circle cx="150" cy="60" r="5" fill="#f97316" />
        <circle cx="150" cy="60" r="10" stroke="#f97316" strokeWidth="1" strokeOpacity="0.4" />
      </motion.g>
    </motion.svg>
  );
}

export function DesignGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced)}
    >
      <motion.rect x="55" y="65" width="70" height="70" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" variants={makeDraw(reduced)} />
      <motion.rect x="75" y="85" width="70" height="70" stroke="#f97316" strokeWidth="1.5" variants={makePop(reduced)} style={POP_STYLE} />
      <motion.path
        d="M55 65 L75 85 M125 65 L145 85 M55 135 L75 155 M125 135 L145 155"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="1"
        variants={makeDraw(reduced)}
      />
      <motion.circle cx="75" cy="85" r="2.5" fill="#f97316" variants={makePop(reduced)} style={POP_STYLE} />
    </motion.svg>
  );
}

export function DevelopmentGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced)}
    >
      <motion.rect x="50" y="55" width="100" height="90" rx="4" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" variants={makeDraw(reduced)} />
      <motion.line x1="62" y1="75" x2="112" y2="75" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" variants={makeGrowX(reduced)} style={GROW_STYLE} />
      <motion.line x1="62" y1="90" x2="138" y2="90" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" variants={makeGrowX(reduced)} style={GROW_STYLE} />
      <motion.line x1="62" y1="105" x2="95" y2="105" stroke="#f97316" strokeWidth="2" strokeLinecap="round" variants={makeGrowX(reduced)} style={GROW_STYLE} />
      <motion.line x1="62" y1="120" x2="126" y2="120" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" variants={makeGrowX(reduced)} style={GROW_STYLE} />
    </motion.svg>
  );
}

export function TestingGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced, 0.05)}
    >
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <motion.rect
            key={`${row}-${col}`}
            x={62 + col * 30}
            y={62 + row * 30}
            width="22"
            height="22"
            rx="3"
            stroke="currentColor"
            strokeOpacity="0.3"
            strokeWidth="1"
            variants={makePop(reduced)}
            style={POP_STYLE}
          />
        )),
      )}
      <motion.path d="M67 73 L73 79 L83 65" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" variants={makeDraw(reduced)} />
      <motion.path d="M97 103 L103 109 L113 95" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" variants={makeDraw(reduced)} />
    </motion.svg>
  );
}

export function DeploymentGlyph({ play, reduced, className = BASE }: GlyphProps) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      aria-hidden="true"
      initial="hidden"
      animate={play ? "show" : "hidden"}
      variants={makeContainer(reduced)}
    >
      <motion.circle cx="55" cy="60" r="4" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" variants={makePop(reduced)} style={POP_STYLE} />
      <motion.circle cx="55" cy="140" r="4" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" variants={makePop(reduced)} style={POP_STYLE} />
      <motion.circle cx="90" cy="100" r="4" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" variants={makePop(reduced)} style={POP_STYLE} />
      <motion.path d="M59 60 L142 98 M59 140 L142 102" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" variants={makeDraw(reduced)} />
      <motion.path d="M94 100 L142 100" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" variants={makeDraw(reduced)} />
      <motion.g variants={makePop(reduced)} style={POP_STYLE}>
        <circle cx="148" cy="100" r="7" fill="#f97316" />
        <circle cx="148" cy="100" r="13" stroke="#f97316" strokeWidth="1" strokeOpacity="0.4" />
      </motion.g>
    </motion.svg>
  );
}

export const PROCESS_GLYPHS = [
  DiscoveryGlyph,
  StrategyGlyph,
  DesignGlyph,
  DevelopmentGlyph,
  TestingGlyph,
  DeploymentGlyph,
];
