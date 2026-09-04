"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import { sectionHeading, sectionSubheading } from "@/data/sectionTexts";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function MeetingLead() {
  const baris = useMemo(() => sectionHeading("work-lead"), []);
  const paragraf = useMemo(() => sectionSubheading("work-lead"), []);

  return (
    <section
      id="meeting-lead"
      /* Section pertama ruangan Meeting = yang menempel ke hero 3D, jadi
         padding-atasnya 12px (`pt-3`) di semua lebar — sama dengan gutter
         `px-3` dan sama dengan tiga ruangan lain (aturan padding-tipis, lihat
         CsiHero.tsx). Dulu `pt-6` di HP dan `md:pt-28` (112px) di desktop. */
      className="section-shell relative z-10 border-b border-white/[0.06] px-3 pt-3 pb-20 sm:pb-28"
    >
      <div>
        {/* Ukuran heading & subtext mengikuti CsiHero (home page) persis —
           lihat komentar di sana soal kenapa text-4xl di HP dan max-w-3xl. */}
        <h2 className="max-w-5xl break-words text-4xl font-semibold tracking-tight text-zinc-100 sm:text-6xl lg:text-7xl">
          {/* Selisih 60ms antar baris — angka yang dulu ditulis tangan di
              sini (`<LineMask delay={0.06}>`) dan sekarang dihitung dari
              indeksnya, karena jumlah barisnya datang dari CMS. */}
          {baris.map((line, i) => (
            <LineMask key={i} delay={i * 0.06}>
              {line}
            </LineMask>
          ))}
        </h2>

        {paragraf.length > 0 && (
          <motion.p
            /* mt mobile 18px = standar judul→subteks 28 Agu (PeopleIntro);
               ≥sm kembali ke angka desktop lama. */
            className="mt-[18px] max-w-3xl text-base leading-relaxed text-zinc-400 sm:mt-8 sm:text-lg"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
          >
            {paragraf[0]}
          </motion.p>
        )}
      </div>
    </section>
  );
}
