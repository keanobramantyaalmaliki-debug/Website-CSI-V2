"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import CsiParticleField from "@/components/motion/CsiParticleField";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const HEADING_LINES = [
  ["Think", "Beyond", "Software."],
  ["Build", "Intelligence."],
];

export default function CsiHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: false, margin: "-10% 0px -10% 0px" });

  return (
    <section
      id="csi"
      ref={sectionRef}
      /* Padding ATAS dipisah dari padding bawah, dan patokannya `md:` bukan
         `sm:` — mengikuti breakpoint yang memisah dua koreografi hero.

         Di HP CsiHero adalah section pertama yang menempel langsung ke hero
         (tanpa seam — lihat motion/HeroHandoff.tsx), jadi padding-atasnya
         adalah SATU-SATUNYA jarak antara kantor 3D dan "Think Beyond
         Software.". `pt-16` (64px) di sana terbaca sebagai celah menganga:
         judulnya terlempar ke bawah lipatan padahal hero sengaja disisakan
         30% supaya judul itu terbaca tanpa digulir. `pt-6` (24px) menyamai
         padding kiri-kanan `px-6`, jadi jaraknya terbaca disengaja.

         ≥768px padding atasnya kembali 80px (`md:pt-20`, sama seperti
         `sm:py-20` sebelumnya) — di sana hero dipaku setinggi layar dan
         section ini meluncur menutupinya, jadi butuh ruang napas. */
      className="relative overflow-hidden bg-background px-6 pt-6 pb-16 sm:px-10 sm:pb-20 md:pt-20"
    >
      <div className="relative z-10 lg:grid lg:grid-cols-2 lg:gap-12">
        <div>
          <FadeUpList tag="div">
            {/* `text-4xl` di HP menahan DUA hal sekaligus — kalau mau
                menaikkannya lagi ke `text-5xl`, ukur keduanya:

                1. LEBAR. Di ~360px "Intelligence." pada 48px meluber keluar
                   layar, dan itu membuat SELURUH dokumen bisa digeser ke
                   samping (f30614f). `break-words` jaring pengaman terakhirnya.
                2. TINGGI. Hero 3D mengambil 70dvh, jadi judul ini cuma
                   kebagian 30dvh. Di layar setinggi 640px itu = 192px, dan
                   judul 4 baris pada 48px juga persis 192px — "Intelligence."
                   terpotong separuh. Pada 36px ia muat dengan sisa napas. */}
            <h2 className="break-words text-4xl font-semibold tracking-tight text-zinc-100 sm:text-7xl lg:text-8xl">
              {HEADING_LINES.map((line, lineIdx) => (
                <span key={lineIdx} className="block">
                  {line.map((word) => (
                    <FadeUpItem key={word} tag="div" className="mr-[0.2em] inline-block last:mr-0">
                      {word}
                    </FadeUpItem>
                  ))}
                </span>
              ))}
            </h2>
          </FadeUpList>

          <motion.p
            className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-400 sm:text-xl"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
          >
            We turn scattered systems into intelligence your organization can
            act on — every day, every decision.
          </motion.p>
        </div>

        <aside className="relative mt-8 lg:mt-0">
          <div className="h-56 lg:h-[20rem]">
            <CsiParticleField active={inView} />
          </div>
        </aside>
      </div>
    </section>
  );
}
