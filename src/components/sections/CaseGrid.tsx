"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const AUTO_ADVANCE_MS = 5000;

// Fan interpolation range — offset 0 (front) to offset (total - 1) (furthest back).
// These are the *design-reference* sizes (tuned at a ~1062px-wide container);
// the slider scales them to the measured container width at render time so
// the fan fills the section instead of leaving empty space on wide screens.
const BASE_BIGGEST_WIDTH = 726;
const BASE_SMALLEST_WIDTH = 280;
const MAX_OPACITY = 1;
const MIN_OPACITY = 0.35;
const MAX_BRIGHTNESS = 1;
const MIN_BRIGHTNESS = 0.5;
// Per-offset-step growth of the right edge — how much of each card behind
// the front one peeks out. Cards shrink faster than a flat x-offset would
// move them, so position is derived from the target right edge (see below)
// rather than a naive `offset * step`, or the fan collapses invisibly under
// the front card.
const BASE_REVEAL_STEP = 48;
const BASE_HEIGHT = 420;

// Bounds on how far the fan is allowed to scale from its reference size —
// keeps cards legible on narrow lg screens and prevents them from becoming
// absurdly large on ultra-wide monitors.
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.8;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

type FanScale = {
  biggestWidth: number;
  smallestWidth: number;
  revealStep: number;
  height: number;
};

type CaseProject = {
  title: string;
  client: string;
  year: string;
  tags: string[];
  image: string;
  outcome?: string;
};

// PLACEHOLDER — replace with actual CSI project screenshots when available.
const PROJECTS: CaseProject[] = [
  {
    title: "Citizen Service Portal",
    client: "Regional Government",
    year: "2024",
    tags: ["Web Platform", "Next.js", "PostgreSQL"],
    image: "https://picsum.photos/seed/csi-citizen-portal/1200/675",
    outcome: "67% faster turnaround",
  },
  {
    title: "SIPD Implementation",
    client: "District Government",
    year: "2023",
    tags: ["Gov Platform", "Training"],
    image: "https://picsum.photos/seed/csi-sipd/1200/675",
    outcome: "200+ staff trained",
  },
  {
    title: "Field Operations Suite",
    client: "State-Owned Infrastructure Co.",
    year: "2023",
    tags: ["Real-time", "Mobile + Web"],
    image: "https://picsum.photos/seed/csi-field-ops/1200/675",
    outcome: "30% cost reduction",
  },
  {
    title: "Cloud Infrastructure Migration",
    client: "Manufacturing Group",
    year: "2024",
    tags: ["Cloud", "DevOps", "Docker"],
    image: "https://picsum.photos/seed/csi-cloud/1200/675",
    outcome: "99.9% uptime achieved",
  },
  {
    title: "Knowledge Assistant",
    client: "Financial Services Firm",
    year: "2024",
    tags: ["LLM", "RAG", "React"],
    image: "https://picsum.photos/seed/csi-knowledge-ai/1200/675",
    outcome: "5,000+ queries/month",
  },
  {
    title: "Analytics Dashboard",
    client: "Government Agency",
    year: "2024",
    tags: ["Data Viz", "Python"],
    image: "https://picsum.photos/seed/csi-analytics/1200/675",
    outcome: "50+ data sources unified",
  },
  {
    title: "Procurement Portal",
    client: "Enterprise Corporation",
    year: "2023",
    tags: ["ERP Integration", "TypeScript"],
    image: "https://picsum.photos/seed/csi-procurement/1200/675",
    outcome: "100% paperless",
  },
  {
    title: "API Gateway & Middleware",
    client: "Telecommunications",
    year: "2024",
    tags: ["API", "Node.js", "Legacy Bridge"],
    image: "https://picsum.photos/seed/csi-api-gateway/1200/675",
    outcome: "Zero-downtime migration",
  },
];

function FanCard({
  project,
  offset,
  total,
  isActive,
  onSelect,
  reduced,
  scale,
}: {
  project: CaseProject;
  offset: number;
  total: number;
  isActive: boolean;
  onSelect: () => void;
  reduced: boolean;
  scale: FanScale;
}) {
  const { biggestWidth, smallestWidth, revealStep } = scale;
  const t = offset / (total - 1);
  const width = biggestWidth - t * (biggestWidth - smallestWidth);
  const opacity = MAX_OPACITY - t * (MAX_OPACITY - MIN_OPACITY);
  const brightness = MAX_BRIGHTNESS - t * (MAX_BRIGHTNESS - MIN_BRIGHTNESS);
  // Right edge grows with offset so each card behind the front one peeks out
  // past it; x is derived from that target edge, not a flat per-step value.
  const x = offset === 0 ? 0 : biggestWidth - width + offset * revealStep;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-label={project.title}
      aria-pressed={isActive}
      className="absolute left-0 top-0 h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]"
      style={{ zIndex: total - offset }}
      animate={{
        width,
        x,
        opacity,
        filter: `brightness(${brightness})`,
      }}
      transition={reduced ? { duration: 0 } : { duration: 0.6, ease: EASE }}
      whileHover={!isActive && !reduced ? { scale: 1.02 } : undefined}
    >
      <img
        src={project.image}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </motion.button>
  );
}

