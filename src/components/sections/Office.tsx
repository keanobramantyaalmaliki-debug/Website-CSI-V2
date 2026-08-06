"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Award } from "lucide-react";
import LineMask from "@/components/motion/LineMask";
import Disclosure from "@/components/motion/Disclosure";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import { NumberTicker } from "@/components/ui/number-ticker";
import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Office deep-dive services — moved from Services.tsx (former Lounge
 * accordion) since Office is the single place service detail now lives.
 *
 * `image` — stock photo from Unsplash keyed to each service's meaning (code
 * for custom software, a server room for system integration, etc). Same
 * hotlink pattern as DeploymentRow/CaseStudySpotlight (picsum.photos there,
 * Unsplash here) — no local asset to manage, sized via URL query params.
 */
const SERVICES: { num: string; title: string; desc: string; image: string; subs?: string[] }[] = [
  {
    num: "01",
    title: "Custom Software Development",
    desc: "Tailor-made software designed around your unique business processes, helping you improve productivity, streamline operations, and support long-term growth.",
    image: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=640&q=80&auto=format&fit=crop",
  },
  {
    num: "02",
    title: "Web Application Development",
    desc: "Modern, responsive, and secure web applications built with performance, scalability, and user experience in mind.",
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=640&q=80&auto=format&fit=crop",
  },
  {
    num: "03",
    title: "Mobile App Development",
    desc: "Native and cross-platform mobile applications for Android and iOS that deliver seamless user experiences.",
    image: "https://images.unsplash.com/photo-1480694313141-fce5e697ee25?w=640&q=80&auto=format&fit=crop",
  },
  {
    num: "04",
    title: "Artificial Intelligence Solutions",
    desc: "Leverage AI to automate workflows, enhance customer engagement, analyze data, and unlock new business opportunities through intelligent digital solutions.",
    image: "https://images.unsplash.com/photo-1694903110330-cc64b7e1d21d?w=640&q=80&auto=format&fit=crop",
    subs: ["Jenna.ai", "Knowledge Assistants", "Process Automation", "AI-Powered Analytics", "Custom AI Integration"],
  },
  {
    num: "05",
    title: "Enterprise Solutions",
    desc: "Develop enterprise-grade platforms that integrate departments, automate operations, and improve decision-making across your organization.",
    image: "https://images.unsplash.com/photo-1758518729685-f88df7890776?w=640&q=80&auto=format&fit=crop",
  },
  {
    num: "06",
    title: "System Integration",
    desc: "Connect existing applications, third-party services, and business systems through secure and reliable API integrations.",
    image: "https://images.unsplash.com/photo-1614508569207-3295ac89d75f?w=640&q=80&auto=format&fit=crop",
  },
  {
    num: "07",
    title: "UI/UX Design",
    desc: "Create intuitive and engaging digital experiences through user-centered interface and experience design.",
    image: "https://images.unsplash.com/photo-1576153192396-180ecef2a715?w=640&q=80&auto=format&fit=crop",
  },
  {
    num: "08",
    title: "Cloud & DevOps",
    desc: "Deploy, monitor, and optimize applications with modern cloud infrastructure and DevOps best practices for maximum reliability and scalability.",
    image: "https://images.unsplash.com/photo-1690627931320-16ac56eb2588?w=640&q=80&auto=format&fit=crop",
  },
  {
    num: "09",
    title: "Maintenance & Technical Support",
    desc: "Ensure your applications remain secure, updated, and optimized with continuous support and proactive maintenance.",
    image: "https://images.unsplash.com/photo-1553775282-20af80779df7?w=640&q=80&auto=format&fit=crop",
  },
];

// TODO(content): replace dummy stats with verified numbers once available.
const STATS: { value: number; suffix: string; label: string }[] = [
  { value: 50, suffix: "+", label: "Projects delivered" },
  { value: 9, suffix: "", label: "Service lines" },
  { value: 5, suffix: "+", label: "Sectors served" },
];

