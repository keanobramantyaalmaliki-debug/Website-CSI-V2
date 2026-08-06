"use client";

import { useRef } from "react";
import { motionValue } from "motion/react";
import { gsap, useGSAP, CSI_EASE } from "@/lib/gsap/register";
import ScrollHighlight from "@/components/motion/ScrollHighlight";
import ManifestoField from "@/components/motion/ManifestoField";

interface LineConfig {
  text: string;
  role: "setup" | "body" | "thesis" | "close";
}

const LINES: LineConfig[] = [
  { text: "Software connects information. Intelligence connects decisions.", role: "setup" },
  { text: "Organizations are drowning in data. Yet struggling to act.", role: "body" },
  { text: "The future belongs not to those who collect, but to those who act.", role: "thesis" },
  { text: "Intelligence should exist across every interaction. Every workflow. Every decision.", role: "close" },
];

function ManifestoLine({ config, index }: { config: LineConfig; index: number }) {
  const { role, text } = config;

  if (role === "thesis") {
    return (
      <p
        data-manifesto-thesis={index}
        className="text-3xl font-semibold italic leading-[1.15] tracking-tight text-zinc-100 md:text-5xl"
      >
        {text}
      </p>
    );
  }

  const baseClass =
    role === "setup" || role === "close"
      ? "max-w-2xl text-xl font-medium leading-snug tracking-tight sm:text-2xl"
      : "max-w-2xl text-2xl font-medium leading-snug tracking-tight sm:text-3xl";

  return (
    <ScrollHighlight
      text={text}
      className={baseClass}
    />
  );
}

export default function Manifesto() {
  const sectionRef = useRef<HTMLElement>(null);
  const spineFillRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  // Bridge for ManifestoField (r3f Canvas, frameloop="demand"): it subscribes
  // via progress.on("change", ...) and calls invalidate() per change. This
  // motionValue is a subscribable data structure, not an animation engine —
  // ScrollTrigger drives it, ManifestoField's contract stays untouched.
  const progress = useRef(motionValue(0)).current;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          spineFillRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 90%",
              end: "bottom 20%",
              scrub: 0.3,
              onUpdate: (self) => progress.set(self.progress),
            },
          },
        );
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(spineFillRef.current, { scaleY: 1 });
      });

      gsap.from(eyebrowRef.current, {
        opacity: 0,
        x: -8,
        duration: 0.5,
        ease: CSI_EASE,
        scrollTrigger: { trigger: eyebrowRef.current, start: "top bottom", once: true },
      });

      LINES.forEach((line, i) => {
        if (line.role !== "thesis") return;
        gsap.from(`[data-manifesto-thesis="${i}"]`, {
          opacity: 0,
          y: 12,
          duration: 0.7,
          ease: CSI_EASE,
          delay: i * 0.08,
          scrollTrigger: {
            trigger: `[data-manifesto-thesis="${i}"]`,
            start: "top bottom-=10%",
            once: true,
          },
        });
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      id="manifesto"
      ref={sectionRef}
      /* `bg-background` WAJIB (dari `join`): Manifesto meluncur DI ATAS canvas
         yang memudar, jadi ia harus buram — tanpa itu kantor 3D terlihat
         menembus teks.

         `pt-16` (64px, dulu `pt-40` = 160px) juga menopang hal lain: di HP
         hero cuma setinggi 70dvh (lihat Hero.tsx), dan eyebrow + baris pertama
         section ini harus MENGINTIP di sisa 30% layar. Padding besar sendirian
         menghabiskan jatah itu. Ketiganya terikat — Hero 70dvh, `-mt` di
         HeroHandoff, dan padding ini; mengubah satu tanpa menengok dua lainnya
         membuat Manifesto tidak mengintip sama sekali. */
      className="relative overflow-hidden bg-background px-6 pb-24 pt-16 sm:px-10 sm:pb-32 sm:pt-20"
    >
      {/* Particle field — absolute behind text */}
      <ManifestoField progress={progress} />

      <div className="relative z-10 pl-6">
        {/* Progress spine */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-zinc-800" aria-hidden="true">
          <div
            ref={spineFillRef}
            className="absolute inset-x-0 top-0 origin-top bg-zinc-400"
            style={{ height: "100%" }}
          />
        </div>

        {/* Eyebrow — anchored above text block */}
        <p
          ref={eyebrowRef}
          className="mb-8 text-xs tracking-widest text-zinc-400 uppercase"
        >
          Manifesto
        </p>

        {/* Lines */}
        <div className="flex flex-col gap-8">
          {LINES.map((line, i) => (
            <ManifestoLine key={i} config={line} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
