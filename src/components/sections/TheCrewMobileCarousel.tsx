"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
  type PanInfo,
} from "motion/react";
import { FadeUpItem } from "@/components/motion/FadeUp";
import CrewAvatar from "@/components/sections/CrewAvatar";
import type { TeamMember } from "@/data/people";

const AUTO_ADVANCE_MS = 30000;
const SWIPE_DISTANCE_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 500;
const FLY_OUT_DISTANCE = 400;
const STACK_DEPTH = 3;

export function resolveSwipeDirection(
  offsetX: number,
  velocityX: number,
): "left" | "right" | null {
  const pastThreshold =
    Math.abs(offsetX) > SWIPE_DISTANCE_THRESHOLD ||
    Math.abs(velocityX) > SWIPE_VELOCITY_THRESHOLD;
  if (!pastThreshold) return null;
  return offsetX < 0 ? "left" : "right";
}

function CrewCard({ member }: { member: TeamMember }) {
  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-surface-1 p-4">
      <CrewAvatar photoUrl={member.photoUrl} name={member.name} />
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-600">
          {member.category}
        </p>
        <h3 className="mt-1 text-lg font-medium text-zinc-100">{member.name}</h3>
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
  );
}

export type ActiveCardHandle = {
  /** Plays the same fly-out-left animation as a manual swipe, for autoplay. */
  autoSwipeLeft: () => void;
};

const ActiveCard = forwardRef<
  ActiveCardHandle,
  {
    member: TeamMember;
    onSwiped: (direction: "left" | "right") => void;
    onDragStart: () => void;
    onDragSettle: () => void;
    reduced: boolean;
  }
>(function ActiveCard({ member, onSwiped, onDragStart, onDragSettle, reduced }, ref) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const flyOut = (direction: "left" | "right") => {
    if (reduced) {
      onSwiped(direction);
      return;
    }
    const target = direction === "left" ? -FLY_OUT_DISTANCE : FLY_OUT_DISTANCE;
    animate(x, target, { duration: 0.25, ease: "easeOut" }).then(() => {
      onSwiped(direction);
    });
  };

  useImperativeHandle(ref, () => ({
    autoSwipeLeft: () => flyOut("left"),
  }));

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const direction = resolveSwipeDirection(info.offset.x, info.velocity.x);

    if (!direction) {
      onDragSettle();
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      return;
    }

    onDragSettle();
    flyOut(direction);
  };

  return (
    <FadeUpItem tag="article" className="relative">
      <motion.article
        tabIndex={0}
        drag={reduced ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        style={reduced ? undefined : { x, rotate, opacity }}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
        className="cursor-grab touch-pan-y active:cursor-grabbing"
      >
        <CrewCard member={member} />
      </motion.article>
    </FadeUpItem>
  );
});

/**
 * Tinder-style draggable card stack, replacing the previous CSS scroll-snap
 * carousel. Swiping left advances (next person), swiping right goes back —
 * same direction convention as flipping through a physical deck.
 */
export default function TheCrewMobileCarousel({ people }: { people: TeamMember[] }) {
  const [active, setActive] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const reduced = !!useReducedMotion();
  const activeCardRef = useRef<ActiveCardHandle>(null);

  const goTo = (index: number) => {
    setActive(((index % people.length) + people.length) % people.length);
  };

  const handleSwiped = (direction: "left" | "right") => {
    goTo(active + (direction === "left" ? 1 : -1));
  };

  // Filter tabs change the `people` array — reset to the first matching
  // person instead of leaving `active` pointing past the new (shorter) list
  // or at an unrelated person.
  useEffect(() => {
    setActive(0);
  }, [people]);

  // Idle user (no drag) still gets the swipe-left throw animation, not an
  // instant index jump — same motion as a manual gesture, just automated.
  // Re-arms on every `active` change (timer tick, manual swipe, or dot
  // click) — avoids stale closures, same pattern as CaseGrid's fan slider.
  useEffect(() => {
    if (reduced || people.length <= 1 || isDragging) return;
    const id = setInterval(() => {
      activeCardRef.current?.autoSwipeLeft();
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [active, reduced, people.length, isDragging]);

  const activeMember = people[active];
  const stack = Array.from(
    { length: Math.min(STACK_DEPTH, people.length) - 1 },
    (_, i) => people[(active + i + 1) % people.length],
  );

  return (
    <div data-testid="crew-mobile-carousel" className="flex flex-col gap-4">
      <div className="relative">
        {/* Peek cards behind the active one, back-to-front so the deck reads correctly */}
        {stack
          .slice()
          .reverse()
          .map((member, i) => {
            const depth = stack.length - i;
            return (
              <div
                key={member.name}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  transform: `translateY(${depth * 8}px) scale(${1 - depth * 0.04})`,
                  opacity: 1 - depth * 0.25,
                }}
              >
                <CrewCard member={member} />
              </div>
            );
          })}

        {activeMember && (
          <ActiveCard
            key={activeMember.name}
            ref={activeCardRef}
            member={activeMember}
            onSwiped={handleSwiped}
            onDragStart={() => setIsDragging(true)}
            onDragSettle={() => setIsDragging(false)}
            reduced={reduced}
          />
        )}
      </div>

      <div className="flex flex-nowrap justify-center gap-1">
        {people.map((member, index) => (
          <button
            key={member.name}
            type="button"
            aria-label={`Show ${member.name}`}
            onClick={() => goTo(index)}
            className={`h-1 w-4 shrink-0 rounded-full transition-colors duration-300 ${
              index === active ? "bg-accent" : "bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
