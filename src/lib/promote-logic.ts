/**
 * Pure reorder logic behind the Careers "promote" transition.
 *
 * Promoting an item makes it the featured (hero) card and pushes the previously
 * featured card to the END of the strip, so the remaining siblings reflow left.
 * That exact ordering is what makes the shared-element cascade read the way the
 * reference motion does — [A, B, C] under hero X → promote B → hero B, [A, C, X].
 *
 * Kept framework-free (ids only, no role shape) so it is trivially unit-testable
 * and reused as the single source of truth by CareersPromote.
 */
export interface PromoteState {
  /** Id of the card currently in the big hero slot. */
  featured: string;
  /** Ordered ids of the cards in the compact strip. */
  strip: string[];
}

/** Promote `id` to hero; demote the old hero to the end of the strip. */
export function promoteReflow(state: PromoteState, id: string): PromoteState {
  if (id === state.featured) return state; // already featured → no-op
  if (!state.strip.includes(id)) return state; // unknown id → no-op
  return {
    featured: id,
    strip: [...state.strip.filter((x) => x !== id), state.featured],
  };
}

/** Build the initial state from an ordered id list + the featured id. */
export function initPromoteState(ids: string[], featuredId: string): PromoteState {
  return { featured: featuredId, strip: ids.filter((id) => id !== featuredId) };
}
