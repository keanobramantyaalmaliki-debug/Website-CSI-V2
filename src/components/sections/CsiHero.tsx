"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import CsiParticleField from "@/components/motion/CsiParticleField";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function CsiHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: false, margin: "-10% 0px -10% 0px" });

  return (
    <section
      id="csi"
      ref={sectionRef}
      className="relative overflow-hidden bg-background px-6 py-16 sm:px-10 sm:py-20"
    >
      <div className="relative z-10 lg:grid lg:grid-cols-2 lg:gap-12">
        <div>
          <motion.h2
            className="text-3xl font-semibold tracking-tight text-zinc-100 sm:text-5xl"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            Think Beyond Software.
            <br />
            Build Intelligence.
          </motion.h2>

          {/* Body copy is a placeholder — replace with final copy from user (TODO(csi-hero): pending final copy). */}
          <motion.p
            className="mt-4 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
          >
            We design systems that think alongside the people who run them —
            turning raw software into intelligence that anticipates, adapts,
            and acts.
          </motion.p>
        </div>

        <aside className="relative hidden lg:block">
          <div className="h-[20rem]">
            <CsiParticleField active={inView} />
          </div>
        </aside>
      </div>
    </section>
  );
}
