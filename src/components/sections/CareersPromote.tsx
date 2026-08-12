"use client";

import { useCallback, useRef, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { initPromoteState, promoteReflow } from "@/lib/promote-logic";
import CareersRoleHero from "./CareersRoleHero";
import CareersRoleChip from "./CareersRoleChip";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export type CareerRole = {
  /** Stable identity — this is the shared-element `layoutId` key. */
  title: string;
  type: string;
  mode: string;
  tag: string;
  blurb: string;
};

/**
 * Shared-element "promote" transition for the Careers roles.
 *
 * One role lives in a big HERO slot, the other three in a compact STRIP.
 * Clicking a strip card promotes it into the hero while the old hero is demoted
 * to the end of the strip; because every card keeps a stable `layoutId`, Framer
 * FLIP-animates each between the two slots. Reorder logic lives in the tested,
 * framework-free `promoteReflow`.
 */
export default function CareersPromote({ roles }: { roles: CareerRole[] }) {
  const reduced = useReducedMotion();

  const byId = useCallback(
    (id: string) => roles.find((r) => r.title === id) as CareerRole,
    [roles],
  );

  // Single state object so promote is one atomic, StrictMode-safe updater.
  const [state, setState] = useState(() =>
    initPromoteState(
      roles.map((r) => r.title),
      roles[0]?.title ?? "",
    ),
  );

  const heroRef = useRef<HTMLElement>(null);

  const promote = useCallback((id: string) => {
    setState((s) => promoteReflow(s, id));
    // The clicked chip becomes the hero, so its old node unmounts — move focus
    // to the freshly promoted hero so keyboard users land on it.
    requestAnimationFrame(() => heroRef.current?.focus());
  }, []);

  const featured = byId(state.featured);
  if (!featured) return null;

  return (
    <LayoutGroup>
      <motion.div
        className="mt-12 flex flex-col gap-4"
        initial={reduced ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "0px 0px -60px 0px" }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        {/* z-0: the hero is a Framer `layout` element (transform → own stacking
            context). Pinning it below the strip stops its transparent box from
            drifting over the strip during scroll re-projection and eating the
            strip's clicks. */}
        <div className="relative z-0">
          {/* key remounts the hero per feature so each promote is a clean
              entering-hero ↔ exiting-chip pair. Without it the hero is one
              persistent node that just swaps layoutId, and Framer picks the
              unmounting chip as the layout "lead" — dragging the hero down to
              the chip's 437×118 box at opacity 0 (it "disappears"). */}
          <CareersRoleHero
            key={featured.title}
            ref={heroRef}
            role={featured}
            reduced={!!reduced}
          />
        </div>

        {/* z-10 keeps the strip above the hero; buttons are direct grid items
            (no `display:contents` wrapper) so Framer measures them cleanly. */}
        <div
          role="group"
          aria-label="Other open roles"
          className="relative z-10 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {state.strip.map((id) => (
            <CareersRoleChip
              key={id}
              role={byId(id)}
              reduced={!!reduced}
              onPromote={() => promote(id)}
            />
          ))}
        </div>
      </motion.div>
    </LayoutGroup>
  );
}
