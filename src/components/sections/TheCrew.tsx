"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import { NumberTicker } from "@/components/ui/number-ticker";
import CrewAvatar from "@/components/sections/CrewAvatar";
import TheCrewMobileCarousel from "@/components/sections/TheCrewMobileCarousel";
import { TEAM_MEMBERS } from "@/data/people";
import type { TeamMember } from "@/data/people";

const CATEGORIES: TeamMember["category"][] = ["Management", "Developer", "R & D"];
const FILTERS: (TeamMember["category"] | "All")[] = ["All", ...CATEGORIES];

export default function TheCrew() {
  const [filter, setFilter] = useState<TeamMember["category"] | "All">("All");
  const [scrollActiveName, setScrollActiveName] = useState<string | null>(null);
  const [hoverActiveName, setHoverActiveName] = useState<string | null>(null);
  const activeName = hoverActiveName ?? scrollActiveName;
  const reduced = !!useReducedMotion();

  const listBoxRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const rafRef = useRef<number | null>(null);
  const hoverActiveNameRef = useRef<string | null>(null);

  useEffect(() => {
    hoverActiveNameRef.current = hoverActiveName;
  }, [hoverActiveName]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Divisions are uneven (5/5/3) so natural scroll keeps the active-row
  // transition smooth across boundaries; per-row midpoint math (not
  // IntersectionObserver — jsdom's stub marks every row active at once).
  const updateActiveFromScroll = useCallback(() => {
    const box = listBoxRef.current;
    if (!box) return;
    const boxRect = box.getBoundingClientRect();
    const boxMid = boxRect.top + boxRect.height / 2;

    let closestName: string | null = null;
    let closestDist = Infinity;
    rowRefs.current.forEach((el, name) => {
      const rect = el.getBoundingClientRect();
      const rowMid = rect.top + rect.height / 2;
      const dist = Math.abs(rowMid - boxMid);
      if (dist < closestDist) {
        closestDist = dist;
        closestName = name;
      }
    });
    if (closestName) setScrollActiveName(closestName);
  }, []);

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (hoverActiveNameRef.current !== null) return;
      updateActiveFromScroll();
    });
  }, [updateActiveFromScroll]);

  const visible =
    filter === "All"
      ? TEAM_MEMBERS
      : TEAM_MEMBERS.filter((m) => m.category === filter);

  const grouped = CATEGORIES.map((cat) => ({
    cat,
    members: visible.filter((m) => m.category === cat),
  })).filter((g) => g.members.length > 0);

  useEffect(() => {
    setScrollActiveName(null);
    setHoverActiveName(null);
  }, [filter]);

  return (
    <section id="crew" className="px-6 py-24 sm:px-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-white/[0.08] pb-6">
        <p className="text-xs uppercase tracking-widest text-zinc-400">
          The Crew
        </p>

        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`text-[11px] uppercase tracking-widest transition-colors duration-200 ${
                  filter === f
                    ? "border-b border-accent text-accent"
                    : "border-b border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <span className="font-mono text-xs tabular-nums text-zinc-600">
            <NumberTicker key={filter} value={visible.length} className="text-inherit" />{" "}
            people
          </span>
        </div>
      </div>

      {/* Desktop — wall grid: index list (left) synced with photo/placeholder grid (right) */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div
          ref={listBoxRef}
          onScroll={handleScroll}
          data-testid="crew-scroll-box"
          className="max-h-[34rem] overflow-y-auto pr-2"
        >
          {grouped.map(({ cat, members }) => (
            <div key={cat}>
              <p className="mt-12 mb-2 text-[10px] uppercase tracking-widest text-zinc-600 first:mt-8">
                {cat}
              </p>
              <FadeUpList>
                {members.map((member) => {
                  const isActive = activeName === member.name;
                  return (
                    <FadeUpItem
                      key={member.name}
                      tag="article"
                      className="border-b border-white/[0.06]"
                    >
                      <div
                        ref={(el) => {
                          if (el) rowRefs.current.set(member.name, el);
                          else rowRefs.current.delete(member.name);
                        }}
                        tabIndex={0}
                        onMouseEnter={() => setHoverActiveName(member.name)}
                        onMouseLeave={() => setHoverActiveName(null)}
                        onFocus={() => setHoverActiveName(member.name)}
                        onBlur={() => setHoverActiveName(null)}
                        className="relative grid gap-2 py-5 pl-4 focus:outline-none sm:grid-cols-[1fr_auto] sm:gap-6"
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute left-0 top-0 h-full w-0.5 bg-accent transition-transform duration-300 ${
                            isActive ? "scale-y-100" : "scale-y-0"
                          }`}
                        />
                        <div>
                          <h3
                            className={`relative w-fit font-medium transition-colors duration-200 ${
                              isActive ? "text-zinc-50" : "text-zinc-100"
                            }`}
                          >
                            {member.name}
                          </h3>
                          <p className="mt-1 text-xs text-zinc-500">{member.role}</p>
                        </div>
                        {member.social && (
                          <div className="flex gap-4 self-center">
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
                  );
                })}
              </FadeUpList>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 content-start gap-4 sm:grid-cols-4">
          {grouped.flatMap(({ members }) =>
            members.map((member) => {
              const isActive = activeName === member.name;
              const dimmed = !reduced && activeName !== null && !isActive;
              return (
                <button
                  key={member.name}
                  type="button"
                  aria-label={member.name}
                  onMouseEnter={() => setHoverActiveName(member.name)}
                  onMouseLeave={() => setHoverActiveName(null)}
                  onFocus={() => setHoverActiveName(member.name)}
                  onBlur={() => setHoverActiveName(null)}
                >
                  <CrewAvatar
                    photoUrl={member.photoUrl}
                    name={member.name}
                    active={isActive}
                    dimmed={dimmed}
                  />
                </button>
              );
            }),
          )}
        </div>
      </div>

      {/* Mobile — autoplay + swipe carousel, one person at a time */}
      <div className="lg:hidden">
        <TheCrewMobileCarousel people={visible} />
      </div>
    </section>
  );
}
