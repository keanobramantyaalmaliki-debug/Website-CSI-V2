"use client";

import { useRef, useState, type UIEvent } from "react";
import Disclosure from "@/components/motion/Disclosure";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

export type CaseProject = {
  title: string;
  client: string;
  year: string;
  tags: string[];
  image: string;
  outcome?: string;
};

/**
 * Swipeable mobile card list. Uses native CSS scroll-snap (no drag library) so
 * one card dominates the viewport at a time; the next card peeks at the edge
 * to hint swipeability. Tags/outcome sit behind a disclosure to keep the
 * default card to title + client/year.
 */
export default function CaseGridMobileStack({ projects }: { projects: CaseProject[] }) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const cardWidth = el.firstElementChild?.clientWidth || el.clientWidth;
    if (!cardWidth) return;
    const gap = 16; // gap-4
    const index = Math.round(el.scrollLeft / (cardWidth + gap));
    setActive(Math.min(Math.max(index, 0), projects.length - 1));
  };

  const scrollToIndex = (index: number) => {
    const el = listRef.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-4">
      <FadeUpList
        ref={listRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto"
      >
        {projects.map((project) => (
          <FadeUpItem
            key={project.title}
            tag="article"
            className="w-[85vw] shrink-0 snap-center overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]"
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
              <h3 className="text-lg font-semibold text-zinc-100">{project.title}</h3>
              <Disclosure
                trigger={(open) => (
                  <span className="text-xs uppercase tracking-widest text-zinc-400">
                    {open ? "Hide details" : "Details"} {open ? "−" : "+"}
                  </span>
                )}
                contentClassName="flex flex-col gap-2 pt-2"
              >
                <div className="flex flex-wrap gap-1.5">
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
              </Disclosure>
            </div>
          </FadeUpItem>
        ))}
      </FadeUpList>

      <div className="flex justify-center gap-1.5">
        {projects.map((project, index) => (
          <button
            key={project.title}
            type="button"
            aria-label={`Show ${project.title}`}
            onClick={() => scrollToIndex(index)}
            className={`h-1 w-6 rounded-full transition-colors duration-300 ${
              index === active ? "bg-accent" : "bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
