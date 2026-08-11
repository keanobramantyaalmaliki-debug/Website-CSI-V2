"use client";

import { motion, type Transition } from "motion/react";
import {
  ArrowUpRight,
  Code2,
  Layers,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { CareerRole } from "./CareersPromote";

const TAG_ICON: Record<string, LucideIcon> = {
  Growth: TrendingUp,
  Engineering: Code2,
  Product: Layers,
};

/** Same measured feel as the hero so the FLIP between slots reads as one move. */
const SPRING: Transition = { type: "spring", visualDuration: 0.4, bounce: 0 };

/**
 * A compact strip card. It is the interactive element (a real <button>) that
 * promotes its role into the hero. Shares `layoutId` with the hero card of the
 * same role so Framer morphs the box between the two slots.
 */
export default function CareersRoleChip({
  role,
  reduced,
  onPromote,
}: {
  role: CareerRole;
  reduced: boolean;
  onPromote: () => void;
}) {
  const TagIcon = TAG_ICON[role.tag] ?? Layers;

  return (
    <motion.button
      type="button"
      layoutId={role.title}
      layout
      transition={reduced ? { duration: 0 } : SPRING}
      onClick={onPromote}
      aria-label={`Feature the ${role.title} role`}
      style={{ borderRadius: 18 }}
      className="group relative flex h-full w-full flex-col justify-between gap-5 overflow-hidden border border-white/[0.08] bg-white/[0.02] p-5 text-left outline-none transition-colors hover:border-accent/40 focus-visible:border-accent/60"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
          <TagIcon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          {role.tag}
        </span>
        <ArrowUpRight
          className="h-4 w-4 -translate-x-1 text-accent opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
          aria-hidden="true"
        />
      </div>

      <div>
        <motion.h4
          layout="position"
          className="text-sm font-medium text-zinc-100"
        >
          {role.title}
        </motion.h4>
        <p className="mt-1 text-xs text-zinc-500">
          {role.type} · {role.mode}
        </p>
      </div>
    </motion.button>
  );
}
