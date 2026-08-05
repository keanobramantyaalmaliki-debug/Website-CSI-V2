"use client";

import { useEffect, useRef, useState, type UIEvent } from "react";
import { useReducedMotion } from "motion/react";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import CrewAvatar from "@/components/sections/CrewAvatar";
import type { TeamMember } from "@/data/people";

const AUTO_ADVANCE_MS = 5000;

/**
 * Swipeable one-person-at-a-time carousel with autoplay, replacing the
 * static 2-col grid. Uses native CSS scroll-snap (same technique as
 * CaseGridMobileStack) so a card owns the full viewport width.
 */
export default function TheCrewMobileCarousel({ people }: { people: TeamMember[] }) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const reduced = !!useReducedMotion();

  const scrollToIndex = (index: number) => {
    const el = listRef.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo?.({ left: card.offsetLeft, behavior: "smooth" });
  };

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const cardWidth = el.firstElementChild?.clientWidth || el.clientWidth;
    if (!cardWidth) return;
    const index = Math.round(el.scrollLeft / cardWidth);
    setActive(Math.min(Math.max(index, 0), people.length - 1));
  };

  // Filter tabs change the `people` array — reset to the first matching
  // person instead of leaving `active` pointing past the new (shorter) list
  // or at an unrelated person.
  useEffect(() => {
    setActive(0);
    listRef.current?.scrollTo?.({ left: 0 });
  }, [people]);

  // Re-arms on every `active` change (timer tick, manual swipe, or dot
  // click) — avoids stale closures, same pattern as CaseGrid's fan slider.
  useEffect(() => {
    if (reduced || people.length <= 1) return;
    const id = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % people.length;
        scrollToIndex(next);
        return next;
      });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [active, reduced, people.length]);

  return (
    <div data-testid="crew-mobile-carousel" className="flex flex-col gap-4">
      <FadeUpList
        ref={listRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto"
      >
        {people.map((member) => (
          <FadeUpItem
            key={member.name}
            tag="article"
            className="w-full shrink-0 snap-center"
          >
            <div className="flex flex-col gap-3 px-1">
              <CrewAvatar photoUrl={member.photoUrl} name={member.name} />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-600">
                  {member.category}
                </p>
                <h3 className="mt-1 text-lg font-medium text-zinc-100">
                  {member.name}
                </h3>
                <p className="mt-0.5 text-sm text-zinc-500">{member.role}</p>
              </div>
              {member.social && (
                <div className="flex gap-4">
                  {member.social.map((s) => (
                    <a
                      key={s.platform}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] uppercase tracking-wider text-zinc-600 transition-colors duration-200 hover:text-zinc-300"
                    >
                      {s.platform}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </FadeUpItem>
        ))}
      </FadeUpList>

      <div className="flex flex-wrap justify-center gap-1.5">
        {people.map((member, index) => (
          <button
            key={member.name}
            type="button"
            aria-label={`Show ${member.name}`}
            onClick={() => {
              setActive(index);
              scrollToIndex(index);
            }}
            className={`h-1 w-6 rounded-full transition-colors duration-300 ${
              index === active ? "bg-accent" : "bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
