"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
} from "motion/react";
import Disclosure from "@/components/motion/Disclosure";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export type DeploymentData = {
  num: string;
  sector: string;
  region: string;
  desc: string;
};

const IMAGE_SEED: Record<string, string> = {
  "Public Services": "public-services-gov",
  Infrastructure: "infrastructure-network",
  Logistics: "logistics-warehouse",
  Hospitality: "hospitality-interior",
  Communities: "community-urban",
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

const itemVariantsReduced = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

export default function DeploymentRow({ d }: { d: DeploymentData }) {
  const reduced = useReducedMotion();
  const rowRef = useRef<HTMLElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotlight = useMotionTemplate`radial-gradient(280px circle at ${mouseX}px ${mouseY}px, rgba(63,63,70,0.22) 0%, transparent 80%)`;

  function onMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (reduced || !rowRef.current) return;
    const r = rowRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - r.left);
    mouseY.set(e.clientY - r.top);
  }

  const seed = IMAGE_SEED[d.sector] ?? d.sector.toLowerCase().replace(/\s+/g, "-");

  return (
    <motion.article
      ref={rowRef}
      onMouseMove={onMouseMove}
      className="group relative overflow-hidden border-t border-white/[0.08] py-8"
      style={reduced ? undefined : { background: spotlight }}
      variants={reduced ? itemVariantsReduced : itemVariants}
    >
      {/* Hover image reveal: desktop only */}
      {!reduced && (
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100 hidden sm:block"
          aria-hidden="true"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.55) 70%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.55) 70%, transparent 100%)",
          }}
        >
          <img
            src={`https://picsum.photos/seed/${seed}/900/160`}
            alt=""
            className="h-full w-full object-cover grayscale opacity-[0.07]"
            loading="lazy"
          />
        </div>
      )}

      <div className="relative grid gap-3 sm:grid-cols-[5rem_1fr] sm:gap-8">
        {/* Ghost numeral */}
        <span
          className="hidden text-5xl font-mono tabular-nums leading-none text-zinc-600 transition-colors duration-300 group-hover:text-accent sm:block sm:self-start sm:pt-1"
          aria-hidden="true"
        >
          {d.num}
        </span>

        {/* Sector + region chip + desc behind Disclosure */}
        <Disclosure
          triggerClassName="group/row flex w-full items-center gap-3 text-left"
          contentClassName="mt-3"
          trigger={(open) => (
            <>
              <h3 className="flex-1 text-base font-medium text-zinc-200 transition-colors duration-200 group-hover:text-white sm:text-lg">
                {d.sector}
              </h3>
              <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-zinc-300 transition-colors duration-200 group-hover:border-accent/50 group-hover:text-zinc-100">
                {d.region}
              </span>
              <span
                className={`shrink-0 text-sm text-zinc-400 transition-transform duration-200 group-hover:text-zinc-200 ${open ? "rotate-45" : "rotate-0"}`}
                aria-hidden="true"
              >
                +
              </span>
            </>
          )}
        >
          <p className="text-sm leading-relaxed text-zinc-300">{d.desc}</p>
        </Disclosure>
      </div>
    </motion.article>
  );
}
