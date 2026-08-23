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
 * Sejak 23 Agu galeri kolom expanding diganti tumpukan kartu 3D
 * (IndustriesStack, porting pmndrs `raycast-cycling`): strip putih
 * full-bleed tanpa radius, kartu digilir wheel. Konsekuensinya heading
 * pindah dari kolom sticky kiri ke blok di atas strip (pola Office +
 * ServicesTicker).
 *
 * Gerbang desktop DIRANGKAP pointer presisi: wheel-cycling butuh hover +
 * wheel, jadi tablet landscape 1024px+ (coarse, tanpa hover) jatuh ke
 * carousel IndustriesMobile, bukan menerima canvas yang tak bisa
 * dimainkan. Ini beda dari galeri lama yang cukup patokan lebar.
 */
export default function Industries() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const coarse = useCoarsePointer();
  const showStack = isDesktop && !coarse;
  const total = String(INDUSTRIES.length).padStart(2, "0");
  const coreCount = INDUSTRIES.filter((s) => s.tier === "core").length;

  return (
    <section
      id="industries"
      className="relative z-10 overflow-x-clip border-y border-white/[0.08] bg-white/[0.02]"
    >
      <div className="px-3 pt-24 sm:pt-32">
        <motion.p
          className="text-xs tracking-widest text-zinc-400 uppercase"
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          Industries
        </motion.p>

        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
          <LineMask>Built Across Sectors</LineMask>
        </h2>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <motion.p
            className="max-w-sm text-sm leading-relaxed text-zinc-400"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
          >
            From national platforms to neighborhood apps.
          </motion.p>

          <span
            className="hidden text-xs tabular-nums text-zinc-500 lg:block"
            aria-hidden="true"
          >
            {total} SECTORS · {coreCount} core
          </span>
        </div>
      </div>

      {showStack ? (
        <>
          {/* Strip full-bleed menempel tepi bawah section — hairline
              border-y section jadi bingkainya, tanpa padding horizontal. */}
          <IndustriesStack industries={INDUSTRIES} className="mt-12" />
          {/* Kartu di canvas bukan DOM (canvas-nya aria-hidden) — daftar
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
        <div className="px-3 pt-10 pb-24 sm:pb-32">
          <IndustriesMobile industries={INDUSTRIES} />
        </div>
      )}
    </section>
  );
}
