/**
 * fieldMath — pure, framework-free math for the interactive section background.
 *
 * Kept separate from the canvas component so the *behavior* (layout, repulsion,
 * spring) is unit-testable without a real WebGL/2D context (jsdom has none).
 * All positions here are normalized to [0, 1]; the renderer scales them to pixels.
 */

export type FieldVariant = "scatter" | "grid" | "flow" | "gather";

/** Deterministic seedable RNG — so layouts are stable across reloads and testable. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Home positions per variant — the resting layout each particle springs back to.
 * Returns a flat Float32Array of [x0, y0, x1, y1, ...] in [0, 1].
 * Each variant expresses a different "character" for a section.
 */
export function generateHomePositions(
  variant: FieldVariant,
  count: number,
  rng: () => number
): Float32Array {
  const out = new Float32Array(count * 2);

  switch (variant) {
    case "grid": {
      // Ordered lattice — reads as "system / structure".
      const cols = Math.max(1, Math.round(Math.sqrt(count * 1.6)));
      const rows = Math.max(1, Math.ceil(count / cols));
      for (let i = 0; i < count; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const jitter = 0.012;
        out[i * 2] = (c + 0.5) / cols + (rng() - 0.5) * jitter;
        out[i * 2 + 1] = (r + 0.5) / rows + (rng() - 0.5) * jitter;
      }
      break;
    }
    case "flow": {
      // Vertical streams — reads as "process / movement".
      const streams = Math.max(2, Math.round(Math.sqrt(count / 2)));
      for (let i = 0; i < count; i++) {
        const s = i % streams;
        out[i * 2] = (s + 0.5) / streams + (rng() - 0.5) * 0.03;
        out[i * 2 + 1] = rng();
      }
      break;
    }
    case "gather": {
      // Soft cluster toward center — reads as "convergence / focus".
      for (let i = 0; i < count; i++) {
        const t = rng();
        const angle = rng() * Math.PI * 2;
        const radius = 0.12 + Math.sqrt(t) * 0.34; // denser toward middle
        out[i * 2] = 0.5 + Math.cos(angle) * radius;
        out[i * 2 + 1] = 0.5 + Math.sin(angle) * radius * 0.7;
      }
      break;
    }
    case "scatter":
    default: {
      // Wide, even-ish scatter — reads as "space / vision".
      for (let i = 0; i < count; i++) {
        out[i * 2] = rng();
        out[i * 2 + 1] = rng();
      }
      break;
    }
  }

  return out;
}

/**
 * Repulsion displacement: how much a particle is pushed away from the pointer.
 * Returns [fx, fy]. Zero outside `radius`; smooth quadratic falloff inside.
 * `strength` scales the peak push (in the same units as the incoming coords).
 */
export function repelForce(
  particleX: number,
  particleY: number,
  pointerX: number,
  pointerY: number,
  radius: number,
  strength: number
): [number, number] {
  const dx = particleX - pointerX;
  const dy = particleY - pointerY;
  const dist = Math.hypot(dx, dy);
  if (dist >= radius || dist === 0) return [0, 0];
  const falloff = (1 - dist / radius) ** 2; // 1 at pointer → 0 at radius edge
  const scale = (strength * falloff) / dist;
  return [dx * scale, dy * scale];
}

/**
 * One integration step for a single axis: a damped spring pulling `cur` back to
 * `home`, plus an external `force` (the repulsion). Semi-implicit Euler.
 * Returns the next position and velocity.
 */
export function stepAxis(
  cur: number,
  vel: number,
  home: number,
  force: number,
  stiffness: number,
  damping: number,
  dt: number
): { pos: number; vel: number } {
  const accel = (home - cur) * stiffness - vel * damping + force;
  const nextVel = vel + accel * dt;
  const nextPos = cur + nextVel * dt;
  return { pos: nextPos, vel: nextVel };
}

/**
 * Squared distance between two points. Squared (no sqrt) because the network
 * renderer only needs to compare against a threshold — cheaper per frame.
 */
export function distance2(
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/**
 * Line opacity for a connection of squared-distance `d2`, given a squared
 * threshold `max2`. 1 when the two points coincide, 0 at/after the threshold,
 * linear in between. Used to fade network links as nodes drift apart.
 */
export function linkOpacity(d2: number, max2: number): number {
  if (d2 >= max2) return 0;
  return 1 - d2 / max2;
}

/**
 * Ambient self-drift: a small looping offset from `home` driven by time, so the
 * field looks alive with no pointer input. Deterministic per particle via
 * `phase` (derived from its index) so motion is varied, not uniform.
 * Returns [ox, oy] to add to the home position (normalized units).
 */
export function driftOffset(
  time: number,
  phase: number,
  amplitude: number,
  speed: number
): [number, number] {
  const t = time * speed;
  return [
    Math.sin(t + phase) * amplitude,
    Math.cos(t * 0.9 + phase * 1.3) * amplitude,
  ];
}
