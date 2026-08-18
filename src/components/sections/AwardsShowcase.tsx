"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "motion/react";
import { Award } from "lucide-react";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Cursor-follow preview card dimensions — used to keep the card clear of the
// pointer and clamped inside the section instead of overflowing it.
const CARD_W = 192;
const CARD_H = 300;
const CARD_GAP = 20;

// Mobile carousel auto-scroll — mirrors CaseGrid's FanSlider auto-advance
// pattern (interval + useReducedMotion guard), adapted for a scroll
// container instead of an active-index state.
const AUTO_SCROLL_MS = 4500;
const RESUME_DELAY_MS = 4000;
const MOBILE_CARD_GAP_PX = 16; // matches `gap-4` on the mobile scroll track

type AwardEntry = {
  title: string;
  org: string;
  date: string;
  image: string;
};

// PLACEHOLDER — no real awards yet; names/dates are invented so the section
// reads as filled content during review, not a fabricated real recognition.
// TODO(content): replace with actual award certificates once granted.
const AWARDS: AwardEntry[] = [
  {
    title: "Best Digital Government Solution",
    org: "GovTech Innovation Awards",
    date: "November 2024",
    image: "https://picsum.photos/seed/csi-award-govtech/480/640",
  },
  {
    title: "Top AI Implementation",
    org: "Indonesia Tech Excellence Awards",
    date: "August 2024",
    image: "https://picsum.photos/seed/csi-award-ai/480/640",
  },
  {
    title: "Outstanding Enterprise Software Partner",
    org: "National ICT Awards",
    date: "May 2023",
    image: "https://picsum.photos/seed/csi-award-enterprise/480/640",
  },
  {
    title: "Rising Star in Cloud Services",
    org: "Cloud Innovation Summit",
    date: "March 2023",
    image: "https://picsum.photos/seed/csi-award-cloud/480/640",
  },
];

