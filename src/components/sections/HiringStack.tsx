"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import { cn } from "@/lib/utils";

export type HireStage = {
  step: string;
  title: string;
  blurb: string;
  image: string;
  alt: string;
};

/**
 * Scroll-driven "stacking cards" for the How We Hire journey — reimplemented
 * on motion/react (the engine the rest of the site already uses) instead of
 * pulling in GSAP + ScrollTrigger for a single section. Each card pins with
 * `position: sticky` and the earlier cards scale down as the next slides over
 * them, driven by a single `useScroll` progress value.
 *
 * Images are hotlinked from the Unsplash CDN (Unsplash License: free for
 * commercial use, no attribution required) on purpose — no binaries are added
 * to /public. Swap any URL freely; the component renders whatever is here.
 */
const HIRE_STAGES: HireStage[] = [
  {
    step: "01",
    title: "Application",
    blurb:
      "Send us your work and a few lines on what you want to build. No cover-letter theatre — show us something real.",
    image:
      "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=70",
    alt: "A tidy desk with a laptop where an application takes shape.",
  },
  {
    step: "02",
    title: "Conversation",
    blurb:
      "A relaxed intro call. We get to know you; you get to grill us about the team, the work, and how we actually operate.",
    image:
      "https://images.unsplash.com/photo-1552581234-26160f608093?auto=format&fit=crop&w=1200&q=70",
    alt: "Two colleagues in an easy conversation across a table.",
  },
  {
    step: "03",
    title: "Practical Challenge",
    blurb:
      "A scoped, real-world task — the kind of problem you'd actually meet here. Paid, time-boxed, and yours to keep.",
    image:
      "https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?auto=format&fit=crop&w=1200&q=70",
    alt: "A laptop screen full of code during a practical challenge.",
  },
  {
    step: "04",
    title: "Final Interview",
    blurb:
      "Meet the people you'll build with. We walk through your challenge together and map how you'd grow with us.",
    image:
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=70",
    alt: "A small team meeting around a table for a final interview.",
  },
  {
    step: "05",
    title: "Welcome Aboard",
    blurb:
      "Offer signed, laptop shipped, first-week buddy assigned. You're one of us from day one.",
    image:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=70",
    alt: "A team working together, welcoming a new member aboard.",
  },
];

function StageCardBody({ stage, total }: { stage: HireStage; total: number }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-900 shadow-2xl shadow-black/40">
      <img
        src={stage.image}
        alt={stage.alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-55"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
      <div className="relative flex h-full flex-col justify-end gap-3 p-8 sm:p-10">
        <span className="font-mono text-sm tracking-widest text-orange-500">
          {stage.step} / {String(total).padStart(2, "0")}
        </span>
        <h3 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          {stage.title}
        </h3>
        <p className="max-w-md text-sm leading-relaxed text-zinc-300">
          {stage.blurb}
        </p>
      </div>
    </div>
  );
}

function StageCard({
  stage,
  index,
  total,
  progress,
  reduced,
}: {
  stage: HireStage;
  index: number;
  total: number;
  progress: MotionValue<number>;
  reduced: boolean | null;
}) {
  // Earlier cards shrink as later ones stack over them; the last never scales.
  const targetScale = 1 - (total - 1 - index) * 0.045;
  // Each card only begins scaling once its own slot in the scroll starts.
  const range: [number, number] = [index / total, 1];
  const scale = useTransform(progress, range, [1, targetScale]);

  // Stair-step the sticky offset so stacked card tops peek out beneath the navbar.
  const stickyTop = `calc(6rem + ${index * 1.25}rem)`;

  // Reduced motion: no pinning, no scroll-linked scale — a calm vertical list.
  if (reduced) {
    return (
      <li className="h-[58vh] min-h-80 sm:h-[26rem]">
        <StageCardBody stage={stage} total={total} />
      </li>
    );
  }

  return (
    <li
      className="sticky h-[58vh] min-h-80 sm:h-[26rem]"
      style={{ top: stickyTop }}
    >
      <motion.div className="h-full w-full origin-top" style={{ scale }}>
        <StageCardBody stage={stage} total={total} />
      </motion.div>
    </li>
  );
}

export default function HiringStack({ className }: { className?: string }) {
  const containerRef = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const total = HIRE_STAGES.length;

  return (
    <ol
      ref={containerRef}
      className={cn("mt-8 flex flex-col gap-6 sm:gap-8", className)}
    >
      {HIRE_STAGES.map((stage, i) => (
        <StageCard
          key={stage.title}
          stage={stage}
          index={i}
          total={total}
          progress={scrollYProgress}
          reduced={reduced}
        />
      ))}
    </ol>
  );
}
