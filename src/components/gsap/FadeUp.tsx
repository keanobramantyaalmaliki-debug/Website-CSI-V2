"use client";

import { createElement, type ReactNode } from "react";
import { useRef } from "react";
import { gsap, useGSAP, CSI_EASE } from "@/lib/gsap/register";

/** T2 (GSAP variant) — stagger fade-up list container. Pair with FadeUpItem. */
export function FadeUpList({
  children,
  className,
  tag = "div",
}: {
  children: ReactNode;
  className?: string;
  tag?: "div" | "ul" | "ol";
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-fade-up-item]", {
          opacity: 0,
          y: 12,
          duration: 0.5,
          ease: CSI_EASE,
          stagger: 0.04,
          delay: 0.1,
          scrollTrigger: {
            trigger: ref.current,
            start: "top bottom-=60",
            once: true,
          },
        });
      });
    },
    { scope: ref },
  );

  return createElement(tag, { ref, className }, children);
}

/** T2 (GSAP variant) — single item within a FadeUpList. */
export function FadeUpItem({
  children,
  className,
  tag = "div",
}: {
  children: ReactNode;
  className?: string;
  tag?: "div" | "li" | "article";
}) {
  return createElement(
    tag,
    { className, "data-fade-up-item": "" },
    children,
  );
}
