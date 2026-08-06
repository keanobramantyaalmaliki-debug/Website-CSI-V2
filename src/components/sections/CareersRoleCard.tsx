"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
} from "motion/react";
import { ArrowUpRight, TrendingUp, Code2, Layers, type LucideIcon } from "lucide-react";

export type RoleData = { title: string; type: string; mode: string; tag: string };

const TAG_ICON: Record<string, LucideIcon> = {
  Growth: TrendingUp,
  Engineering: Code2,
  Product: Layers,
};

export default function CareersRoleCard({
  role,
  index,
}: {
  role: RoleData;
  index: number;
}) {
  const reduced = useReducedMotion();
  const cardRef = useRef<HTMLElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotlight = useMotionTemplate`radial-gradient(280px circle at ${mouseX}px ${mouseY}px, var(--accent-soft) 0%, transparent 80%)`;

  function onMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (reduced || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - r.left);
    mouseY.set(e.clientY - r.top);
  }

  const TagIcon = TAG_ICON[role.tag] ?? Layers;

  return (
    <motion.article
      ref={cardRef}
      onMouseMove={onMouseMove}
      className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-colors duration-300 hover:border-accent/40 sm:p-8 ${
        !reduced ? "animate-[careers-idle-glow_3s_ease-in-out_infinite] sm:animate-none" : ""
      }`}
      style={{ animationDelay: !reduced ? `${index * 0.4}s` : undefined }}
    >
      {/* Cursor-follow spotlight: desktop only, layered behind content */}
      {!reduced && (
        <motion.div
          data-testid="spotlight"
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{ background: spotlight }}
        />
      )}

      <div className="relative sm:grid sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
        <div>
          <div className="flex items-center gap-2">
            <TagIcon
              className="h-4 w-4 shrink-0 text-accent sm:hidden"
              aria-hidden="true"
            />
            <h3 className="relative w-fit font-medium text-zinc-100 after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-zinc-100 after:transition-[width] after:duration-300 after:content-[''] group-hover:after:w-full">
              {role.title}
            </h3>
            <ArrowUpRight
              className="h-4 w-4 shrink-0 -translate-x-1 text-accent opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
              aria-hidden="true"
            />
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {role.type} · {role.mode}
          </p>
          <span className="mt-4 inline-block rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
            {role.tag}
          </span>
        </div>

        <div
          data-testid="career-field"
          className="relative hidden h-28 w-40 shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] sm:block"
        >
          {reduced ? (
            <TagIcon
              className="pointer-events-none absolute inset-0 m-auto h-8 w-8 text-accent"
              aria-hidden="true"
            />
          ) : (
            <>
              <TagIcon
                className="pointer-events-none absolute inset-0 m-auto h-8 w-8 text-zinc-600"
                aria-hidden="true"
              />
              <TagIcon
                data-testid="career-field-sweep"
                className="pointer-events-none absolute inset-0 m-auto h-8 w-8 animate-[careers-icon-sweep_2.4s_linear_infinite] text-accent"
                aria-hidden="true"
                style={{
                  animationDelay: `${index * 0.3}s`,
                  maskImage: "linear-gradient(115deg, transparent 35%, black 50%, transparent 65%)",
                  WebkitMaskImage:
                    "linear-gradient(115deg, transparent 35%, black 50%, transparent 65%)",
                  maskSize: "300% 100%",
                  WebkitMaskSize: "300% 100%",
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                }}
              />
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}
