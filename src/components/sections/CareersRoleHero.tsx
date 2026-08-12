"use client";

import { forwardRef, useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  type Transition,
} from "motion/react";
import { Code2, Layers, TrendingUp, type LucideIcon } from "lucide-react";
import type { CareerRole } from "./CareersPromote";

const TAG_ICON: Record<string, LucideIcon> = {
  Growth: TrendingUp,
  Engineering: Code2,
  Product: Layers,
};

/** ~0.4s perceived settle, no overshoot — the measured "promote" feel. */
const SPRING: Transition = { type: "spring", visualDuration: 0.4, bounce: 0 };

/** Masked band that sweeps the accent icon across its gray base, on loop. */
const SWEEP_MASK = {
  maskImage: "linear-gradient(115deg, transparent 35%, black 50%, transparent 65%)",
  WebkitMaskImage:
    "linear-gradient(115deg, transparent 35%, black 50%, transparent 65%)",
  maskSize: "300% 100%",
  WebkitMaskSize: "300% 100%",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
} as const;

/**
 * The big featured card. Shares its `layoutId` with the strip chip of the same
 * role so Framer FLIP-morphs position + size on promote. The extra hero-only
 * blurb is what makes the larger size carry information, not just scale.
 *
 * The parent gives this a `key={role.title}` so each promote remounts the hero
 * as a fresh entering element — Framer then pairs it with the exiting chip and
 * morphs chip → hero, instead of dragging a persistent node into the chip.
 */
const CareersRoleHero = forwardRef<
  HTMLElement,
  { role: CareerRole; reduced: boolean }
>(function CareersRoleHero({ role, reduced }, ref) {
    const cardRef = useRef<HTMLElement | null>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const spotlight = useMotionTemplate`radial-gradient(320px circle at ${mouseX}px ${mouseY}px, var(--accent-soft) 0%, transparent 80%)`;

    function onMouseMove(e: React.MouseEvent<HTMLElement>) {
      if (reduced || !cardRef.current) return;
      const r = cardRef.current.getBoundingClientRect();
      mouseX.set(e.clientX - r.left);
      mouseY.set(e.clientY - r.top);
    }

    const TagIcon = TAG_ICON[role.tag] ?? Layers;

    return (
      <motion.article
        ref={(node: HTMLElement | null) => {
          cardRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        layoutId={role.title}
        layout
        transition={reduced ? { duration: 0 } : SPRING}
        tabIndex={-1}
        onMouseMove={onMouseMove}
        style={{ borderRadius: 24 }}
        className="group relative flex min-h-[19rem] flex-col justify-between overflow-hidden border border-white/[0.08] bg-white/[0.02] p-7 outline-none focus-visible:border-accent/60 sm:p-9"
        data-testid="career-hero"
      >
        {/* Cursor-follow spotlight: desktop only, layered behind content. */}
        {!reduced && (
          <motion.div
            data-testid="spotlight"
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{ background: spotlight }}
          />
        )}

        <div className="relative flex items-start justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-300">
            <TagIcon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            {role.tag}
          </span>

          {/* Career-field visual box: desktop only. */}
          <div
            data-testid="career-field"
            className="relative hidden h-24 w-36 shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] sm:block"
          >
            {reduced ? (
              <TagIcon
                className="pointer-events-none absolute inset-0 m-auto h-8 w-8 text-accent"
                aria-hidden="true"
              />
            ) : (
              <>
                <TagIcon
                  className="pointer-events-none absolute inset-0 m-auto h-8 w-8 text-zinc-600"
                  aria-hidden="true"
                />
                <TagIcon
                  data-testid="career-field-sweep"
                  className="pointer-events-none absolute inset-0 m-auto h-8 w-8 animate-[careers-icon-sweep_2.4s_linear_infinite] text-accent"
                  aria-hidden="true"
                  style={SWEEP_MASK}
                />
              </>
            )}
          </div>
        </div>

        <div className="relative">
          <motion.h3
            layout="position"
            className="max-w-md text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl"
          >
            {role.title}
          </motion.h3>
          <p className="mt-1 text-xs text-zinc-400">
            {role.type} · {role.mode}
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-300">
            {role.blurb}
          </p>
        </div>
      </motion.article>
    );
  },
);

export default CareersRoleHero;
