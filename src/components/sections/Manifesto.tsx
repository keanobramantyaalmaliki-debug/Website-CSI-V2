"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
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

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function ProgressSpine({ progress }: { progress: ReturnType<typeof useScroll>["scrollYProgress"] }) {
  const reduced = useReducedMotion();
  const scaleY = useTransform(progress, [0, 1], [0, 1]);

  return (
    <div className="absolute left-0 top-0 bottom-0 w-px bg-zinc-800" aria-hidden="true">
      <motion.div
        className="absolute inset-x-0 top-0 bg-zinc-400 origin-top"
        style={{ scaleY: reduced ? 1 : scaleY, height: "100%" }}
      />
    </div>
  );
}

function ManifestoLine({ config, index }: { config: LineConfig; index: number }) {
  const { role, text } = config;

  if (role === "thesis") {
    return (
      <motion.p
        className="text-3xl font-semibold italic leading-[1.15] tracking-tight text-zinc-100 md:text-5xl"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.7, ease: EASE, delay: index * 0.08 }}
      >
        {text}
      </motion.p>
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
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.9", "end 0.2"],
  });

  return (
    <section
      id="manifesto"
      ref={sectionRef}
      /* `bg-background` WAJIB (dari `join`): Manifesto meluncur DI ATAS canvas
         yang memudar, jadi ia harus buram — tanpa itu kantor 3D terlihat
         menembus teks.

         `pt-16` (64px, dulu `pt-40` = 160px) juga menopang hal lain: di HP hero
         setinggi 70dvh (lihat Hero.tsx), dan section pertama di bawahnya harus
         MENGINTIP di sisa 30% layar. Padding besar sendirian menghabiskan
         jatah itu.

         ⚠️ Aturan padding-tipis ini berlaku untuk SECTION PERTAMA TIAP RUANGAN,
         bukan khusus berkas ini — di Lounge yang menempel ke hero sekarang
         CsiHero (`pt-6` di HP; ia yang benar-benar bersebelahan dengan kantor
         3D), dan Manifesto menyusul di bawahnya (lihat lib/roomContent). Berkas
         ini tidak lagi menyentuh hero, jadi 64px-nya aman.
         Pasangannya: tinggi hero di Hero.tsx + seam di HeroHandoff. */
      className="relative overflow-hidden bg-background px-6 pb-24 pt-16 sm:px-10 sm:pb-32 sm:pt-20"
    >
      {/* Particle field — absolute behind text */}
      <ManifestoField progress={scrollYProgress} />

      <div className="relative z-10 pl-6">
        {/* Progress spine */}
        <ProgressSpine progress={scrollYProgress} />

        {/* Eyebrow — anchored above text block */}
        <motion.p
          className="mb-8 text-xs tracking-widest text-zinc-400 uppercase"
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          Manifesto
        </motion.p>

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
