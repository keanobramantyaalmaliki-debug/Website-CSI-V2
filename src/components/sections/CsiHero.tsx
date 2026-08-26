"use client";

import { motion } from "motion/react";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const HEADING_LINES = [
  ["Think", "beyond", "software."],
  ["Build", "intelligence."],
];

export default function CsiHero() {
  return (
    <section
      id="csi"
      /* Padding ATAS dipisah dari padding bawah, dan patokannya `md:` bukan
         `sm:` — mengikuti breakpoint yang memisah dua koreografi hero.

         CsiHero adalah section pertama yang menempel LANGSUNG ke hero — tidak
         ada seam di antaranya di lebar layar mana pun (dulu ada, lihat
         routes/SiteLayout.tsx) — jadi padding-atasnya adalah SATU-SATUNYA
         jarak antara kantor 3D dan "Think beyond software.".

         Angkanya 12px (`pt-3`) di SEMUA lebar layar — sama persis dengan
         gutter kiri-kanan `px-3`, jadi konten berjarak sama dari tepi kantor
         3D ke arah mana pun. Aturan yang sama dipasang di section pertama
         setiap ruangan (Office, MeetingLead, PeopleIntro) supaya keempat
         ruangan bertemu hero dengan jarak yang identik.

         Yang PERNAH dicoba dan kenapa gugur: `pt-16` (64px) di HP melempar
         judul ke bawah lipatan padahal hero sengaja disisakan 30% supaya judul
         terbaca tanpa digulir; `pt-6` (24px) menyamai gutter lama `px-6` dan
         ikut turun begitu gutter-nya turun; `md:pt-20` (80px) di desktop
         membuat judul terbaca mengambang jauh dari kantor — dicabut 18 Agu.

         Ini padding SECTION, bukan celah: 3D tetap bertemu konten tanpa garis
         pemisah.

         ⚠️ TANPA `bg-background`, dan itu disengaja (18 Agu). Warnanya memang
         sama persis dengan body, jadi kelas itu terlihat tidak berakibat apa-
         apa — tapi ia OPAK, dan yang ditutupinya adalah `.ambient-grid`:
         lapisan grid 64px `position: fixed` di z-0 yang membentang di belakang
         seluruh halaman (lihat index.css & routes/SiteLayout.tsx). Akibatnya
         section ini jadi satu-satunya pita polos di antara section lain yang
         bergrid — terbaca sebagai balok yang lebih terang dengan garis potong
         tegas tepat di perbatasan Deployments. Section lain (Deployments dst.)
         memang tidak memasang latar sendiri; jangan tambahkan di sini. */
      className="section-shell relative overflow-hidden px-3 pt-3 pb-16 sm:pb-20"
    >
      {/* Satu kolom penuh. Dulu `lg:grid-cols-2` dengan CsiParticleField di
          kolom kanan — partikelnya DICABUT 18 Agu, dan kolom kanan ikut
          dicabut bersamanya: menyisakan grid dua kolom hanya akan menahan
          judul di setengah lebar tanpa ada apa pun di sebelahnya. */}
      <div className="relative z-10">
        <FadeUpList tag="div">
          {/* `text-4xl` di HP menahan DUA hal sekaligus — kalau mau
              menaikkannya lagi ke `text-5xl`, ukur keduanya:

              1. LEBAR. Di ~360px "intelligence." pada 48px meluber keluar
                 layar, dan itu membuat SELURUH dokumen bisa digeser ke
                 samping (f30614f). `break-words` jaring pengaman terakhirnya.
              2. TINGGI. Hero 3D mengambil 70dvh, jadi judul ini cuma
                 kebagian 30dvh. Di layar setinggi 640px itu = 192px, dan
                 judul 4 baris pada 48px juga persis 192px — "intelligence."
                 terpotong separuh. Pada 36px ia muat dengan sisa napas. */}
          <h2 className="max-w-5xl break-words text-4xl font-semibold tracking-tight text-zinc-100 sm:text-6xl lg:text-7xl">
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

        {/* `max-w-3xl` (768px) bukan angka bebas: pada `text-lg` ia memberi
            paragraf ini empat baris — sama seperti di situs yang sudah tayang,
            yang dipakai sebagai acuan. Lebih lebar dari itu barisnya jadi
            terlalu panjang untuk dibaca; lebih sempit, paragrafnya memanjang
            jadi enam baris dan mulai terbaca seperti blok teks. */}
        <motion.p
          className="mt-6 max-w-3xl text-base leading-relaxed text-zinc-400 sm:mt-8 sm:text-lg"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
        >
          We build intelligent digital solutions that help businesses,
          enterprises, and governments innovate, automate, and grow. At cogniti,
          we believe software should do more than function. It should create
          value, simplify complexity, and empower organizations to make smarter
          decisions.
        </motion.p>
      </div>
    </section>
  );
}
