"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import TestimonialSpotlight from "@/components/sections/TestimonialSpotlight";
import LineMask from "@/components/motion/LineMask";
import ServicesTicker from "@/components/canvas/ServicesTicker";
import { sectionHeading, sectionSubheading } from "@/data/sectionTexts";
import { services } from "@/data/services";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Office deep-dive services — moved from Services.tsx (former Lounge
 * accordion) since Office is the single place service detail now lives.
 *
 * Sejak 21 Agu daftarnya tampil sebagai sabuk teks 3D (ServicesTicker, ala
 * panel Lusion) — accordion Disclosure + foto Unsplash + PinnedServiceStack
 * dicabut. `desc`/`subs` tetap ikut untuk daftar sr-only (pembaca layar
 * & SEO; teks troika di canvas tidak terbaca mesin).
 *
 * Sejak 2 Sep daftarnya datang dari CMS lewat `@/data/services` — literal
 * `SERVICES` yang dulu di sini pindah ke `src/data/servicesFallback.ts`.
 * Nomor "01"–"09"-nya ditinggalkan di sana: ia tidak pernah dicetak ke layar,
 * cuma jadi `key` React, dan judul layanan sudah unik.
 */
export default function Office() {
  /* ⚠️ DI DALAM komponen, bukan di ruang modul: `content.json` baru mendarat
     sesudah `loadContent()` di main.tsx, jadi konstanta modul akan membekukan
     isi cadangan selamanya tanpa satu pun error. Lihat catatan lengkapnya di
     `src/data/services.ts`. */
  const daftar = useMemo(() => services(), []);
  const baris = useMemo(() => sectionHeading("services-lead"), []);
  const paragraf = useMemo(() => sectionSubheading("services-lead"), []);

  return (
    <section
      id="services"
      /* Section pertama ruangannya (Function sejak tukar konten 19 Agu;
         sebelumnya Office) = yang menempel ke hero 3D, jadi
         padding-atasnya 12px (`pt-3`) di semua lebar — sama dengan gutter
         `px-3` dan sama dengan tiga ruangan lain (aturan padding-tipis untuk
         section pertama tiap ruangan, lihat CsiHero.tsx). Dulu `pt-6` di HP
         dan `md:pt-32` (128px) di desktop; 128px itu terbaca mengambang jauh
         dari kantor, dicabut 18 Agu. */
      /* pb mobile 80px = SELURUH celah visual ke Contact (pt-0 di sana);
         aturan 28 Agu, lihat PeopleIntro.tsx. ≥sm kembali pb-32. */
      className="section-shell relative z-10 px-3 pt-3 pb-20 sm:pb-32"
    >
      <div>
        {/* T1 — line-mask heading. Ukuran font & lebar maksimum MENYAMAI h2
            CsiHero di Home (text-4xl sm:text-6xl lg:text-7xl, max-w-5xl) —
            keduanya heading pembuka ruangan yang menempel ke hero 3D, jadi
            skalanya harus terbaca setara (20 Agu). Eyebrow "Services" dicabut
            bersamaan: navbar sudah menyebut nama halamannya. */}
        <h2 className="max-w-5xl text-4xl font-semibold tracking-tight text-zinc-100 sm:text-6xl lg:text-7xl">
          {baris.map((line, i) => (
            <LineMask key={i} delay={i * 0.06}>
              {line}
            </LineMask>
          ))}
        </h2>

        {/* Overview — [what we build] + [impact on audience] + [who we serve, X to Y] */}
        {paragraf.length > 0 && (
          <motion.p
            /* mt mobile 18px = standar judul→subteks 28 Agu (PeopleIntro);
               ≥sm kembali 24px. */
            className="mt-[18px] max-w-2xl text-base leading-relaxed text-zinc-400 sm:mt-6 sm:text-lg"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
          >
            {paragraf[0]}
          </motion.p>
        )}
      </div>

      {/* Panel putih ala Lusion — satu-satunya bidang terang di halaman,
          berisi sabuk teks 3D layanan (lihat ServicesTicker.tsx).

          Digerbangi daftar kosong, dan itu bukan kehati-hatian berlebihan:
          `beltX()` membagi dengan `slot * count`, jadi nol layanan bukan panel
          kosong melainkan panel putih setinggi 45svh berisi NaN. Editor yang
          menghapus semua layanannya memang meminta bagian ini hilang, bukan
          menyisakan bidang terang tanpa isi. */}
      {daftar.length > 0 && (
        <>
          <ServicesTicker
            className="mt-16"
            items={daftar.map(({ title }) => ({ title }))}
          />

          {/* Daftar layanan yang terbaca mesin. Teks troika di canvas tidak
              masuk accessibility tree ataupun terindeks — konten sesungguhnya
              (termasuk desc + subs yang dulunya di accordion) hidup di sini. */}
          <ul className="sr-only">
            {daftar.map((s) => (
              <li key={s.title}>
                {s.title}: {s.desc}
                {s.subs.length ? ` (${s.subs.join(", ")})` : ""}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Testimonial — redesain 20 Agu: kartu blockquote lama diganti
          spotlight gaya basement.studio (quote raksasa di tengah + hairline
          per baris + panah prev/next). Isi masih placeholder fiktif —
          lihat TODO(content) di TestimonialSpotlight.tsx. */}
      <TestimonialSpotlight />

    </section>
  );
}
