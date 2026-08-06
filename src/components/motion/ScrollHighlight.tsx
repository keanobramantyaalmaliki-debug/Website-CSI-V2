"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap/register";

/**
 * T3 — scroll-driven word highlight.
 * Words transition from zinc-600 to zinc-100 as the element scrolls through the viewport.
 * One scrubbed timeline drives all words; each word occupies [i/total, (i+2)/total]
 * of the timeline, matching the original per-word progress window 1:1.
 */
export default function ScrollHighlight({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = text.split(" ");

  useGSAP(
    () => {
      const wordEls = ref.current?.querySelectorAll("[data-scroll-word]");
      if (!wordEls) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(wordEls, { color: "#f4f5f7" });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: ref.current,
            start: "top 85%",
            end: "bottom 30%",
            scrub: 0.3,
          },
        });

        wordEls.forEach((el, i) => {
          tl.fromTo(
            el,
            { color: "#a9adb6" },
            { color: "#f4f5f7", duration: 2 / words.length, ease: "none" },
            i / words.length,
          );
        });
      });
    },
    { scope: ref, dependencies: [text] },
  );

  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          data-scroll-word=""
          className="mr-[0.25em] inline-block"
          style={{ color: "#a9adb6" }}
        >
          {word}
        </span>
      ))}
    </p>
  );
}
