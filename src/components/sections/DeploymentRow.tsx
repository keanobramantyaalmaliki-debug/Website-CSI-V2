"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
} from "motion/react";

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
      className="group relative overflow-hidden border-t border-zinc-900 py-8"
      style={reduced ? undefined : { background: spotlight }}
      variants={reduced ? itemVariantsReduced : itemVariants}
    >
      {/* Hover image reveal: desktop only, fades in at very low opacity */}
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

      <div className="relative grid gap-3 sm:grid-cols-[5rem_1fr_1fr] sm:gap-8">
        {/* Ghost numeral: enlarged on hover, hidden on mobile */}
        <span
          className="hidden text-5xl font-mono tabular-nums leading-none text-zinc-800 transition-colors duration-300 group-hover:text-zinc-600 sm:block sm:self-start sm:pt-0.5"
          aria-hidden="true"
        >
          {d.num}
        </span>

        {/* Sector + region with arrow indicator */}
        <div>
          <h3 className="font-medium text-zinc-300 transition-colors duration-200 group-hover:text-white">
            {d.sector}
          </h3>
          <p className="mt-1.5 flex items-center gap-1 text-xs text-zinc-600 transition-colors duration-200 group-hover:text-zinc-400">
            {d.region}
            <span
              className="translate-x-0 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100"
              aria-hidden="true"
            >
              &rarr;
            </span>
          </p>
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed text-zinc-500 transition-colors duration-200 group-hover:text-zinc-400">
          {d.desc}
        </p>
      </div>
    </motion.article>
  );
}
