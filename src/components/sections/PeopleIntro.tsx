import { useMemo } from "react";
import LineMask from "@/components/motion/LineMask";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import { sectionHeading, sectionSubheading } from "@/data/sectionTexts";

export default function PeopleIntro() {
  const baris = useMemo(() => sectionHeading("people-intro"), []);
  const paragraf = useMemo(() => sectionSubheading("people-intro"), []);

  return (
    <section
      id="people-intro"
      /* Section pertama ruangannya (Office sejak tukar konten 19 Agu;
         sebelumnya Function) = yang menempel ke hero 3D, jadi
         padding-atasnya 12px (`pt-3`) di semua lebar — sama dengan gutter
         `px-3` dan sama dengan tiga ruangan lain (aturan padding-tipis, lihat
         CsiHero.tsx). Dulu `pt-6` di HP dan `md:pt-32` (128px) di desktop. */
      /* pb mobile 80px = SELURUH celah visual ke "What We Stand For"
         (PeopleValues meniadakan pt-nya di mobile — satu angka, satu tempat);
         ≥sm kembali pb-24 + pt-24 bawaan values. Permintaan Keano 28 Agu
         (40 → 60 → 80px, disetel sambil lihat hasilnya). */
      className="section-shell px-3 pt-3 pb-20 sm:pb-24"
    >
      <h1 className="text-[clamp(3rem,9vw,6.5rem)] font-semibold tracking-tight text-zinc-100 leading-[1.05]">
        {baris.map((line, i) => (
          <LineMask key={i} delay={i * 0.06}>
            {line}
          </LineMask>
        ))}
      </h1>

      {/* Mobile: 18px judul→paragraf DAN antar-paragraf (permintaan Keano
          28 Agu — dua paragrafnya bertumpuk, jadi gap = jarak vertikal).
          ≥sm keduanya jadi KOLOM berdampingan dan gap berubah arti jadi
          jarak horizontal — angka lamanya (mt-8 / gap-10) dipertahankan. */}
      {/* Dua paragraf = dua kolom di ≥sm, dan itu sebabnya subteks seksi ini
          dibatasi dua paragraf (`maksParagraf: 2` di `shared/sectionText.ts`).
          Satu paragraf tetap sah: gridnya cuma terisi separuh, dan itu masih
          rapi. */}
      {paragraf.length > 0 && (
        <FadeUpList className="mt-[18px] grid gap-[18px] max-w-3xl sm:mt-8 sm:grid-cols-2 sm:gap-10">
          {paragraf.map((teks, i) => (
            <FadeUpItem key={i} tag="div">
              <p className="text-zinc-400 leading-relaxed">{teks}</p>
            </FadeUpItem>
          ))}
        </FadeUpList>
      )}
    </section>
  );
}