export default function Office() {
  const [activeService, setActiveService] = useState(0);

  return (
    <section id="office-services" className="relative z-10 px-6 py-24 sm:px-10 sm:py-32">
      <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-8">
        <div>
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
        </div>

        {/* Stat panel — fills the empty right-side space next to the hero
            heading. Dummy figures until real numbers are available. */}
        <motion.dl
          className="grid grid-cols-3 gap-6 border-t border-white/[0.08] pt-6 lg:grid-cols-1 lg:gap-8 lg:border-t-0 lg:border-l lg:border-white/[0.08] lg:pt-0 lg:pl-8"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
        >
          {STATS.map((stat) => (
            <div key={stat.label}>
              <dd className="flex items-baseline gap-0.5 text-3xl font-bold tabular-nums text-zinc-100 sm:text-4xl">
                <NumberTicker value={stat.value} className="text-inherit" />
                <span aria-hidden="true">{stat.suffix}</span>
              </dd>
              <dt className="mt-1 text-xs text-zinc-500">{stat.label}</dt>
            </div>
          ))}
        </motion.dl>
      </div>

      {/*
        Editorial index: large number as typographic anchor.
        Grid: [number-col | title | toggle] — number is visually dominant,
        desc revealed behind Disclosure. Subs pills preserved on expand.

        activeService drives the sticky icon panel on the right — it follows
        whichever row is hovered/focused, independent of accordion open state,
        so browsing the list (without expanding anything) still feels alive.
      */}
      <div className="mt-16 grid gap-8 lg:grid-cols-[1fr_16rem]">
        <FadeUpList tag="ul" className="border-t border-white/[0.08]">
          {SERVICES.map((s, i) => (
            <FadeUpItem key={s.num} tag="li">
              <Disclosure
                className="border-b border-white/[0.08]"
                triggerClassName="group w-full text-left"
                contentClassName="pb-6 pl-16 sm:pl-32"
                trigger={(open) => (
                  <div
                    onMouseEnter={() => setActiveService(i)}
                    onFocus={() => setActiveService(i)}
                    className="grid w-full grid-cols-[4rem_1fr_1.5rem] items-center gap-4 py-5 sm:grid-cols-[7rem_1fr_1.5rem]"
                  >
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
                {/* Mobile/tablet only — desktop shows the same photo in the
                    sticky panel on the right, synced via hover instead of
                    tap, so it isn't repeated here at lg+. */}
                <img
                  src={s.image}
                  alt=""
                  loading="lazy"
                  className="mb-4 aspect-video w-full rounded-lg object-cover lg:hidden"
                />
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

        <StickyScroll
          activeIndex={activeService}
          panels={SERVICES.map((s) => ({
            content: (
              <img
                src={s.image}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ),
          }))}
        />
      </div>

      {/* Testimonial — structural placeholder mirroring basement.studio's single
          client-quote section. No real client quote exists yet, so this is a
          skeleton stand-in rather than fabricated social proof: an avatar
          silhouette + blurred text bars communicate "a quote will go here"
          without inventing a name, role, or words nobody said.
          TODO(content): replace with an actual client quote + name/role/company. */}
      <motion.blockquote
        className="mt-16 flex flex-col gap-6 rounded-2xl border border-dashed border-white/15 p-8 sm:flex-row sm:items-center sm:gap-8 sm:p-10"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
      >
        <div className="size-14 shrink-0 rounded-full bg-zinc-800" aria-hidden="true" />
        <div className="flex-1">
          <div className="flex flex-col gap-2" aria-hidden="true">
            <div className="h-3 w-full max-w-md rounded-full bg-zinc-800/80 blur-[1px]" />
            <div className="h-3 w-full max-w-sm rounded-full bg-zinc-800/80 blur-[1px]" />
            <div className="h-3 w-2/3 max-w-xs rounded-full bg-zinc-800/80 blur-[1px]" />
          </div>
          <footer className="mt-4 text-xs tracking-wide text-zinc-600 uppercase">
            Testimonial coming soon
          </footer>
        </div>
      </motion.blockquote>

      {/* Recognition strip — structural placeholder mirroring basement.studio's
          awards strip. No verified award history exists yet, so badge outlines
          (not fabricated award names) hold the layout's intended shape.
          TODO(content): replace with real award/recognition list, if any. */}
      <motion.div
        className="mt-8 rounded-2xl border border-dashed border-white/15 p-8 sm:p-10"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
      >
        <div className="flex flex-wrap items-center gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="grid size-14 place-items-center rounded-xl border border-dashed border-white/15 text-zinc-700"
              aria-hidden="true"
            >
              <Award className="size-6" strokeWidth={1.5} />
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs tracking-wide text-zinc-600 uppercase">
          Recognition &amp; awards coming soon
        </p>
      </motion.div>

    </section>
  );
}
