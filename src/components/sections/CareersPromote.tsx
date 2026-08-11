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
  applyHref: string;
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
    // to the freshly promoted hero so keyboard users land on the Apply action.
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
        <CareersRoleHero ref={heroRef} role={featured} reduced={!!reduced} />

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {state.strip.map((id) => (
            <li key={id} className="contents">
              <CareersRoleChip
                role={byId(id)}
                reduced={!!reduced}
                onPromote={() => promote(id)}
              />
            </li>
          ))}
        </ul>
      </motion.div>
    </LayoutGroup>
  );
}
