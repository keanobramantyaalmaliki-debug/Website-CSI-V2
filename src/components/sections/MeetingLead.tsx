"use client";

import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function MeetingLead() {
  return (
    <section
      id="meeting-lead"
      /* Section pertama ruangan Meeting = yang menempel ke hero 3D, jadi
         padding-atasnya 12px (`pt-3`) di semua lebar — sama dengan gutter
         `px-3` dan sama dengan tiga ruangan lain (aturan padding-tipis, lihat
         CsiHero.tsx). Dulu `pt-6` di HP dan `md:pt-28` (112px) di desktop. */
      className="relative z-10 border-b border-white/[0.06] px-3 pt-3 pb-20 sm:pb-28"
    >
      <div>
        {/* Ukuran heading & subtext mengikuti CsiHero (home page) persis —
           lihat komentar di sana soal kenapa text-4xl di HP dan max-w-3xl. */}
        <h2 className="max-w-5xl break-words text-4xl font-semibold tracking-tight text-zinc-100 sm:text-6xl lg:text-7xl">
          <LineMask>From Public Sector</LineMask>
          <LineMask delay={0.06}>to Enterprise.</LineMask>
        </h2>

        <motion.p
          className="mt-6 max-w-3xl text-base leading-relaxed text-zinc-400 sm:mt-8 sm:text-lg"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
        >
          Every project is an answer to a real problem — not a demo,
          not a prototype. Here is the work already running in the field,
          from citizen service portals to enterprise cloud infrastructure.
        </motion.p>
      </div>
    </section>
  );
}
