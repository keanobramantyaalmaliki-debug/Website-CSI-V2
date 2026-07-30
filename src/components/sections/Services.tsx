"use client";

import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
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
    <section id="services" className="border-y border-zinc-900 bg-zinc-950/50">
      <div className="px-6 py-24 sm:px-10 sm:py-32">
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

        {/* T1 — line-mask heading */}
        <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
          <LineMask>Building Intelligent Digital Solutions</LineMask>
        </h2>

        {/* Numbered index — stagger entrance, desc behind Disclosure */}
        <FadeUpList tag="ul" className="mt-12 border-t border-zinc-900">
          {SERVICES.map((s) => (
            <FadeUpItem key={s.num} tag="li">
              <Disclosure
                className="border-b border-zinc-900"
                triggerClassName="group flex w-full items-center gap-4 py-5 text-left"
                contentClassName="pb-5 pl-12"
                trigger={(open) => (
                  <>
                    <span className="w-8 shrink-0 text-xs tabular-nums text-zinc-600">
                      {s.num}
                    </span>
                    <span className="flex-1 font-medium text-zinc-300 transition-colors duration-200 group-hover:text-zinc-100">
                      {s.title}
                    </span>
                    <span
                      className={`shrink-0 text-sm text-zinc-600 transition-transform duration-200 group-hover:text-zinc-400 ${open ? "rotate-45" : "rotate-0"}`}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </>
                )}
              >
                <p className="text-sm leading-relaxed text-zinc-500">{s.desc}</p>
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
      </div>
    </section>
  );
}
