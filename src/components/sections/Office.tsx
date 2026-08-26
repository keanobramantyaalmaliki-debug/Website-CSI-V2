"use client";

import { motion } from "motion/react";
import TestimonialSpotlight from "@/components/sections/TestimonialSpotlight";
import LineMask from "@/components/motion/LineMask";
import ServicesTicker from "@/components/canvas/ServicesTicker";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Office deep-dive services — moved from Services.tsx (former Lounge
 * accordion) since Office is the single place service detail now lives.
 *
 * Sejak 21 Agu daftarnya tampil sebagai sabuk teks 3D (ServicesTicker, ala
 * panel Lusion) — accordion Disclosure + foto Unsplash + PinnedServiceStack
 * dicabut. `desc`/`subs` tetap di sini untuk daftar sr-only (pembaca layar
 * & SEO; teks troika di canvas tidak terbaca mesin).
 */
const SERVICES: { num: string; title: string; desc: string; subs?: string[] }[] = [
  {
    num: "01",
    title: "Custom Software Development",
    desc: "Software built around your processes, not the other way around.",
  },
  {
    num: "02",
    title: "Web Application Development",
    desc: "Fast, secure web apps built to scale with you.",
  },
  {
    num: "03",
    title: "Mobile App Development",
    desc: "Native and cross-platform apps for Android and iOS.",
  },
  {
    num: "04",
    title: "Artificial Intelligence Solutions",
    desc: "AI that automates workflows and surfaces opportunities in your data.",
    subs: ["Jenna.ai", "Knowledge Assistants", "Process Automation", "AI-Powered Analytics", "Custom AI Integration"],
  },
  {
    num: "05",
    title: "Enterprise Solutions",
    desc: "Platforms that connect departments and sharpen decisions org-wide.",
  },
  {
    num: "06",
    title: "System Integration",
    desc: "Secure API integrations that connect your existing systems.",
  },
  {
    num: "07",
    title: "UI/UX Design",
    desc: "User-centered interfaces people actually enjoy using.",
  },
  {
    num: "08",
    title: "Cloud & DevOps",
    desc: "Cloud infrastructure and DevOps built for reliability at scale.",
  },
  {
    num: "09",
    title: "Maintenance & Technical Support",
    desc: "Ongoing support that keeps your systems secure and current.",
  },
];

export default function Office() {
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
      className="section-shell relative z-10 px-3 pt-3 pb-24 sm:pb-32"
    >
      <div>
        {/* T1 — line-mask heading. Ukuran font & lebar maksimum MENYAMAI h2
            CsiHero di Home (text-4xl sm:text-6xl lg:text-7xl, max-w-5xl) —
            keduanya heading pembuka ruangan yang menempel ke hero 3D, jadi
            skalanya harus terbaca setara (20 Agu). Eyebrow "Services" dicabut
            bersamaan: navbar sudah menyebut nama halamannya. */}
        <h2 className="max-w-5xl text-4xl font-semibold tracking-tight text-zinc-100 sm:text-6xl lg:text-7xl">
          <LineMask>Where Software Becomes Intelligence.</LineMask>
        </h2>

        {/* Overview — [what we build] + [impact on audience] + [who we serve, X to Y] */}
        <motion.p
          className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
        >
          We build the software, AI, and cloud infrastructure that turn
          scattered operations into decisions your team can act on for
          government agencies and enterprises across Indonesia.
        </motion.p>
      </div>

      {/* Panel putih ala Lusion — satu-satunya bidang terang di halaman,
          berisi sabuk teks 3D 9 layanan (lihat ServicesTicker.tsx). */}
      <ServicesTicker
        className="mt-16"
        items={SERVICES.map(({ num, title }) => ({ num, title }))}
      />

      {/* Daftar layanan yang terbaca mesin. Teks troika di canvas tidak masuk
          accessibility tree ataupun terindeks — konten sesungguhnya (termasuk
          desc + subs yang dulunya di accordion) hidup di sini. */}
      <ul className="sr-only">
        {SERVICES.map((s) => (
          <li key={s.num}>
            {s.title}: {s.desc}
            {s.subs ? ` (${s.subs.join(", ")})` : ""}
          </li>
        ))}
      </ul>

      {/* Testimonial — redesain 20 Agu: kartu blockquote lama diganti
          spotlight gaya basement.studio (quote raksasa di tengah + hairline
          per baris + panah prev/next). Isi masih placeholder fiktif —
          lihat TODO(content) di TestimonialSpotlight.tsx. */}
      <TestimonialSpotlight />

    </section>
  );
}
