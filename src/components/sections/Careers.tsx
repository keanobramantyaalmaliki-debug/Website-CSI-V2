"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import CareersRoles from "./CareersRoles";
import { careerRoles } from "@/data/careerRoles";
import { sectionHeading, sectionSubheading } from "@/data/sectionTexts";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Careers() {
  const baris = useMemo(() => sectionHeading("careers"), []);
  const paragraf = useMemo(() => sectionSubheading("careers"), []);

  return (
    <section
      id="careers"
      /* Mobile: pt-0 (celah 80px ke TheCrew dijatah di pb-20 sana) dan pb-20
         = 80px ke Contact yang pt-0 (aturan 28 Agu, lihat PeopleIntro.tsx);
         ≥sm kembali py-32. */
      className="section-shell px-3 pt-0 pb-20 sm:py-32"
    >
      {/* Split ala "Open Positions" basement: kiri 35% headline + subtext,
          kanan 65% roles list. Di bawah lg menumpuk seperti biasa. */}
      <div className="lg:grid lg:grid-cols-[35fr_65fr] lg:gap-x-16">
        <div>
          {/* T1 — line-mask heading (label eyebrow dihapus atas permintaan 20 Agu) */}
          {/* Ukuran sama dengan judul "The Crew" (TheCrew.tsx) */}
          <h2 className="max-w-xl text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] font-semibold tracking-tight text-zinc-100">
            {baris.map((line, i) => (
              <LineMask key={i} delay={i * 0.06}>
                {line}
              </LineMask>
            ))}
          </h2>

          {/* Subtext dari careers-sub V1 */}
          {paragraf.length > 0 && (
            <motion.p
              /* mt mobile 18px = standar judul→subteks 28 Agu (PeopleIntro);
                 ≥sm kembali 20px. */
              className="mt-[18px] max-w-lg text-sm leading-relaxed font-light text-zinc-400 sm:mt-5 sm:text-base"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
            >
              {paragraf[0]}
            </motion.p>
          )}
        </div>

        {/* Roles list gaya V1: preview foto ikut kursor + hover-expand + accordion. */}
        <div className="mt-12 lg:mt-0">
          <CareersRoles roles={careerRoles()} />
        </div>
      </div>
    </section>
  );
}
