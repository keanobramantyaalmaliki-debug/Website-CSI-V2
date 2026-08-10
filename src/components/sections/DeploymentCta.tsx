"use client";

import { FadeUpItem } from "@/components/motion/FadeUp";
import { scrollToSection } from "@/lib/smoothScroll";

/**
 * Sel ke-6 grid Deployments. `scrollToSection`, bukan `<a href="#contact">`:
 * anchor jump native berjalan di luar rAF Lenis dan berebut posisi dengannya
 * di frame yang sama (lihat smoothScrollCallsites.invariant.test.ts).
 */
export default function DeploymentCta() {
  return (
    <FadeUpItem className="aspect-[4/3] w-full max-h-[22rem] min-h-[18rem]">
      <button
        type="button"
        onClick={() => scrollToSection("contact")}
        className="group flex h-full w-full flex-col justify-between rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-5 text-left transition-colors duration-500 hover:border-white/25 hover:bg-white/[0.04]"
      >
        <span className="font-mono text-[11px] tracking-widest text-zinc-300 sm:text-xs">
          Next
        </span>
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-zinc-300">
            Every deployment started as a conversation. Tell us what&apos;s actually breaking,
            and we&apos;ll tell you whether we&apos;re the right team for it.
          </p>
          <span className="flex items-center gap-2 text-sm font-medium text-zinc-100">
            Talk to us
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-zinc-100 transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </span>
        </div>
      </button>
    </FadeUpItem>
  );
}
