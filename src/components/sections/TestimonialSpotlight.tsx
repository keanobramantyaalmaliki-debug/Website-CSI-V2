"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";

import { testimonials, type TestimonialContent } from "@/data/testimonials";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Testimonial spotlight — basement.studio-style oversized centered quote:
 * no card, the quote IS the layout, with hairline rules running behind every
 * text line (repeating gradient stepped at `1lh`, so the rules track line
 * wrapping at any width) and prev/next arrows cycling the entries.
 *
 * Isinya datang dari CMS (`src/data/testimonials.ts`), yang jatuh ke
 * `testimonialsFallback.ts` kalau `content.json` belum/tidak terbaca. Isi
 * bawaannya masih tiga kutipan karangan — nama, jabatan, dan instansinya bukan
 * orang sungguhan — dan menggantinya dengan testimoni klien asli sekarang
 * pekerjaan panel admin, bukan pekerjaan kode.
 */

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
  t: TestimonialContent;
  center?: boolean;
}) {
  return (
    <>
      <div className={center ? "flex flex-1 items-center" : undefined}>
        <p
          style={LINE_RULES}
          /* max-w-[1300px] = plafon dalam ala basement (27 Agu): lebar kolom
             kutipan di viewport 1440 (shell − tombol panah − gap ≈ 1288).
             Font-nya sudah beku (px per breakpoint); tanpa plafon ini yang
             molor saat zoom-out adalah PANJANG BARISNYA. mx-auto karena
             teksnya center. Berlaku juga di replika sizer (komponen sama). */
          className="mx-auto w-full max-w-[1300px] text-center text-2xl leading-[1.25] font-semibold tracking-tight text-zinc-100 sm:text-4xl lg:text-5xl"
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

  /* Di dalam komponen lewat `useMemo`, BUKAN konstanta modul: daftarnya baru
     ada sesudah `loadContent()`. Lihat peringatan lengkapnya di
     `src/data/testimonials.ts`. */
  const entries = useMemo(() => testimonials(), []);

  const count = entries.length;
  const t = entries[index];

  const step = (dir: 1 | -1) => setIndex(([i]) => [(i + dir + count) % count, dir]);

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * 32 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * -32 }),
  };

  /**
   * Daftar CMS boleh menyusut sampai NOL — sesuatu yang literal array di sini
   * tidak pernah bisa. Tanpa gerbang ini `(i + dir + 0) % 0` menghasilkan NaN,
   * `entries[NaN]` undefined, dan blok ini roboh membawa seluruh halaman.
   * Editor yang menghapus semua kutipannya memang meminta bloknya hilang.
   */
  if (count === 0) return null;

  /* Satu kutipan = tidak ada yang bisa diputar. Panahnya disembunyikan
     ketimbang dibiarkan jadi tombol yang tidak mengubah apa pun. */
  const berputar = count > 1;

  return (
    <motion.div
      /* Jarak ATAS saja (`mt-*`, bukan `my-*`). Sejak AwardsShowcase dicabut
         24 Agu blok ini jadi anak terakhir <Office/>, dan margin-bawahnya
         menumpuk di atas `pb-24 sm:pb-32` section + `pt-24 sm:pt-32` Contact
         — terukur 280px ke wordmark, sementara ruangan lain (/work 112px,
         /people 128px) menutup dengan padding section saja. Aturannya di
         situs ini: anak terakhir sebuah section ber-margin-bawah nol, jarak
         ke Contact milik section-nya. */
      className="mt-28 sm:mt-40"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
    >
      {/* Kolom panah dilepas bareng tombolnya saat cuma ada satu kutipan —
          kalau grid tiga kolomnya dipertahankan, yang tersisa adalah dua
          celah kosong selebar tombol yang menggeser kutipan keluar dari
          tengah halaman. */}
      <div
        className={
          berputar
            ? "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-8"
            : "grid grid-cols-1 items-center"
        }
      >
        {berputar && (
          <button
            type="button"
            aria-label="Previous testimonial"
            onClick={() => step(-1)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-zinc-400 transition-colors hover:border-accent/40 hover:text-accent"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        {/* Tinggi DIKUNCI: sizer tak terlihat merender SEMUA entri menumpuk
            di satu sel grid, jadi tinggi kolom tengah selalu = entri
            terpanjang pada lebar layar itu. Pindah ke quote yang lebih
            pendek tidak menggeser panah maupun section di bawahnya; entri
            aktif dirender absolute di atas sizer. */}
        <div className="relative">
          <div className="invisible grid" aria-hidden="true">
            {entries.map((e) => (
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

        {berputar && (
          <button
            type="button"
            aria-label="Next testimonial"
            onClick={() => step(1)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-zinc-400 transition-colors hover:border-accent/40 hover:text-accent"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
