"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import ScrollHighlight from "@/components/motion/ScrollHighlight";
import ManifestoField from "@/components/motion/ManifestoField";
import PinnedSection from "@/components/motion/PinnedSection";
import { EASE } from "@/lib/motion/tokens";

interface LineConfig {
  text: string;
  role: "setup" | "body" | "thesis" | "close";
}

const LINES: LineConfig[] = [
  { text: "Software connects information. Intelligence connects decisions.", role: "setup" },
  { text: "Organizations are drowning in data. Yet struggling to act.", role: "body" },
  { text: "The future belongs not to those who collect, but to those who act.", role: "thesis" },
  { text: "Intelligence should exist across every interaction. Every workflow. Every decision.", role: "close" },
];

/**
 * Panjang jendela tiap baris, sebagai pecahan tahanan section.
 *
 * Lebih panjang dari jatah gilirannya (0,6 ÷ 3 = 0,2) supaya jendela baris yang
 * bersebelahan bertumpang tindih: satu baris masih menyala saat baris
 * berikutnya mulai. Tanpa tumpang tindih, tiap baris selesai sendiri-sendiri
 * dan yang terbaca adalah empat animasi berurutan, bukan satu sapuan yang
 * membaca manifesto ini dari atas ke bawah.
 */
const LINE_SPAN = 0.4;

/** Potongan progress milik baris ke-`index`; yang terakhir selalu tutup di 1. */
function lineRange(index: number, total: number): [number, number] {
  const step = total > 1 ? (1 - LINE_SPAN) / (total - 1) : 0;
  const start = index * step;
  return [start, start + LINE_SPAN];
}

function ProgressSpine({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="absolute left-0 top-0 bottom-0 w-px bg-zinc-800" aria-hidden="true">
      {/* Tanpa cabang reduced-motion sendiri: PinnedSection sudah menetapkan
          progress di 1 (keadaan selesai) saat gerak dikurangi, jadi tulang
          punggung ini terisi penuh dan diam. */}
      <motion.div
        className="absolute inset-x-0 top-0 bg-zinc-400 origin-top"
        style={{ scaleY: progress, height: "100%" }}
      />
    </div>
  );
}

/** Baris tesis — satu-satunya yang muncul utuh, bukan disorot kata per kata. */
function ThesisLine({
  text,
  progress,
  range,
}: {
  text: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  // Digerakkan progress, BUKAN `whileInView`. Di dalam section yang menahan,
  // whileInView menyala sekali saat section-nya masuk layar — jadi kalimat
  // kuncinya sudah terbaca sebelum tiga baris pengantarnya sempat menyala,
  // dan urutan bacanya terbalik.
  const opacity = useTransform(progress, range, [0, 1]);
  const y = useTransform(progress, range, [12, 0]);

  return (
    <motion.p
      className="text-3xl font-semibold italic leading-[1.15] tracking-tight text-zinc-100 md:text-5xl"
      style={{ opacity, y }}
    >
      {text}
    </motion.p>
  );
}

function ManifestoLine({
  config,
  index,
  total,
  progress,
}: {
  config: LineConfig;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const { role, text } = config;
  const range = lineRange(index, total);

  if (role === "thesis") {
    return <ThesisLine text={text} progress={progress} range={range} />;
  }

  const baseClass =
    role === "setup" || role === "close"
      ? "max-w-2xl text-xl font-medium leading-snug tracking-tight sm:text-2xl"
      : "max-w-2xl text-2xl font-medium leading-snug tracking-tight sm:text-3xl";

  return (
    <ScrollHighlight
      text={text}
      className={baseClass}
      progress={progress}
      range={range}
    />
  );
}

export default function Manifesto() {
  return (
    <PinnedSection
      id="manifesto"
      /* Menahan mulai `md:` saja. Di ponsel keempat baris ini tidak dijamin
         muat dalam satu layar, dan yang meluber dari section yang ditahan
         tidak bisa digulir untuk dilihat — justru menggulir itulah yang
         ditahan. Lihat catatan `pinFrom` di PinnedSection.tsx. */
      pinFrom="md"
      /* `bg-background` WAJIB (dari `join`): Manifesto meluncur DI ATAS canvas
         yang memudar, jadi ia harus buram — tanpa itu kantor 3D terlihat
         menembus teks. Di track, bukan di anak sticky-nya, supaya seluruh
         tinggi section tertutup rata.

         `overflow-hidden` yang dulu ada di sini PINDAH ke anak sticky-nya:
         overflow apa pun pada leluhur elemen sticky mematikan sticky-nya tanpa
         error apa pun. */
      className="bg-background"
      /* `pt-16` (64px, dulu `pt-40` = 160px) menopang hal lain: di HP hero cuma
         setinggi 70dvh (lihat Hero.tsx), dan eyebrow + baris pertama section
         ini harus MENGINTIP di sisa 30% layar. Padding besar sendirian
         menghabiskan jatah itu. Ketiganya terikat — Hero 70dvh, `-mt` di
         HeroHandoff, dan padding ini; mengubah satu tanpa menengok dua lainnya
         membuat Manifesto tidak mengintip sama sekali.

         `md:justify-center` cuma berlaku saat ia benar-benar ditahan: di sana
         kotaknya setinggi layar dan teks yang menempel di atas terlihat
         menggantung. Di ponsel kotaknya setinggi isinya, jadi tidak ada yang
         perlu dipusatkan — dan memusatkannya justru akan mengosongkan bagian
         yang mengintip itu. */
      stickyClassName="relative flex flex-col justify-start overflow-hidden px-6 pb-24 pt-16 sm:px-10 sm:pb-32 sm:pt-20 md:justify-center"
    >
      {(progress) => (
        <>
          {/* Particle field — absolute behind text */}
          <ManifestoField progress={progress} />

          <div className="relative z-10 pl-6">
            {/* Progress spine */}
            <ProgressSpine progress={progress} />

            {/* Eyebrow — anchored above text block */}
            <motion.p
              className="mb-8 text-xs tracking-widest text-zinc-400 uppercase"
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              Manifesto
            </motion.p>

            {/* Lines */}
            <div className="flex flex-col gap-8">
              {LINES.map((line, i) => (
                <ManifestoLine
                  key={i}
                  config={line}
                  index={i}
                  total={LINES.length}
                  progress={progress}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </PinnedSection>
  );
}
