"use client";

import { useMemo, useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import Disclosure from "@/components/motion/Disclosure";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import { caseStudies, type CaseStudyContent } from "@/data/caseStudies";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function SpotlightItem({ spotlight }: { spotlight: CaseStudyContent }) {
  const imageRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: imageRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 0.5, 1], reduced ? [0, 0, 0] : [-16, 0, 16]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], reduced ? [1, 1, 1] : [1.04, 1, 1.04]);

  return (
    <FadeUpItem
      tag="article"
      className="border-t border-white/[0.06] pt-8 first:border-t-0 first:pt-0 lg:pt-12"
    >
      <Disclosure
        className="border border-white/[0.06] bg-white/[0.01]"
        triggerClassName="group relative block w-full overflow-hidden text-left"
        contentClassName="flex max-w-[1400px] flex-col gap-6 p-6"
        /* max-w-[1400px] = plafon dalam ala basement (27 Agu): lebar kolom ini
           di viewport 1440. Di bawah itu tak tersentuh; saat zoom-out (atau
           monitor 1920) kotak border tetap selebar shell, isinya berhenti di
           1400 dan ruang kosonglah yang tumbuh. */
        trigger={(open) => (
          <div ref={imageRef} className="relative overflow-hidden">
            <motion.img
              src={spotlight.image}
              alt=""
              loading="lazy"
              className="aspect-[3/4] w-full object-cover transition-[filter] duration-500 sm:aspect-[16/10] lg:aspect-auto lg:h-[480px] lg:group-hover:brightness-[0.45]"
              style={{ y, scale }}
              transition={{ duration: 0.6, ease: EASE }}
            />
            {/* Meta/title/outcome overlay — always visible below lg (no hover
                to reveal it there, hence the taller image gives it room),
                fades in on hover only at lg+ where the image is otherwise clean. */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 pt-20 opacity-100 transition-opacity duration-300 sm:gap-2 sm:p-6 lg:pt-16 lg:opacity-0 lg:group-hover:opacity-100">
              <p className="font-mono text-[11px] tracking-widest text-zinc-300 sm:text-xs">
                {spotlight.client} · {spotlight.industry} · {spotlight.year}
              </p>
              <h3 className="text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl lg:text-2xl">
                {spotlight.title}
              </h3>
              {/* Digerbangi walau `outcome` wajib untuk cerita yang tayang:
                  `content.json` bisa ditulis versi server yang lebih tua, dan
                  baris kosong bercetak tebal terbaca sebagai kerusakan. */}
              {spotlight.outcome ? (
                <p className="font-mono text-base font-bold text-zinc-50 sm:text-lg">
                  {spotlight.outcome}
                </p>
              ) : null}
              <span className="text-xs uppercase tracking-widest text-zinc-300">
                {open ? "Show less" : "Read the full story"} {open ? "−" : "+"}
              </span>
            </div>
          </div>
        )}
      >
        <p className="text-lg leading-snug font-medium text-zinc-200 sm:text-xl">
          &ldquo;{spotlight.quote}&rdquo;
        </p>

        <div className="flex flex-col gap-4">
          {spotlight.desc.split("\n\n").map((para, i) => (
            <p key={i} className="text-sm leading-relaxed text-zinc-400">
              {para}
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-white/[0.06] pt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] tracking-[0.18em] text-zinc-500 uppercase">
                Client
              </span>
              <span className="text-sm text-zinc-200">{spotlight.client}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] tracking-[0.18em] text-zinc-500 uppercase">
                Year
              </span>
              <span className="text-sm text-zinc-200">{spotlight.year}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] tracking-[0.18em] text-zinc-500 uppercase">
                Industry
              </span>
              <span className="text-sm text-zinc-200">{spotlight.industry}</span>
            </div>
          </div>
          {/* Judul "Scope" ikut digerbangi, bukan cuma daftarnya: judul yang
              berdiri sendiri di atas ruang kosong lebih buruk daripada tidak
              ada bagian ini sama sekali. */}
          {spotlight.scope.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[9px] tracking-[0.18em] text-zinc-500 uppercase">
                Scope
              </span>
              <div className="flex flex-wrap gap-1.5">
                {spotlight.scope.map((t) => (
                  <span
                    key={t}
                    className="rounded-sm border border-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Disclosure>
    </FadeUpItem>
  );
}

export default function CaseStudySpotlight() {
  /* ⚠️ DI DALAM komponen, bukan di ruang modul. `content.json` baru mendarat
     sesudah `loadContent()` di `main.tsx`; sebuah `const SPOTLIGHTS =
     caseStudies()` di atas sana akan membeku pada isi cadangan selamanya,
     tanpa satu pun error. Lihat catatan lengkapnya di `src/data/caseStudies.ts`. */
  const items = useMemo(() => caseStudies(), []);

  /* Daftar kosong = seksinya tidak ada, bukan judul "Case Studies" di atas
     ruang kosong. Editor yang menghapus semua ceritanya memang meminta itu. */
  if (items.length === 0) return null;

  return (
    <section
      id="case-spotlight"
      /* Mobile: pt-0 (celah 80px ke CaseGrid dijatah di pb-20 sana) dan
         pb-20 = 80px ke Contact yang pt-0 (aturan 28 Agu, lihat
         PeopleIntro.tsx); ≥sm kembali py-28. */
      className="section-shell relative z-10 border-t border-white/[0.06] px-3 pt-0 pb-20 sm:py-28"
    >
      {/* Section header */}
      <div className="mb-12">
        <h2 className="text-[clamp(1.875rem,4.5vw,2.25rem)] font-semibold tracking-tight text-zinc-100 leading-[1.05]">
          <LineMask>Case Studies</LineMask>
        </h2>
      </div>

      {/* Spotlights */}
      <FadeUpList className="flex flex-col gap-10 lg:gap-16">
        {items.map((s) => (
          <SpotlightItem key={s.title} spotlight={s} />
        ))}
      </FadeUpList>
    </section>
  );
}
