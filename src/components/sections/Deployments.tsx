"use client";

import { useRef } from "react";
import { gsap, useGSAP, CSI_EASE } from "@/lib/gsap/register";
import DeploymentCard, { type DeploymentData } from "@/components/sections/DeploymentCard";
import PhysicsHeading from "@/components/motion/PhysicsHeading";

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

export default function Deployments() {
  const sectionRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(eyebrowRef.current, {
        opacity: 0,
        x: -8,
        duration: 0.5,
        ease: CSI_EASE,
        scrollTrigger: { trigger: eyebrowRef.current, start: "top bottom", once: true },
      });

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-deployment-card]", {
          opacity: 0,
          y: 14,
          duration: 0.55,
          ease: CSI_EASE,
          stagger: 0.08,
          delay: 0.1,
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top bottom-=60",
            once: true,
          },
        });
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="deployments"
      className="relative px-6 py-24 sm:px-10 sm:py-32"
      style={{
        background:
          "linear-gradient(to bottom, rgba(9,9,11,0.4) 0%, transparent 100%)",
      }}
    >
      {/* T6: eyebrow */}
      <p
        ref={eyebrowRef}
        className="relative text-xs tracking-widest text-zinc-400 uppercase"
      >
        Deployments
      </p>

      {/* T1: physics heading — click to fall, leave/release to spring back */}
      <PhysicsHeading
        text="Built for real-world environments where decisions matter."
        className="relative mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl"
      />

      {/* Deployment cards with stagger entrance */}
      <div
        ref={gridRef}
        className="relative mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {DEPLOYMENTS.map((d) => (
          <DeploymentCard key={d.num} d={d} />
        ))}
      </div>
    </section>
  );
}
