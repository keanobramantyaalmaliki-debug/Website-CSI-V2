"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from "motion/react";
import { UserRound } from "lucide-react";
import AwardsShowcase from "@/components/sections/AwardsShowcase";
import LineMask from "@/components/motion/LineMask";
import Disclosure from "@/components/motion/Disclosure";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import { NumberTicker } from "@/components/ui/number-ticker";
import PinnedServiceStack from "@/components/motion/PinnedServiceStack";
import { scrollToSection } from "@/lib/smoothScroll";

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
    desc: "Software built around your processes — not the other way around.",
    image: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=640&q=80&auto=format&fit=crop",
  },
  {
    num: "02",
    title: "Web Application Development",
    desc: "Fast, secure web apps built to scale with you.",
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=640&q=80&auto=format&fit=crop",
  },
  {
    num: "03",
    title: "Mobile App Development",
    desc: "Native and cross-platform apps for Android and iOS.",
    image: "https://images.unsplash.com/photo-1480694313141-fce5e697ee25?w=640&q=80&auto=format&fit=crop",
  },
  {
    num: "04",
    title: "Artificial Intelligence Solutions",
    desc: "AI that automates workflows and surfaces opportunities in your data.",
    image: "https://images.unsplash.com/photo-1694903110330-cc64b7e1d21d?w=640&q=80&auto=format&fit=crop",
    subs: ["Jenna.ai", "Knowledge Assistants", "Process Automation", "AI-Powered Analytics", "Custom AI Integration"],
  },
  {
    num: "05",
    title: "Enterprise Solutions",
    desc: "Platforms that connect departments and sharpen decisions org-wide.",
    image: "https://images.unsplash.com/photo-1758518729685-f88df7890776?w=640&q=80&auto=format&fit=crop",
  },
  {
    num: "06",
    title: "System Integration",
    desc: "Secure API integrations that connect your existing systems.",
    image: "https://images.unsplash.com/photo-1614508569207-3295ac89d75f?w=640&q=80&auto=format&fit=crop",
  },
  {
    num: "07",
    title: "UI/UX Design",
    desc: "User-centered interfaces people actually enjoy using.",
    image: "https://images.unsplash.com/photo-1576153192396-180ecef2a715?w=640&q=80&auto=format&fit=crop",
  },
  {
    num: "08",
    title: "Cloud & DevOps",
    desc: "Cloud infrastructure and DevOps built for reliability at scale.",
    image: "https://images.unsplash.com/photo-1690627931320-16ac56eb2588?w=640&q=80&auto=format&fit=crop",
  },
  {
    num: "09",
    title: "Maintenance & Technical Support",
    desc: "Ongoing support that keeps your systems secure and current.",
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
  const listRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 0.75", "end 0.25"],
  });
  const [activeService, setActiveService] = useState(0);
  const [manualOverride, setManualOverride] = useState<number | null>(null);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (manualOverride !== null) return;
    setActiveService(Math.min(Math.floor(v * SERVICES.length), SERVICES.length - 1));
  });

  const displayedService = manualOverride ?? activeService;
  const reduced = useReducedMotion();

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
      className="relative z-10 px-3 pt-3 pb-24 sm:pb-32"
    >
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
            Services
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
            We build the software, AI, and cloud infrastructure that turn
            scattered operations into decisions your team can act on — for
            government agencies and enterprises across Indonesia.
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

        activeService drives the sticky photo panel on the right, sourced
        from scroll progress through the list by default (so mobile, which
        has no hover, still gets the "photo follows you" effect) — hovering
        or focusing a row overrides it while the pointer/focus stays there.
      */}
      <div ref={listRef} className="mt-16 grid gap-8 lg:grid-cols-[1fr_16rem]">
        <FadeUpList tag="ul" className="flex flex-col gap-3 lg:block lg:gap-0 lg:border-t lg:border-white/[0.08]">
          {SERVICES.map((s, i) => {
            // Shared layout id lets the thumbnail (collapsed) and full photo
            // (expanded) morph into each other via Motion's layout animation
            // instead of a plain cut — same "thumbnail becomes hero" pattern
            // used for gallery-to-detail transitions. Dropped under reduced
            // motion so collapse/expand is an instant swap, not a FLIP.
            const photoLayoutId = reduced ? undefined : `office-photo-${s.num}`;
            return (
              <FadeUpItem key={s.num} tag="li">
                <Disclosure
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:border-b lg:bg-transparent lg:px-0"
                  triggerClassName="group w-full text-left"
                  contentClassName="pb-4 lg:pb-6 lg:pl-32"
                  trigger={(open) => (
                    <div
                      onMouseEnter={() => setManualOverride(i)}
                      onMouseLeave={() => setManualOverride(null)}
                      onFocus={() => setManualOverride(i)}
                      onBlur={() => setManualOverride(null)}
                      className="flex items-center gap-4 py-5 lg:grid lg:grid-cols-[7rem_1fr_1.5rem]"
                    >
                      {/* Mobile thumbnail — stands in for the desktop number
                          as the row's visual anchor; morphs into the full
                          photo below on expand. */}
                      {!open && (
                        <motion.img
                          layoutId={photoLayoutId}
                          transition={{ duration: reduced ? 0 : 0.45, ease: EASE }}
                          src={s.image}
                          alt=""
                          loading="lazy"
                          className="size-16 shrink-0 rounded-xl object-cover lg:hidden"
                        />
                      )}
                      {/* Large number — typographic anchor (desktop only) */}
                      <span
                        className="hidden text-4xl font-bold tabular-nums leading-none text-zinc-600 transition-colors duration-200 group-hover:text-accent sm:text-5xl lg:block"
                        aria-hidden="true"
                      >
                        {s.num}
                      </span>
                      {/* Title block — display:contents at lg so its children
                          slot directly into the desktop 3-col grid instead of
                          nesting an extra box. */}
                      <div className="flex flex-1 flex-col gap-0.5 lg:contents">
                        <span className="text-xs tabular-nums text-zinc-600 lg:hidden" aria-hidden="true">
                          {s.num}
                        </span>
                        <span className="font-medium text-zinc-300 transition-colors duration-200 group-hover:text-zinc-100">
                          {s.title}
                        </span>
                      </div>
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
                  <motion.img
                    layoutId={photoLayoutId}
                    transition={{ duration: reduced ? 0 : 0.45, ease: EASE }}
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
            );
          })}
        </FadeUpList>

        <PinnedServiceStack
          activeIndex={displayedService}
          panels={SERVICES.map((s) => ({ image: s.image, title: s.title }))}
        />
      </div>

      {/* Testimonial — fabricated quote so the layout reads as filled content
          during review, not a real endorsement: name/role/agency are an
          invented placeholder client, not an actual person.
          TODO(content): replace with an actual client quote + name/role/company. */}
      <motion.blockquote
        className="mt-16 flex flex-col gap-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 sm:flex-row sm:items-center sm:gap-8 sm:p-10"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
      >
        <div
          className="grid size-14 shrink-0 place-items-center rounded-full bg-zinc-800 text-zinc-500"
          aria-hidden="true"
        >
          <UserRound className="size-7" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <p className="text-lg leading-relaxed text-zinc-200">
            &ldquo;Cogniti rebuilt the systems we&rsquo;d been patching together for years —
            what used to take a week of manual work now happens in an
            afternoon.&rdquo;
          </p>
          <footer className="mt-4 text-xs tracking-wide text-zinc-500 uppercase">
            Ratna Wijaya &middot; Head of IT, Dinas Komunikasi &amp; Informatika
          </footer>
        </div>
      </motion.blockquote>

      {/* Recognition strip — dummy award entries so the layout reads as
          filled content during review; names are placeholder labels, not
          real recognitions.
          TODO(content): replace with real award/recognition list, if any. */}
      <AwardsShowcase />

      {/*
        CTA — GULIR DI TEMPAT ke <Contact /> yang sekarang berdiri di ruangan
        ini juga (roomContent.tsx, 17 Agu). Dulu ini `<Link to="/#contact">`
        karena Office satu-satunya ruangan tanpa Contact, jadi satu-satunya
        tujuan yang ada memang di Lounge. Begitu Office punya sendiri, melempar
        pengunjung ke ruangan lain jadi salah dua kali: ia kehilangan tempatnya
        tanpa meminta, dan tujuannya ada beberapa layar di bawah kakinya.

        `scrollToSection`, bukan `<a href="#contact">` — sama seperti
        DeploymentCta: anchor jump bawaan peramban berjalan di luar rAF Lenis
        dan berebut posisi dengannya di frame yang sama (lihat
        smoothScrollCallsites.invariant.test.ts, berkas ini ikut dijaga).
      */}
      <motion.div
        className="mt-16 flex flex-wrap items-center gap-4"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.25 }}
      >
        <button
          type="button"
          onClick={() => scrollToSection("contact")}
          className="group relative inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
        >
          Talk to us
          <span className="grid h-5 w-5 place-items-center rounded-full bg-zinc-900/10 text-zinc-900 transition-transform duration-200 group-hover:translate-x-0.5">
            →
          </span>
        </button>
      </motion.div>
    </section>
  );
}
