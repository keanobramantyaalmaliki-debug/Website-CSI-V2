"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * T5 — infinite horizontal marquee strip.
 * Items are duplicated to create a seamless loop (x: 0 → -50% → loop).
 */
export default function Marquee({
  items,
  speed = 25,
}: {
  items: string[];
  speed?: number;
}) {
  const reduced = useReducedMotion();
  const duration = items.length * speed;

  if (reduced) {
    return (
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200"
          >
            {item}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <motion.div
        className="flex w-max gap-6"
        initial={{ x: 0 }}
        animate={{ x: "-50%" }}
        transition={{
          duration,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
        }}
      >
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className="whitespace-nowrap rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200"
          >
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
