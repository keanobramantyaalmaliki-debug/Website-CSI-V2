"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import CaseGridMobileStack, {
  type CaseProject,
} from "@/components/sections/CaseGridMobileStack";
import { workProjects } from "@/data/work";
import { sectionHeading } from "@/data/sectionTexts";

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
  // `total - 1` is 0 when the CMS is down to a single project — dividing by it
  // makes every derived value NaN and the card renders at width/opacity NaN,
  // i.e. invisible. Unreachable while the list was a hard-coded array of 8.
  const t = total > 1 ? offset / (total - 1) : 0;
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
  // Clamped, not indexed raw: a CMS list that shrank under a stale `active`
  // yields `undefined` here, and every read below it throws. CaseGrid never
  // renders this with an empty list, so a project always exists at index 0.
  const activeProject = projects[Math.min(active, total - 1)];

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

export default function CaseGrid() {
  const [active, setActive] = useState(0);
  const reduced = !!useReducedMotion();

  /* Dibaca DI DALAM komponen, bukan sebagai konstanta modul: `content.json`
     baru mendarat sesudah `loadContent()` di `main.tsx`, jadi daftar yang
     dihitung saat modulnya diimpor akan membeku pada isi cadangan selamanya —
     tanpa satu pun error. Lihat catatan lengkapnya di `src/data/work.ts`. */
  const projects = useMemo(() => workProjects(), []);
  const baris = useMemo(() => sectionHeading("selected-work"), []);
  const total = projects.length;

  // Re-arms on every `active` change (timer tick or click) — avoids stale closures.
  useEffect(() => {
    if (reduced || total === 0) return;
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % total);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [active, reduced, total]);

  /* Daftar kosong = seksinya tidak ada, bukan seksi kosong berjudul "Selected
     Work" di atas ruang hampa. Editor yang menghapus semua proyeknya memang
     meminta itu; yang penting seksinya tidak MENABRAK, dan tanpa gerbang ini
     ia menabrak — `FanSlider` membaca `projects[0].title`. */
  if (total === 0) return null;

  return (
    <section
      id="case-grid"
      /* pb mobile 80px = SELURUH celah ke CaseStudySpotlight (pt-0 di sana,
         garis border-t-nya jadi duduk dekat judul "Case Studies" — sama
         seperti border-b MeetingLead di atas section ini); aturan 28 Agu,
         lihat PeopleIntro.tsx. ≥sm kembali pb-32. */
      className="section-shell relative z-10 px-3 pb-20 sm:pb-32"
    >
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
            {baris.map((line, i) => (
              <LineMask key={i} delay={i * 0.06}>
                {line}
              </LineMask>
            ))}
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
          projects={projects}
          active={active}
          onSelect={setActive}
          reduced={reduced}
        />
        <div className="mt-4 flex gap-1.5">
          {projects.map((project, index) => (
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

      {/* Mobile — swipeable scroll-snap stack, no auto-rotate */}
      <div className="lg:hidden" data-testid="mobile-stack">
        <CaseGridMobileStack projects={projects} />
      </div>
    </section>
  );
}
