"use client";

import { Link } from "react-router-dom";
import { motion } from "motion/react";
import LineMask from "@/components/motion/LineMask";
import Disclosure from "@/components/motion/Disclosure";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Office deep-dive services — moved from Services.tsx (former Lounge
 * accordion) since Office is the single place service detail now lives.
 */
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

export default function Office() {
  return (
    <section id="office-services" className="relative z-10 px-6 py-24 sm:px-10 sm:py-32">
      {/* T6 — eyebrow */}
      <motion.p
        className="text-xs tracking-widest text-zinc-400 uppercase"
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        Office
      </motion.p>

      {/* T1 — line-mask heading */}
      <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-5xl">
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
        We build the software platforms, AI systems, and cloud infrastructure
        that turn scattered operations into decisions your team can act on
        immediately. From government agencies modernizing public services to
        enterprises running complex, multi-site operations across Indonesia
        and beyond, our clients trust us with the systems their work actually
        depends on.
      </motion.p>

      {/*
        Editorial index: large number as typographic anchor.
        Grid: [number-col | title | toggle] — number is visually dominant,
        desc revealed behind Disclosure. Subs pills preserved on expand.
      */}
      <FadeUpList tag="ul" className="mt-16 border-t border-white/[0.08]">
        {SERVICES.map((s) => (
          <FadeUpItem key={s.num} tag="li">
            <Disclosure
              className="border-b border-white/[0.08]"
              triggerClassName="group w-full text-left"
              contentClassName="pb-6 pl-16 sm:pl-32"
              trigger={(open) => (
                <div className="grid w-full grid-cols-[4rem_1fr_1.5rem] items-center gap-4 py-5 sm:grid-cols-[7rem_1fr_1.5rem]">
                  {/* Large number — typographic anchor */}
                  <span
                    className="text-4xl font-bold tabular-nums leading-none text-zinc-600 transition-colors duration-200 group-hover:text-accent sm:text-5xl"
                    aria-hidden="true"
                  >
                    {s.num}
                  </span>
                  {/* Title */}
                  <span className="font-medium text-zinc-300 transition-colors duration-200 group-hover:text-zinc-100">
                    {s.title}
                  </span>
                  {/* Toggle indicator */}
                  <span
                    className={`shrink-0 text-sm text-zinc-400 transition-transform duration-200 group-hover:text-zinc-200 ${open ? "rotate-45" : "rotate-0"}`}
                    aria-hidden="true"
                  >
                    +
                  </span>
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

      {/* Testimonial — structural placeholder mirroring basement.studio's single
          client-quote section. No real client quote exists yet, so this is a
          dashed-border stand-in rather than fabricated social proof.
          TODO(content): replace with an actual client quote + name/role/company. */}
      <motion.blockquote
        className="mt-16 rounded-2xl border border-dashed border-white/15 p-8 sm:p-10"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
      >
        <p className="max-w-xl text-lg leading-relaxed text-zinc-500 italic sm:text-xl">
          “Client testimonial — pending.”
        </p>
        <footer className="mt-4 text-sm text-zinc-600">
          Name, role — Company (placeholder, awaiting real quote)
        </footer>
      </motion.blockquote>

      {/* Recognition strip — structural placeholder mirroring basement.studio's
          awards strip. No verified award history exists yet, so no badge count
          or award names are invented here.
          TODO(content): replace with real award/recognition list, if any. */}
      <motion.div
        className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-white/15 p-8 sm:p-10"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
      >
        <p className="text-sm text-zinc-600">
          Recognition &amp; awards — pending (placeholder)
        </p>
      </motion.div>

      {/* CTA — links back to Contact in Lounge (only room where #contact exists) */}
      <motion.div
        className="mt-16 flex flex-wrap items-center gap-4"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.25 }}
      >
        <Link
          to="/#contact"
          className="group relative inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
        >
          Talk to us
          <span className="grid h-5 w-5 place-items-center rounded-full bg-zinc-900/10 text-zinc-900 transition-transform duration-200 group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </motion.div>
    </section>
  );
}
