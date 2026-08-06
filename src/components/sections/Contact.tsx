"use client";

import { useRef } from "react";
import LineMask from "@/components/gsap/LineMask";
import MagneticButton from "@/components/gsap/MagneticButton";
import { gsap, useGSAP, CSI_EASE } from "@/lib/gsap/register";

// TODO(content): update to cogniti social handles — issue pending
const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com/baliinteraktifperkasa" },
  { label: "LinkedIn", href: "https://linkedin.com/company/bali-interaktif-perkasa" },
];

export default function Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(eyebrowRef.current, {
        opacity: 0,
        x: -8,
        duration: 0.5,
        ease: CSI_EASE,
        scrollTrigger: { trigger: eyebrowRef.current, start: "top bottom", once: true },
      });
      gsap.from(paragraphRef.current, {
        opacity: 0,
        y: 8,
        duration: 0.5,
        ease: CSI_EASE,
        delay: 0.15,
        scrollTrigger: { trigger: paragraphRef.current, start: "top bottom", once: true },
      });
      gsap.from(ctaRef.current, {
        opacity: 0,
        y: 8,
        duration: 0.5,
        ease: CSI_EASE,
        delay: 0.25,
        scrollTrigger: { trigger: ctaRef.current, start: "top bottom", once: true },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} id="contact" className="px-6 py-24 sm:px-10 sm:py-32">
      {/* T6 — eyebrow */}
      <p
        ref={eyebrowRef}
        className="text-xs tracking-widest text-zinc-400 uppercase"
      >
        Contact
      </p>

      {/* T1 — line-mask heading */}
      <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-5xl">
        <LineMask>Let&apos;s Start A Conversation.</LineMask>
      </h2>

      <p
        ref={paragraphRef}
        className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-300 sm:text-base"
      >
        We typically respond within one business day.
      </p>

      {/* T7 — CTA links with hover underline wipe */}
      <div
        ref={ctaRef}
        className="mt-10 flex flex-wrap items-center gap-4"
      >
        <MagneticButton>
          <a
            href="mailto:hello@cogniti.id"
            className="group relative rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
          >
            hello@cogniti.id
          </a>
        </MagneticButton>
        <a
          href="#office"
          className="relative rounded-full border border-white/15 px-6 py-3 text-sm text-zinc-200 transition-colors hover:border-white/30 after:absolute after:bottom-3 after:left-6 after:h-px after:w-0 after:bg-zinc-200 after:transition-[width] after:duration-300 after:content-[''] hover:after:w-[calc(100%-3rem)]"
        >
          ↑ Back to the office
        </a>
      </div>

      <footer className="mt-24 border-t border-white/[0.08] pt-6 text-xs text-zinc-400">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>
            © {new Date().getFullYear()} Cognitiva Solusi Indonesia. All rights reserved.
          </span>
          <div className="flex gap-4">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-zinc-400"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <span>Jl. Kediri No.27, Tuban, Badung, Bali 80361</span>
          <span>Intelligence Infrastructure</span>
        </div>
      </footer>
    </section>
  );
}
