/**
 * Shared entry-reveal variant language for ProcessGlyphs — one vocabulary
 * (draw / pop / fade / grow-x) reused across all 6 glyphs so they read as
 * one system instead of six one-off animations. Every factory takes
 * `reduced`: when true, "hidden" collapses to the same values as "show" so
 * the glyph renders in its final state instantly, no motion.
 */

export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Orchestrates when its children (or nested group) reveal, in DOM order. */
export function makeContainer(reduced: boolean, stagger = 0.08) {
  return {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : stagger } },
  };
}

/** Stroked lines/circles/rects that trace themselves in via pathLength. */
export function makeDraw(reduced: boolean) {
  return {
    hidden: { pathLength: reduced ? 1 : 0, opacity: reduced ? 1 : 0 },
    show: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: reduced ? 0 : 0.6, ease: EASE },
    },
  };
}

/** Nodes/points that scale in. `toOpacity` preserves a dimmed final state. */
export function makePop(reduced: boolean, toOpacity = 1) {
  return {
    hidden: { scale: reduced ? 1 : 0, opacity: reduced ? toOpacity : 0 },
    show: {
      scale: 1,
      opacity: toOpacity,
      transition: { duration: reduced ? 0 : 0.4, ease: EASE },
    },
  };
}

/** Opacity-only fade. `toOpacity` preserves a dimmed final state. */
export function makeFade(reduced: boolean, toOpacity = 1) {
  return {
    hidden: { opacity: reduced ? toOpacity : 0 },
    show: {
      opacity: toOpacity,
      transition: { duration: reduced ? 0 : 0.4, ease: EASE },
    },
  };
}

/** Horizontal scale-in for "typing" rows — pair with left-center origin. */
export function makeGrowX(reduced: boolean) {
  return {
    hidden: { scaleX: reduced ? 1 : 0, opacity: reduced ? 1 : 0 },
    show: {
      scaleX: 1,
      opacity: 1,
      transition: { duration: reduced ? 0 : 0.4, ease: EASE },
    },
  };
}
