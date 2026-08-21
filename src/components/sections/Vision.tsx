"use client";

import { motion } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const HEADTEXT =
  "To become a trusted technology partner that empowers organizations through intelligent digital innovation, creating sustainable value for businesses and communities worldwide.";

export default function Vision() {
  return (
    <section id="vision" className="relative overflow-hidden px-3 py-24 sm:py-32">
      <div className="relative z-10">
        <p className="max-w-[1600px] text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
          {HEADTEXT}
        </p>

        <motion.div
          className="mt-8 aspect-[16/9] w-[90vw] overflow-hidden sm:mt-16 sm:aspect-auto sm:h-[90vh]"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <img
            src="/home/P1330392_velocity.webp"
            alt="CSI office"
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </motion.div>
      </div>
    </section>
  );
}
