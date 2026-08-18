"use client";

import DeploymentCard, { type DeploymentData } from "@/components/sections/DeploymentCard";
import DeploymentCta from "@/components/sections/DeploymentCta";
import PhysicsHeading from "@/components/motion/PhysicsHeading";
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
      className="relative overflow-x-clip px-3 py-24 sm:py-32"
    >
      {/* T1: physics heading — click to fall, leave/release to spring back.

          Eyebrow "DEPLOYMENTS" DIHAPUS 18 Agu — judulnya sudah menyebut isinya
          sendiri, dan labelnya cuma mengulang nama section. */}
      <PhysicsHeading
        text="Built for real-world environments where decisions matter."
        className="relative max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl"
      />

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
