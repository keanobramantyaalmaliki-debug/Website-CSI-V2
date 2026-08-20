"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from "motion/react";
import AwardsShowcase from "@/components/sections/AwardsShowcase";
import TestimonialSpotlight from "@/components/sections/TestimonialSpotlight";
import LineMask from "@/components/motion/LineMask";
import Disclosure from "@/components/motion/Disclosure";
import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import PinnedServiceStack from "@/components/motion/PinnedServiceStack";

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
      <div>
        {/* T1 — line-mask heading. Ukuran font & lebar maksimum MENYAMAI h2
            CsiHero di Home (text-4xl sm:text-6xl lg:text-7xl, max-w-5xl) —
            keduanya heading pembuka ruangan yang menempel ke hero 3D, jadi
            skalanya harus terbaca setara (20 Agu). Eyebrow "Services" dicabut
            bersamaan: navbar sudah menyebut nama halamannya. */}
        <h2 className="max-w-5xl text-4xl font-semibold tracking-tight text-zinc-100 sm:text-6xl lg:text-7xl">
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

      {/* Testimonial — redesain 20 Agu: kartu blockquote lama diganti
          spotlight gaya basement.studio (quote raksasa di tengah + hairline
          per baris + panah prev/next). Isi masih placeholder fiktif —
          lihat TODO(content) di TestimonialSpotlight.tsx. */}
      <TestimonialSpotlight />

      {/* Recognition strip — dummy award entries so the layout reads as
          filled content during review; names are placeholder labels, not
          real recognitions.
          TODO(content): replace with real award/recognition list, if any. */}
      <AwardsShowcase />

    </section>
  );
}
