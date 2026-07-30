"use client";

import LineMask from "@/components/motion/LineMask";
import { motion } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// TODO(content): update to cogniti social handles — issue pending
const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com/baliinteraktifperkasa" },
  { label: "LinkedIn", href: "https://linkedin.com/company/bali-interaktif-perkasa" },
];

export default function Contact() {
  return (
    <section id="contact" className="px-6 py-24 sm:px-10 sm:py-32">
      {/* T6 — eyebrow */}
      <motion.p
        className="text-xs tracking-widest text-zinc-400 uppercase"
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        Contact
      </motion.p>

      {/* T1 — line-mask heading */}
      <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-5xl">
        <LineMask>Let&apos;s Start A Conversation.</LineMask>
      </h2>

      <motion.p
        className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-300 sm:text-base"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
      >
        We typically respond within one business day.
      </motion.p>

      {/* T7 — CTA links with hover underline wipe */}
      <motion.div
        className="mt-10 flex flex-wrap items-center gap-4"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.25 }}
      >
        <a
          href="mailto:hello@cogniti.id"
          className="group relative rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
        >
          hello@cogniti.id
        </a>
        <a
          href="#office"
          className="relative rounded-full border border-white/15 px-6 py-3 text-sm text-zinc-200 transition-colors hover:border-white/30 after:absolute after:bottom-3 after:left-6 after:h-px after:w-0 after:bg-zinc-200 after:transition-[width] after:duration-300 after:content-[''] hover:after:w-[calc(100%-3rem)]"
        >
          ↑ Back to the office
        </a>
      </motion.div>

      <footer className="mt-24 border-t border-white/[0.08] pt-6 text-xs text-zinc-400">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>
            © {new Date().getFullYear()} Cognitiva Solusi Indonesia. All rights reserved.
          </span>
          <div className="flex gap-4">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-zinc-400"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <span>Jl. Kediri No.27, Tuban, Badung, Bali 80361</span>
          <span>Intelligence Infrastructure</span>
        </div>
      </footer>
    </section>
  );
}
