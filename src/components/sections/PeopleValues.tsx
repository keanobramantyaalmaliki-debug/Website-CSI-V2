"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import { VALUES } from "@/data/people";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * One value on the scroll-linked timeline. Kept as its own component so the
 * per-step `useTransform` hooks stay at the top level — calling them inside the
 * parent's `.map()` would break the rules of hooks the moment VALUES changes.
 */
function ValueStep({
  value,
  index,
  count,
  progress,
  reduced,
}: {
  value: (typeof VALUES)[number];
  index: number;
  count: number;
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  const num = String(index + 1).padStart(2, "0");
  const isLast = index === count - 1;

  // Reveal this value as the timeline reaches it, and grow the connector to the
  // next one across its own slice of the scroll — sequential, not all-at-once.
  const revealBand: [number, number] = [index / count, (index + 0.55) / count];
  const opacity = useTransform(progress, revealBand, [0.15, 1]);
  const y = useTransform(progress, revealBand, [28, 0]);
  const connectorFill = useTransform(
    progress,
    [(index + 0.2) / count, (index + 1) / count],
    [0, 1],
  );

  return (
    <motion.li
      style={reduced ? undefined : { opacity, y }}
      className="relative grid grid-cols-[1.5rem_1fr] gap-x-5"
    >
      {/* Ghost index — decorative depth behind the copy (desktop only, keeps
          mobile clean and avoids any horizontal overflow). */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-4 left-8 hidden select-none text-[8rem] font-bold leading-none text-white/[0.035] sm:block"
      >
        {num}
      </span>

      {/* Rail gutter: marker disc + connector to the next value. Rendering the
          connector per-item (omitted on the last) makes the rail terminate
          exactly on the final marker regardless of copy length. */}
      <div className="relative flex flex-col items-center">
        <span
          aria-hidden
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-accent bg-background text-[10px] font-medium tabular-nums text-accent"
        >
          {num}
        </span>
        {!isLast && (
          <div className="relative mt-1 w-px flex-1">
            <span aria-hidden className="absolute inset-0 bg-white/[0.1]" />
            {reduced ? (
              <span aria-hidden className="absolute inset-0 bg-accent" />
            ) : (
              <motion.span
                aria-hidden
                style={{ scaleY: connectorFill }}
                className="absolute inset-0 origin-top bg-accent"
              />
            )}
          </div>
        )}
      </div>

      {/* Content — generous gap between values gives the scroll enough runway
          for each reveal to read as its own beat (a tight gap makes 1→2 lit up
          almost together). */}
      <div className={isLast ? "pb-0" : "pb-24 sm:pb-32"}>
        <div className="sm:grid sm:grid-cols-[220px_1fr] sm:gap-x-6">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">
              {value.title}
            </h2>
            <p className="mt-2 text-xs tracking-widest text-zinc-500 uppercase">
              {value.tagline}
            </p>
            {value.photo && (
              <img
                src={value.photo}
                alt=""
                className="mt-8 aspect-square w-full max-w-[200px] object-cover grayscale"
                loading="lazy"
              />
            )}
          </div>
          <p className="mt-4 leading-relaxed text-zinc-400 sm:mt-1 sm:self-start sm:pt-1">
            {value.description}
          </p>
        </div>
      </div>
    </motion.li>
  );
}

/**
 * "What We Stand For" — the values rendered as a light, scroll-linked timeline:
 * an accent rail fills and each value lights up in sequence as the section
 * travels through the viewport. No full-screen pin, so the copy stays calm and
 * readable; under `prefers-reduced-motion` every value shows fully, rail filled.
 */
export default function PeopleValues() {
  const reduced = !!useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 90%", "end 45%"],
  });

  return (
    <section ref={sectionRef} id="people-values" className="px-6 py-24 sm:px-10">
      <motion.p
        className="text-xs tracking-widest text-zinc-400 uppercase"
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        What We Stand For
      </motion.p>

      <ol className="mt-12 list-none">
        {VALUES.map((value, i) => (
          <ValueStep
            key={value.title}
            value={value}
            index={i}
            count={VALUES.length}
            progress={scrollYProgress}
            reduced={reduced}
          />
        ))}
      </ol>
    </section>
  );
}
