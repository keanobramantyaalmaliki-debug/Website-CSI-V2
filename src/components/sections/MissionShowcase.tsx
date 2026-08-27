"use client";

import { useId, useState, type SyntheticEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export type Mission = {
  n: string;
  tag: string;
  verb: string;
  detail: string;
  image: string;
  imageAlt: string;
};

function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}

function DesktopShowcase({
  missions,
  active,
  setActive,
  reduced,
}: {
  missions: Mission[];
  active: number;
  setActive: (i: number) => void;
  reduced: boolean;
}) {
  const goPrev = () => setActive((active - 1 + missions.length) % missions.length);
  const goNext = () => setActive((active + 1) % missions.length);

  return (
    <div className="mt-6">
      <div className="mb-4 flex justify-end gap-2">
        <button
          type="button"
          aria-label="Previous mission"
          onClick={goPrev}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] text-zinc-400 transition-colors hover:border-accent/40 hover:text-accent"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Next mission"
          onClick={goNext}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] text-zinc-400 transition-colors hover:border-accent/40 hover:text-accent"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex gap-3">
        {missions.map((m, i) => {
          const isActive = i === active;
          return (
            <motion.button
              key={m.verb}
              type="button"
              aria-current={isActive || undefined}
              onClick={() => setActive(i)}
              layout
              transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
              className={cn(
                "group relative flex h-80 flex-col justify-end overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-surface-2 to-surface-1 text-left transition-colors hover:border-accent/40",
                isActive ? "flex-[3]" : "flex-1",
              )}
            >
              <img
                src={m.image}
                alt={m.imageAlt}
                loading={isActive ? undefined : "lazy"}
                onError={hideOnError}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              <div className="relative flex flex-col gap-1.5 p-5 sm:p-6">
                <span className="text-xs tabular-nums text-zinc-400">{m.n}</span>
                <span className="text-lg font-medium text-zinc-100 sm:text-xl">
                  {m.verb}
                </span>
                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.p
                      initial={{ opacity: reduced ? 1 : 0, height: reduced ? "auto" : 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: reduced ? "auto" : 0 }}
                      transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
                      /* 65ch: plafon dalam ala basement (27 Agu) — detail tidak
                         ikut kartu aktif melebar saat zoom-out / monitor 1920. */
                      className="max-w-[65ch] text-sm leading-relaxed text-zinc-300"
                    >
                      {m.detail}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function MobileAccordionItem({
  mission,
  open,
  onToggle,
  reduced,
}: {
  mission: Mission;
  open: boolean;
  onToggle: () => void;
  reduced: boolean;
}) {
  const id = useId();

  return (
    <li className="border-b border-white/[0.08]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="flex w-full items-center gap-5 py-5 text-left"
      >
        <span className="text-xs tabular-nums text-zinc-400">{mission.n}</span>
        <span className="flex-1 text-lg font-medium text-zinc-100">{mission.verb}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-300",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            role="region"
            initial={{ height: reduced ? "auto" : 0, opacity: reduced ? 1 : 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0, transition: { duration: reduced ? 0 : 0.2 } }}
            transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <div className="overflow-hidden rounded-xl">
              <img
                src={mission.image}
                alt={mission.imageAlt}
                loading="lazy"
                onError={hideOnError}
                className="h-40 w-full bg-gradient-to-br from-surface-2 to-surface-1 object-cover"
              />
            </div>
            <p className="max-w-[65ch] pt-4 pb-5 text-sm leading-relaxed text-zinc-400">
              {mission.detail}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export default function MissionShowcase({ missions }: { missions: Mission[] }) {
  const [active, setActive] = useState(0);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const reduced = !!useReducedMotion();

  if (isDesktop) {
    return (
      <DesktopShowcase
        missions={missions}
        active={active}
        setActive={setActive}
        reduced={reduced}
      />
    );
  }

  return (
    <ol className="mt-6 border-t border-white/[0.08]">
      {missions.map((m, i) => (
        <MobileAccordionItem
          key={m.verb}
          mission={m}
          open={i === active}
          onToggle={() => setActive(i)}
          reduced={reduced}
        />
      ))}
    </ol>
  );
}
