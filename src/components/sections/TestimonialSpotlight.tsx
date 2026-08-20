"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Testimonial spotlight — basement.studio-style oversized centered quote:
 * no card, the quote IS the layout, with hairline rules running behind every
 * text line (repeating gradient stepped at `1lh`, so the rules track line
 * wrapping at any width) and prev/next arrows cycling the entries.
 *
 * All entries are fabricated placeholders so the layout reads as filled
 * content during review, not real endorsements: names/roles/agencies are
 * invented clients, not actual people.
 * TODO(content): replace with actual client quotes + names/roles/companies.
 */
const TESTIMONIALS: { quote: string; name: string; role: string }[] = [
  {
    quote:
      "Cogniti rebuilt the systems we’d been patching together for years — what used to take a week of manual work now happens in an afternoon.",
    name: "Ratna Wijaya",
    role: "Head of IT, Dinas Komunikasi & Informatika",
  },
  {
    quote:
      "They didn’t just ship the platform — they sat with our staff until every workflow made sense to the people actually using it.",
    name: "Budi Hartono",
    role: "Operations Director, PT Nusantara Logistik",
  },
  {
    quote:
      "Three legacy systems, one dashboard. Our reporting cycle went from two weeks to same-day.",
    name: "Sari Kusuma",
    role: "Kepala Bagian Program, Pemerintah Kabupaten",
  },
];

/* Hairline per baris teks: gradient berulang setinggi `1lh`, garis 1px di
   dasar tiap baris. `lh` mengikuti line-height terkomputasi elemen, jadi
   garis tetap nempel ke baris teks di semua breakpoint tanpa ukur manual. */
const LINE_RULES = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent 0, transparent calc(1lh - 1px), rgba(255,255,255,0.07) calc(1lh - 1px), rgba(255,255,255,0.07) 1lh)",
};

/* Satu entri (quote + atribusi). `center` dipakai versi aktif: quote
   di-center vertikal di sisa ruang kotak yang tingginya dikunci sizer,
   sementara footer nempel di dasar — jadi avatar/nama tidak ikut naik-turun
   antar entri. Replika sizer memakai layout natural (center=false). */
function Entry({
  t,
  center = false,
}: {
  t: (typeof TESTIMONIALS)[number];
  center?: boolean;
}) {
  return (
    <>
      <div className={center ? "flex flex-1 items-center" : undefined}>
        <p
          style={LINE_RULES}
          className="w-full text-center text-2xl leading-[1.25] font-semibold tracking-tight text-zinc-100 sm:text-4xl lg:text-5xl"
        >
          &ldquo;{t.quote}&rdquo;
        </p>
      </div>
      <footer className="mt-8 flex items-center justify-center gap-4 sm:mt-10">
        <div
          className="grid size-16 shrink-0 place-items-center bg-zinc-800 text-zinc-500 sm:size-20"
          aria-hidden="true"
        >
          <UserRound className="size-8 sm:size-10" strokeWidth={1.5} />
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-zinc-200">{t.name}</div>
          <div className="mt-0.5 text-sm text-zinc-500">{t.role}</div>
        </div>
      </footer>
    </>
  );
}

export default function TestimonialSpotlight() {
  /* index + arah tersimpan bareng: arah slide harus dari klik yang SAMA
     dengan yang mengganti index, kalau state terpisah exit-nya bisa pakai
     arah basi satu klik sebelumnya. */
  const [[index, direction], setIndex] = useState<[number, number]>([0, 0]);
  const reduced = useReducedMotion();
  const count = TESTIMONIALS.length;
  const t = TESTIMONIALS[index];

  const step = (dir: 1 | -1) => setIndex(([i]) => [(i + dir + count) % count, dir]);

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * 32 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * -32 }),
  };

  return (
    <motion.div
      className="my-28 sm:my-40"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-8">
        <button
          type="button"
          aria-label="Previous testimonial"
          onClick={() => step(-1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-zinc-400 transition-colors hover:border-accent/40 hover:text-accent"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Tinggi DIKUNCI: sizer tak terlihat merender SEMUA entri menumpuk
            di satu sel grid, jadi tinggi kolom tengah selalu = entri
            terpanjang pada lebar layar itu. Pindah ke quote yang lebih
            pendek tidak menggeser panah maupun section di bawahnya; entri
            aktif dirender absolute di atas sizer. */}
        <div className="relative">
          <div className="invisible grid" aria-hidden="true">
            {TESTIMONIALS.map((e) => (
              <div key={e.name} className="col-start-1 row-start-1">
                <Entry t={e} />
              </div>
            ))}
          </div>

          {/* aria-live: pergantian quote lewat AnimatePresence tidak
              memindahkan fokus, jadi screen reader perlu diberi tahu isi
              barunya. */}
          <div
            className="absolute inset-0"
            aria-live="polite"
            data-testid="testimonial-active"
          >
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.blockquote
                key={index}
                className="flex h-full flex-col"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
              >
                <Entry t={t} center />
              </motion.blockquote>
            </AnimatePresence>
          </div>
        </div>

        <button
          type="button"
          aria-label="Next testimonial"
          onClick={() => step(1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-zinc-400 transition-colors hover:border-accent/40 hover:text-accent"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}
