import { motion } from "motion/react";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import { VALUES } from "@/data/people";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function PeopleValues() {
  return (
    <section id="people-values" className="px-6 py-24 sm:px-10">
      <motion.p
        className="text-xs tracking-widest text-zinc-400 uppercase"
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        What We Stand For
      </motion.p>

      <FadeUpList className="mt-8 divide-y divide-white/[0.08] border-t border-white/[0.08]">
        {VALUES.map((value) => (
          <FadeUpItem
            key={value.title}
            tag="article"
            className="grid gap-8 py-14 sm:grid-cols-[280px_1fr]"
          >
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">
                {value.title}
              </h2>
              <p className="mt-2 text-xs uppercase tracking-widest text-zinc-500">
                {value.tagline}
              </p>
              {value.photo && (
                <img
                  src={value.photo}
                  alt=""
                  className="mt-8 aspect-square w-full max-w-[200px] object-cover grayscale"
                  loading="lazy"
                />
              )}
            </div>
            <p className="text-zinc-400 leading-relaxed self-start pt-1">
              {value.description}
            </p>
          </FadeUpItem>
        ))}
      </FadeUpList>
    </section>
  );
}
