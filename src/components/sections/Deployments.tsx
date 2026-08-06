"use client";

import { motion } from "motion/react";
import DeploymentCard, { type DeploymentData } from "@/components/sections/DeploymentCard";
import PhysicsHeading from "@/components/motion/PhysicsHeading";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const DEPLOYMENTS: DeploymentData[] = [
  {
    num: "01",
    sector: "Public Services",
    region: "Indonesia",
    desc: "Digital transformation for citizen engagement, operational visibility, and inter-agency coordination.",
  },
  {
    num: "02",
    sector: "Infrastructure",
    region: "Indonesia",
    desc: "Integrated monitoring linking physical assets, field operations, and real-time situational awareness.",
  },
  {
    num: "03",
    sector: "Logistics",
    region: "International",
    desc: "Operational intelligence for supply-chain visibility, workflow automation, and field decision support.",
  },
  {
    num: "04",
    sector: "Hospitality",
    region: "Southeast Asia",
    desc: "Operational platforms linking property management, guest-service workflows, and revenue analytics.",
  },
  {
    num: "05",
    sector: "Communities",
    region: "Indonesia",
    desc: "Civic platforms connecting residents, administrators, and local services across digital and physical channels.",
  },
];

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export default function Deployments() {
  return (
    <section
      id="deployments"
      className="relative px-6 py-24 sm:px-10 sm:py-32"
      style={{
        background:
          "linear-gradient(to bottom, rgba(9,9,11,0.4) 0%, transparent 100%)",
      }}
    >
      {/* T6: eyebrow */}
      <motion.p
        className="relative text-xs tracking-widest text-zinc-400 uppercase"
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        Deployments
      </motion.p>

      {/* T1: physics heading — click to fall, leave/release to spring back */}
      <PhysicsHeading
        text="Built for real-world environments where decisions matter."
        className="relative mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl"
      />

      {/* Deployment cards with stagger entrance */}
      <motion.div
        className="relative mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "0px 0px -60px 0px" }}
        variants={staggerContainer}
      >
        {DEPLOYMENTS.map((d) => (
          <DeploymentCard key={d.num} d={d} />
        ))}
      </motion.div>
    </section>
  );
}
