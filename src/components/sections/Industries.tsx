"use client";

import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import IndustriesStack from "@/components/canvas/IndustriesStack";
import IndustriesMobile from "@/components/motion/IndustriesMobile";
import { INDUSTRIES } from "@/data/industries";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Sejak 23 Agu galeri kolom expanding diganti tumpukan plank 3D
 * (IndustriesStack, porting pmndrs `raycast-cycling`): strip putih
 * full-bleed tanpa radius, plank digilir wheel, klik = mode fokus.
 *
 * Revisi 23 Agu (malam): section = STRIP-NYA SAJA di desktop — latar
 * `bg-white/[0.02]` + hairline `border-y` bekas galeri lama dihapus,
 * eyebrow "Industries" dan counter "13 SECTORS · 3 core" dicabut, dan
 * heading + subtext pindah ke DALAM strip sebagai overlay (lihat
 * IndustriesStack.tsx). Heading yang terbaca mesin tetap di sini sebagai
 * sr-only: overlay-nya ikut wrapper strip yang aria-hidden.
 *
 * Gerbang desktop DIRANGKAP pointer presisi: wheel-cycling butuh hover +
 * wheel, jadi tablet landscape 1024px+ (coarse, tanpa hover) jatuh ke
 * carousel IndustriesMobile yang masih membawa heading-nya sendiri.
 */
export default function Industries() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const coarse = useCoarsePointer();
  const showStack = isDesktop && !coarse;

  return (
    <section id="industries" className="relative z-10 overflow-x-clip">
      {showStack ? (
        <>
          <h2 className="sr-only">Built Across Sectors</h2>
          <IndustriesStack industries={INDUSTRIES} />
          {/* Plank di canvas bukan DOM (strip-nya aria-hidden) — daftar
              sektor yang terbaca mesin & AT hidup di sini, pola sr-only
              yang sama dengan daftar layanan di Office.tsx. */}
          <ul className="sr-only">
            {INDUSTRIES.map((s) => (
              <li key={s.num}>
                {s.name}: {s.desc}
                {s.tier === "core" ? " (Core Focus)" : ""}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="px-3 py-24 sm:py-32">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
            <LineMask>Built Across Sectors</LineMask>
          </h2>

          <motion.p
            className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
          >
            From national platforms to neighborhood apps.
          </motion.p>

          <div className="mt-10">
            <IndustriesMobile industries={INDUSTRIES} />
          </div>
        </div>
      )}
    </section>
  );
}
