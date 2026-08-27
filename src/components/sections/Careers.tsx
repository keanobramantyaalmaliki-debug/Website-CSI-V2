"use client";

import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import CareersRoles, { type CareerRole } from "./CareersRoles";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Konten role (overview + skills) diambil utuh dari careers section V1
// (Website-CSI index.html) — copy yang sudah tayang, bukan placeholder.
//
// `status: "closed"` = lowongan sudah ditutup: barisnya abu-abu dan mati
// (lihat ClosedRoleRow). Untuk membuka lagi tinggal ganti ke "open" —
// overview/skills/photo-nya sudah siap dan langsung terpakai.
const ROLES: CareerRole[] = [
  {
    title: "Innovation & Growth Manager",
    type: "Management and Strategy",
    status: "closed",
    overview:
      "Lead market discovery, strategic partnerships, and growth initiatives. This role connects innovation with real-world adoption, bridging what we build with who needs it.",
    skills: [
      "Strategic thinking",
      "Business development",
      "Market validation",
      "Stakeholder engagement",
      "Communication",
    ],
    photo: "/careers/innovation-growth-manager.jpg",
  },
  {
    title: "Technical Lead",
    type: "Engineering",
    status: "closed",
    overview:
      "Lead engineering execution, guide technical decisions, and mentor the development team. You see architecture before you see code, and you care about shipping as much as quality.",
    skills: ["Full-stack", "Architecture", "Team leadership", "Delivery ownership"],
    photo: "/careers/technical-lead.jpg",
  },
  {
    title: "Product Builder",
    type: "Product",
    status: "closed",
    overview:
      "Build, test, and iterate new ideas quickly. You move from concept to working product without needing perfect conditions, and you own what you ship.",
    skills: [
      "Builder mindset",
      "Fast execution",
      "Full-stack",
      "Curiosity",
      "Strong ownership",
    ],
    photo: "/careers/product-builder.jpg",
  },
  {
    title: "Full Stack Engineer",
    type: "Engineering",
    status: "open",
    /* Punya halaman sendiri → baris ini TAUTAN, bukan accordion. Isinya di
       data/jobs.ts; keduanya harus memakai slug yang persis sama. Ketiga
       lowongan open sekarang lewat jalur ini. */
    slug: "full-stack-engineer",
    overview:
      "Design and develop modern web applications, APIs, backend systems, and intelligent digital products. AI/RAG and cloud experience is a strong plus.",
    skills: [
      "React / Next.js",
      "Node.js",
      "PostgreSQL",
      "API integration",
      "Git",
      "AI / RAG / Cloud",
    ],
    photo: "/careers/fullstack-engineer.jpg",
  },
  {
    title: "Accountant",
    type: "Finance",
    status: "open",
    slug: "accountant",
    overview:
      "Own the books end to end: bookkeeping, tax compliance, payroll, and monthly reporting. You keep the numbers clean enough that the team can make decisions from them.",
    skills: [
      "Bookkeeping",
      "Tax compliance",
      "Financial reporting",
      "Accounting software",
      "Attention to detail",
    ],
    photo: "/careers/accountant.jpg",
  },
  {
    title: "Customer Success",
    type: "Customer Success",
    status: "open",
    slug: "customer-success",
    /* overview & skills di bawah TIDAK dirender lagi (baris ber-slug tidak
       punya accordion) — dibiarkan hidup supaya baris ini bisa dikembalikan
       jadi accordion tanpa menulis ulang isinya, sama seperti baris closed. */
    overview:
      "Be the bridge between our clients and what we build. You onboard, support, and grow accounts, turning feedback into product direction instead of letting it sit in a thread.",
    skills: [
      "Client relationship",
      "Onboarding",
      "Problem solving",
      "Communication",
      "Product empathy",
    ],
    photo: "/careers/customer-success.jpg",
  },
  {
    title: "Resource & Development",
    /* Kolom Type TIDAK boleh mengulang judulnya persis: barisnya akan
       terbaca "Resource & Development | Resource & Development", dan test
       closed-role yang mencari judul lewat getByText langsung menemukan dua
       simpul. "Human Resources" dipakai karena R&D di sini adalah fungsi
       HRD (Human Resource & Development). */
    type: "Human Resources",
    status: "closed",
    /* Baris closed tidak merender overview/skills/photo sama sekali (lihat
       ClosedRoleRow). Ketiganya diisi ringkas supaya barisnya bisa dibuka
       lagi cukup dengan mengganti status → "open"; isinya diganti dengan
       copy poster resmi saat itu, dan fotonya belum ada di public/careers/. */
    overview:
      "Grow the people and the practices behind what we ship: hiring, onboarding, and internal capability building.",
    skills: [
      "Recruitment",
      "Onboarding",
      "People development",
      "Process documentation",
      "Communication",
    ],
    photo: "/careers/resource-development.jpg",
  },
];

export default function Careers() {
  return (
    <section id="careers" className="section-shell px-3 py-24 sm:py-32">
      {/* Split ala "Open Positions" basement: kiri 35% headline + subtext,
          kanan 65% roles list. Di bawah lg menumpuk seperti biasa. */}
      <div className="lg:grid lg:grid-cols-[35fr_65fr] lg:gap-x-16">
        <div>
          {/* T1 — line-mask heading (label eyebrow dihapus atas permintaan 20 Agu) */}
          {/* Ukuran sama dengan judul "The Crew" (TheCrew.tsx) */}
          <h2 className="max-w-xl text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] font-semibold tracking-tight text-zinc-100">
            <LineMask>Build What Comes Next.</LineMask>
          </h2>

          {/* Subtext dari careers-sub V1 */}
          <motion.p
            className="mt-5 max-w-lg text-sm leading-relaxed font-light text-zinc-400 sm:text-base"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
          >
            We are looking for curious minds who want to create meaningful
            impact through technology.
          </motion.p>
        </div>

        {/* Roles list gaya V1: preview foto ikut kursor + hover-expand + accordion. */}
        <div className="mt-12 lg:mt-0">
          <CareersRoles roles={ROLES} />
        </div>
      </div>
    </section>
  );
}
