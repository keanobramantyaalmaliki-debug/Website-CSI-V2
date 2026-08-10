"use client";

import { useReducedMotion } from "motion/react";

/**
 * Opaque seam between the pinned 3D hero and the first content section.
 * Full-motion: -mt-32 pulls it up into the sticky hero zone (slides over the
 * receding canvas). z-20 > canvas, < Navbar z-50. Reduced-motion: normal-flow,
 * no overlap.
 */
export default function HeroHandoff() {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div
        aria-hidden="true"
        className="h-20 w-full"
        style={{ background: "linear-gradient(to bottom, #0a0a0c 0%, #14161b 100%)" }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      /* HANYA ADA DI LAYAR LEBAR — `hidden md:block`.

         Layar lebar: h-20 (80px) menyelip 128px ke zona sticky lewat `-mt-32`,
         meluncur menutupi canvas yang sedang surut, sudut membulat membuatnya
         terbaca sebagai panel yang terangkat. Itu inti desain `join`.

         HP: TIDAK DIRENDER. Semua yang dilakukannya bergantung pada adanya
         canvas surut untuk ditutupi, dan di HP hero tidak dipaku maupun surut
         (lihat sections/Hero.tsx) — jadi tak ada apa pun untuk di-handoff.
         Yang tersisa cuma efek sampingnya: strip 40px yang menimpa bagian
         bawah kantor. Itu sebabnya "3D dapat 70%" tidak tercapai dengan
         menaikkan tinggi hero saja — 70dvh track dikurangi seam 40px cuma
         menyisakan 65% yang betul-betul terlihat.

         Di HP batas hero → konten karena itu polos: canvas langsung bertemu
         `bg-background`. Kebetulan yang enak, warna dasar seam (#14161b) MEMANG
         --background, jadi tidak ada yang hilang selain gradiennya.

         ⚠️ Riwayat, supaya tidak diulang: pernah dicoba `-mt-10 h-10` (tarikan
         = tinggi, sumbangan bersih ke aliran halaman NOL). Itu betul soal
         ALIRAN — konten memang mulai persis di tempat hero berakhir — tapi
         menyesatkan soal YANG TERLIHAT, karena 40px kantor tetap tertimpa.
         Sumbangan nol ke layout ≠ nol ongkos ke visual.

         ⚠️ Jangan biarkan `-mt-32` ikut ke HP kalau seam ini suatu saat
         dihidupkan lagi di sana. Hero HP tidak dipaku, jadi 128px itu bukan
         menyelip ke landasan pin melainkan MEMOTONG 128px terakhir kantor. */
      className="hidden w-full border-t border-white/10 md:relative md:z-20 md:-mt-32 md:block md:h-20 md:rounded-t-3xl"
      style={{ background: "linear-gradient(to bottom, #0a0a0c 0%, #14161b 100%)" }}
    />
  );
}