function AwardRow({
  award,
  index,
  isActive,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
}: {
  award: AwardEntry;
  index: number;
  isActive: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  return (
    <div
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={0}
      className="group flex cursor-default items-center gap-4 border-b border-white/[0.08] py-5 outline-none last:border-b-0"
    >
      <span
        className={`font-mono text-xs tabular-nums transition-colors duration-200 ${
          isActive ? "text-accent" : "text-zinc-600"
        }`}
        aria-hidden="true"
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <div
        className={`grid size-10 shrink-0 place-items-center rounded-full border transition-colors duration-200 ${
          isActive ? "border-accent/50 text-accent" : "border-white/[0.08] text-zinc-500"
        }`}
        aria-hidden="true"
      >
        <Award className="size-5" strokeWidth={1.5} />
      </div>
      <div className="flex-1">
        <p
          className={`text-sm font-medium transition-colors duration-200 ${
            isActive ? "text-zinc-100" : "text-zinc-300"
          }`}
        >
          {award.title}
        </p>
        <p className="text-xs text-zinc-500">
          {award.org} &middot; {award.date}
        </p>
      </div>
    </div>
  );
}

/**
 * Recognition strip. Desktop: hovering a row reveals a certificate-style
 * preview card that follows the cursor (basement.studio-style awards list).
 * Mobile has no hover, so the same photos surface directly in a horizontal
 * snap-scroll carousel instead.
 */
export default function AwardsShowcase() {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // `active` drives text/icon highlight for both mouse and keyboard focus.
  // `pointerActive` gates the floating card so keyboard focus doesn't snap
  // it to a stale cursor position.
  const [active, setActive] = useState<number | null>(null);
  const [pointerActive, setPointerActive] = useState<number | null>(null);

  const cardX = useMotionValue(0);
  const cardY = useMotionValue(0);
  const springX = useSpring(cardX, { stiffness: 300, damping: 30 });
  const springY = useSpring(cardY, { stiffness: 300, damping: 30 });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduced || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const maxX = Math.max(r.width - CARD_W - 8, 8);
    cardX.set(Math.min(Math.max(e.clientX - r.left + CARD_GAP, 8), maxX));
    cardY.set(Math.max(e.clientY - r.top - CARD_H - CARD_GAP, 8));
  }

  const previewAward = pointerActive !== null ? AWARDS[pointerActive] : null;

  // Mobile auto-scroll — advances the snap-scroll track one card at a time.
  // Paused as soon as the user touches the track (`onPointerDown`) or the
  // track scrolls for any reason other than the interval itself, resuming
  // only after RESUME_DELAY_MS of idle. Dead entirely under reduced motion,
  // matching CaseGrid's FanSlider.
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Distinguishes a scroll caused by the auto-scroll interval itself from a
  // user-initiated one — the `scroll` listener can't otherwise tell them
  // apart, and without this guard the interval's own scroll would re-arm the
  // resume timer and never let `paused` clear.
  const programmaticScrollRef = useRef(false);

  function pauseAndScheduleResume() {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setPaused(true);
    resumeTimerRef.current = setTimeout(() => setPaused(false), RESUME_DELAY_MS);
  }

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      if (paused) return;
      const track = trackRef.current;
      if (!track) return;
      const cardWidth = track.firstElementChild?.getBoundingClientRect().width ?? 0;
      if (cardWidth === 0) return;
      const step = cardWidth + MOBILE_CARD_GAP_PX;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - step / 2;
      programmaticScrollRef.current = true;
      track.scrollTo({
        left: atEnd ? 0 : track.scrollLeft + step,
        behavior: "smooth",
      });
    }, AUTO_SCROLL_MS);
    return () => clearInterval(id);
  }, [reduced, paused]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  function onTrackScroll() {
    if (programmaticScrollRef.current) {
      programmaticScrollRef.current = false;
      return;
    }
    pauseAndScheduleResume();
  }

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={onMouseMove}
      className="relative mt-8 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 sm:p-10"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
    >
      <p className="text-xs tracking-widest text-zinc-500 uppercase">Recognition</p>

      {/* Desktop — hover/focus a row for the certificate preview */}
      <FadeUpList tag="div" className="mt-4 hidden sm:block">
        {AWARDS.map((award, i) => (
          <FadeUpItem key={award.title} tag="div">
            <AwardRow
              award={award}
              index={i}
              isActive={active === i}
              onPointerEnter={() => {
                setActive(i);
                setPointerActive(i);
              }}
              onPointerLeave={() => {
                setActive(null);
                setPointerActive(null);
              }}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            />
          </FadeUpItem>
        ))}
      </FadeUpList>

      {/* Mobile — snap-scroll carousel, photo always visible (no hover on touch).
          `-mx-8 px-8` bleeds the track to the card edge so cards scroll past it,
          while insetting the first/last card back to the content column.
          `scroll-px-8` is what makes that inset survive: the snapport otherwise
          starts at the scrollport edge, so mandatory snap scrolls the left
          padding straight out of view and card #1 sits flush on the border.

          ⚠️ The three 8s are ONE number, and it is the `p-8` on the panel
          wrapper right above — NOT the section gutter. Tried lowering them to 3
          on 18 Aug alongside the site-wide `px-3` gutter change and measured the
          result: the track started 33px in (12 gutter + 32 panel padding − 12
          margin) and the panel's `overflow-hidden` clipped the bleed, so cards
          no longer scrolled to the panel edge. If the panel padding changes
          (`p-8 sm:p-10`), these move with it; the section gutter never touches
          them. */}
      <FadeUpList
        ref={trackRef}
        tag="div"
        onScroll={onTrackScroll}
        onPointerDown={pauseAndScheduleResume}
        className="-mx-8 mt-4 flex snap-x snap-mandatory scroll-px-8 gap-4 overflow-x-auto px-8 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden"
      >
        {AWARDS.map((award) => (
          <FadeUpItem
            key={award.title}
            tag="div"
            className="relative aspect-[3/4] w-48 shrink-0 snap-start overflow-hidden rounded-2xl border border-white/[0.08]"
          >
            <img src={award.image} alt="" loading="lazy" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <p className="text-sm font-medium text-zinc-50">{award.title}</p>
              <p className="mt-1 text-[11px] text-zinc-300">
                {award.org} &middot; {award.date}
              </p>
            </div>
          </FadeUpItem>
        ))}
      </FadeUpList>

      {/* Cursor-follow certificate preview — desktop only */}
      {!reduced && (
        <AnimatePresence>
          {previewAward && (
            <motion.div
              key={previewAward.title}
              className="pointer-events-none absolute top-0 left-0 z-10 hidden w-48 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-2xl sm:block"
              style={{ x: springX, y: springY }}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              <img
                src={previewAward.image}
                alt=""
                className="aspect-[3/4] w-full object-cover"
              />
              <div className="p-3">
                <p className="text-xs font-medium text-zinc-100">{previewAward.title}</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">{previewAward.date}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}
