"use client";

import { motion } from "motion/react";
import CharReveal from "@/components/motion/CharReveal";
import CursorSpotlight from "@/components/motion/CursorSpotlight";
import Disclosure from "@/components/motion/Disclosure";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const SERVICES: { num: string; title: string; desc: string; subs?: string[] }[] = [
  {
    num: "01",
    title: "Custom Software Development",
    desc: "Tailor-made software designed around your unique business processes, helping you improve productivity, streamline operations, and support long-term growth.",
  },
  {
    num: "02",
    title: "Web Application Development",
    desc: "Modern, responsive, and secure web applications built with performance, scalability, and user experience in mind.",
  },
  {
    num: "03",
    title: "Mobile App Development",
    desc: "Native and cross-platform mobile applications for Android and iOS that deliver seamless user experiences.",
  },
  {
    num: "04",
    title: "Artificial Intelligence Solutions",
    desc: "Leverage AI to automate workflows, enhance customer engagement, analyze data, and unlock new business opportunities through intelligent digital solutions.",
    subs: ["Jenna.ai", "Knowledge Assistants", "Process Automation", "AI-Powered Analytics", "Custom AI Integration"],
  },
  {
    num: "05",
    title: "Enterprise Solutions",
    desc: "Develop enterprise-grade platforms that integrate departments, automate operations, and improve decision-making across your organization.",
  },
  {
    num: "06",
    title: "System Integration",
    desc: "Connect existing applications, third-party services, and business systems through secure and reliable API integrations.",
  },
  {
    num: "07",
    title: "UI/UX Design",
    desc: "Create intuitive and engaging digital experiences through user-centered interface and experience design.",
  },
  {
    num: "08",
    title: "Cloud & DevOps",
    desc: "Deploy, monitor, and optimize applications with modern cloud infrastructure and DevOps best practices for maximum reliability and scalability.",
  },
  {
    num: "09",
    title: "Maintenance & Technical Support",
    desc: "Ensure your applications remain secure, updated, and optimized with continuous support and proactive maintenance.",
  },
];

export default function Services() {
  return (
    <section id="services" className="relative z-10 border-y border-white/[0.08] bg-white/[0.02]">
      <CursorSpotlight className="px-6 py-24 sm:px-10 sm:py-32">
        {/* T6 — eyebrow */}
        <motion.p
          className="text-xs tracking-widest text-zinc-400 uppercase"
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          Our Services
        </motion.p>

        {/* T7 — per-character reveal heading */}
        <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
          <CharReveal text="Building Intelligent Digital Solutions" />
        </h2>

        {/*
          Editorial index: large number as typographic anchor.
          Grid: [number-col | title | toggle] — number is visually dominant,
          desc revealed behind Disclosure. Subs pills preserved on expand.
        */}
        <FadeUpList tag="ul" className="mt-12 border-t border-white/[0.08]">
          {SERVICES.map((s) => (
            <FadeUpItem key={s.num} tag="li">
              <Disclosure
                className="border-b border-white/[0.08]"
                triggerClassName="group w-full text-left"
                contentClassName="pb-6 pl-16 sm:pl-32"
                trigger={(open) => (
                  <div className="relative grid w-full grid-cols-[4rem_1fr_1.5rem] items-center gap-4 py-5 sm:grid-cols-[7rem_1fr_1.5rem]">
                    {/* Large number — typographic anchor */}
                    <span
                      className="text-4xl font-bold tabular-nums leading-none text-zinc-600 transition-colors duration-200 group-hover:text-accent sm:text-5xl"
                      aria-hidden="true"
                    >
                      {s.num}
                    </span>
                    {/* Title — subtle shift toward number on hover */}
                    <span className="font-medium text-zinc-300 transition-[color,transform] duration-200 group-hover:translate-x-1 group-hover:text-zinc-100">
                      {s.title}
                    </span>
                    {/* Toggle indicator */}
                    <span
                      className={`shrink-0 text-sm text-zinc-400 transition-transform duration-200 group-hover:text-zinc-200 ${open ? "rotate-45" : "rotate-0"}`}
                      aria-hidden="true"
                    >
                      +
                    </span>
                    {/* Accent wipe — left→right on hover */}
                    <span
                      className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-300 ease-out group-hover:scale-x-100"
                      aria-hidden="true"
                    />
                  </div>
                )}
              >
                <p className="text-sm leading-relaxed text-zinc-300">{s.desc}</p>
                {s.subs && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {s.subs.map((sub) => (
                      <li
                        key={sub}
                        className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400"
                      >
                        {sub}
                      </li>
                    ))}
                  </ul>
                )}
              </Disclosure>
            </FadeUpItem>
          ))}
        </FadeUpList>
      </CursorSpotlight>
    </section>
  );
}
