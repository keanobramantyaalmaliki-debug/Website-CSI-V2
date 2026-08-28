"use client";

import DeploymentCard, { type DeploymentData } from "@/components/sections/DeploymentCard";
import DeploymentCta from "@/components/sections/DeploymentCta";
import LineMask from "@/components/motion/LineMask";
import { FadeUpList } from "@/components/motion/FadeUp";

const DEPLOYMENTS: DeploymentData[] = [
  {
    num: "01",
    sector: "Public Services",
    region: "Indonesia",
    desc: "Citizens reach government services online, and every agency works from the same information at the same time.",
  },
  {
    num: "02",
    sector: "Infrastructure",
    region: "Indonesia",
    desc: "Physical assets and field crews report in as they work, so issues show up while there's still time to act.",
  },
  {
    num: "03",
    sector: "Logistics",
    region: "International",
    desc: "Every shipment stays visible from origin to delivery. Routine handoffs run on their own, and crews in the field decide with data that is actually current.",
  },
  {
    num: "04",
    sector: "Hospitality",
    region: "Southeast Asia",
    desc: "Property operations and guest service share one system, with revenue reporting built into the same view.",
  },
  {
    num: "05",
    sector: "Communities",
    region: "Indonesia",
    desc: "A single platform ties residents to their local administrators and services, working the same way online and in person.",
  },
];

export default function Deployments() {
  return (
    <section
      id="deployments"
      /* ⚠️ TANPA latar sendiri, dan itu disengaja (18 Agu). Di sini dulu ada
         `linear-gradient(to bottom, rgba(9,9,11,0.4), transparent)` — wash
         gelap setinggi section yang pekat di puncaknya. Selama CsiHero masih
         memakai `bg-background` yang opak, wash itu tersamar; begitu latar
         CsiHero dicabut, ia terbaca sebagai BALOK gelap dengan garis potong
         tegas persis di perbatasan dua section. Latar halaman (body +
         `.ambient-grid`) sudah cukup — jangan pasang wash di sini lagi. */
      /* Mobile: pt-0 (celah ke CsiHero dijatah SATU angka di sana, pb-20) dan
         pb-20 = 80px ke Process yang juga pt-0 — aturan 28 Agu, lihat
         PeopleIntro.tsx. ≥sm kembali py-32. */
      className="section-shell relative overflow-x-clip px-3 pt-0 pb-20 sm:py-32"
    >
      {/* T1 — heading diam dengan line-mask reveal, idiom yang sama dengan
          h2 pembuka section lain.

          Dulu <PhysicsHeading>: tiap kata jadi rigid body matter-js dan
          berjatuhan saat kursor masuk. DICABUT 24 Agu atas permintaan Keano —
          bentuk ini persis cabang `prefers-reduced-motion` komponen itu, jadi
          tampilan diamnya tidak berubah sedikit pun. Eyebrow "DEPLOYMENTS"
          sudah dihapus lebih dulu 18 Agu (judulnya menyebut isinya sendiri). */}
      <h2 className="relative max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
        <LineMask>
          Built for real-world environments where decisions matter.
        </LineMask>
      </h2>

      {/* Deployment cards with stagger entrance */}
      <FadeUpList className="relative mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEPLOYMENTS.map((d) => (
          <DeploymentCard key={d.num} d={d} />
        ))}
        <DeploymentCta />
      </FadeUpList>
    </section>
  );
}