function FanSlider({
  projects,
  active,
  onSelect,
  reduced,
}: {
  projects: CaseProject[];
  active: number;
  onSelect: (index: number) => void;
  reduced: boolean;
}) {
  const total = projects.length;
  const activeProject = projects[active];

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observe = () => setContainerWidth(el.getBoundingClientRect().width);
    observe();
    const ro = new ResizeObserver(observe);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reference fan footprint = biggest card + how far the back card's reveal
  // pushes past it. Unmeasured (containerWidth 0, e.g. first paint or no
  // ResizeObserver support) falls back to scale 1 — the original fixed size.
  const baseFootprint = BASE_BIGGEST_WIDTH + (total - 1) * BASE_REVEAL_STEP;
  const scaleFactor =
    containerWidth > 0
      ? clamp(containerWidth / baseFootprint, MIN_SCALE, MAX_SCALE)
      : 1;

  const scale: FanScale = {
    biggestWidth: BASE_BIGGEST_WIDTH * scaleFactor,
    smallestWidth: BASE_SMALLEST_WIDTH * scaleFactor,
    revealStep: BASE_REVEAL_STEP * scaleFactor,
    height: BASE_HEIGHT * scaleFactor,
  };

  return (
    <div
      ref={containerRef}
      data-testid="fan-slider"
      className="relative w-full overflow-hidden"
      style={{ height: scale.height }}
    >
      {projects.map((project, index) => (
        <FanCard
          key={project.title}
          project={project}
          offset={(index - active + total) % total}
          total={total}
          isActive={index === active}
          onSelect={() => onSelect(index)}
          reduced={reduced}
          scale={scale}
        />
      ))}

      {/* Active-card detail overlay — the only piece that truly mounts/unmounts. */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-full"
        style={{ width: scale.biggestWidth, zIndex: total + 1 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeProject.title}
            initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : -12 }}
            transition={{ duration: reduced ? 0 : 0.4, ease: EASE }}
            className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/25 to-transparent p-6 sm:p-8"
          >
            <p className="font-mono text-xs tracking-widest text-zinc-400">
              {activeProject.client} · {activeProject.year}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-zinc-50">
              {activeProject.title}
            </h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activeProject.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-sm border border-white/[0.15] bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>
            {activeProject.outcome && (
              <p className="mt-3 border-t border-white/[0.15] pt-2 font-mono text-[10px] tracking-wider text-zinc-400">
                {activeProject.outcome}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function MobileStack({ projects }: { projects: CaseProject[] }) {
  return (
    <FadeUpList className="flex flex-col gap-4" tag="div">
      {projects.map((project) => (
        <FadeUpItem
          key={project.title}
          tag="article"
          className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]"
        >
          <img
            src={project.image}
            alt=""
            loading="lazy"
            className="aspect-[16/9] w-full object-cover"
          />
          <div className="flex flex-col gap-2 p-5">
            <p className="font-mono text-xs tracking-widest text-zinc-500">
              {project.client} · {project.year}
            </p>
            <h3 className="text-lg font-semibold text-zinc-100">
              {project.title}
            </h3>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-sm border border-white/[0.08] px-1.5 py-0.5 text-[10px] text-zinc-500"
                >
                  {tag}
                </span>
              ))}
            </div>
            {project.outcome && (
              <p className="border-t border-white/[0.06] pt-2 font-mono text-[10px] tracking-wider text-zinc-500">
                {project.outcome}
              </p>
            )}
          </div>
        </FadeUpItem>
      ))}
    </FadeUpList>
  );
}

export default function CaseGrid() {
  const [active, setActive] = useState(0);
  const reduced = !!useReducedMotion();
  const total = PROJECTS.length;

  // Re-arms on every `active` change (timer tick or click) — avoids stale closures.
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % total);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [active, reduced, total]);

  return (
    <section
      id="case-grid"
      className="relative z-10 px-6 pb-24 sm:px-10 sm:pb-32"
    >
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <motion.p
            className="text-xs tracking-widest text-zinc-400 uppercase"
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            Portfolio
          </motion.p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
            <LineMask>Selected Work</LineMask>
          </h2>
        </div>
        <motion.span
          className="font-mono text-xs text-zinc-600 sm:pb-1"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
        >
          {total} Projects
        </motion.span>
      </div>

      {/* Desktop — staggered fan slider */}
      <div className="hidden lg:block">
        <FanSlider
          projects={PROJECTS}
          active={active}
          onSelect={setActive}
          reduced={reduced}
        />
        <div className="mt-4 flex gap-1.5">
          {PROJECTS.map((project, index) => (
            <button
              key={project.title}
              type="button"
              aria-label={`Show ${project.title}`}
              onClick={() => setActive(index)}
              className={`h-1 w-6 rounded-full transition-colors duration-300 ${
                index === active ? "bg-accent" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Mobile — static vertical stack, no auto-rotate */}
      <div className="lg:hidden" data-testid="mobile-stack">
        <MobileStack projects={PROJECTS} />
      </div>
    </section>
  );
}
