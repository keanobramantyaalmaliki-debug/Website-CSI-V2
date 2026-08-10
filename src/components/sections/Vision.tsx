"use client";

import { motion } from "motion/react";
import ScrollHighlight from "@/components/motion/ScrollHighlight";
import MissionShowcase, { type Mission } from "./MissionShowcase";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const MISSIONS: Mission[] = [
  {
    n: "01",
    tag: "Delivery",
    verb: "Deliver",
    detail: "Innovative and high-quality software solutions.",
    image:
      "https://images.unsplash.com/photo-1759661881353-5b9cc55e1cf4?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Dark monitor displaying lines of syntax-highlighted code",
  },
  {
    n: "02",
    tag: "Acceleration",
    verb: "Accelerate",
    detail: "Digital transformation through intelligent technologies.",
    image:
      "https://images.unsplash.com/photo-1777572501684-26cd3ed91f1b?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Light trails streaking across a city street at night",
  },
  {
    n: "03",
    tag: "Integration",
    verb: "Integrate",
    detail: "Artificial Intelligence into practical business applications.",
    image:
      "https://images.unsplash.com/photo-1744324509518-d61c11a4d509?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Abstract electronic circuit board glowing in neon green",
  },
  {
    n: "04",
    tag: "Partnership",
    verb: "Partner",
    detail: "Long-term relationships built on trust, collaboration, and excellence.",
    image:
      "https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Two people shaking hands and smiling",
  },
  {
    n: "05",
    tag: "Innovation",
    verb: "Innovate",
    detail: "Continuously help organizations thrive in the digital era.",
    image:
      "https://images.unsplash.com/photo-1756908992398-2e8429f667ec?w=1200&q=80&auto=format&fit=crop",
    imageAlt: "Abstract glowing particles with light rays",
  },
];

const VISION =
  "To become a trusted technology partner that empowers organizations through intelligent digital innovation — creating sustainable value for businesses and communities worldwide.";

export default function Vision() {
  return (
    <section id="vision" className="relative overflow-hidden px-6 py-24 sm:px-10 sm:py-32">
      <div className="relative z-10">
      {/* T6 — eyebrow */}
      <motion.p
        className="text-xs tracking-widest text-zinc-400 uppercase"
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        Our Vision
      </motion.p>

      {/* T3 — scroll word-highlight bookend */}
      <ScrollHighlight
        text={VISION}
        className="mt-3 max-w-2xl text-2xl font-semibold leading-snug tracking-tight sm:text-3xl"
      />

      {/* T6 — mission eyebrow */}
      <motion.p
        className="mt-16 text-xs tracking-widest text-zinc-400 uppercase"
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        Our Mission
      </motion.p>

      <MissionShowcase missions={MISSIONS} />
      </div>
    </section>
  );
}
