"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSceneStore } from "@/lib/store/sceneStore";
import { useScrollSpy } from "@/lib/hooks/useScrollSpy";

/**
 * Site navigation only. 3D room switching lives in the hero (RoomNav) as a tour
 * control — keeping the two models separate removes the old "Office dropdown"
 * that mixed room jumps with page anchors.
 */
const PAGE_LINKS = [
  { href: "#office",       label: "Office" },
  { href: "#deployments",  label: "Deployments" },
  { href: "#services",     label: "Services" },
  { href: "#industries",   label: "Industries" },
  { href: "#careers",      label: "Careers" },
  { href: "#vision",       label: "Vision" },
];

const SECTION_IDS = PAGE_LINKS.map((l) => l.href.slice(1));
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Navbar() {
  const heroInView    = useSceneStore((s) => s.heroInView);
  const activeSection = useSceneStore((s) => s.activeSection);
  const reduced       = useReducedMotion();
  const [open, setOpen] = useState(false);

  useScrollSpy(SECTION_IDS);

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        className={[
          "flex w-full max-w-5xl items-center justify-between gap-6 rounded-full px-5 py-2.5 transition-all duration-300 sm:px-6",
          heroInView && !open ? "bg-transparent" : "glass border border-white/10",
        ].join(" ")}
      >
        {/* Logo */}
        <a href="#office" className="shrink-0" aria-label="Cogniti — home">
          <img
            src="/brand/Logo-Final.png"
            alt="CSI Logo"
            width={76}
            height={30}
            className="object-contain"
            fetchPriority="high"
          />
        </a>

        {/* Desktop page links */}
        <ul className="hidden items-center gap-6 md:flex">
          {PAGE_LINKS.slice(1).map((l) => {
            const active = activeSection === l.href.slice(1);
            return (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={active ? "true" : undefined}
                  className={[
                    "text-sm transition-colors hover:text-accent",
                    active ? "text-accent" : "text-zinc-300",
                  ].join(" ")}
                >
                  {l.label}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          {/* CTA — nested pill with trailing arrow */}
          <a
            href="#contact"
            className="group hidden shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 sm:flex"
          >
            Talk to us
            <span className="grid h-5 w-5 place-items-center rounded-full bg-zinc-900/10 text-zinc-900 transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </a>

          {/* Mobile hamburger — morphs to X */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative grid h-9 w-9 place-items-center rounded-full border border-white/10 md:hidden"
          >
            <span
              className={`absolute h-px w-4 bg-zinc-100 transition-all duration-300 ${open ? "rotate-45" : "-translate-y-1"}`}
            />
            <span
              className={`absolute h-px w-4 bg-zinc-100 transition-all duration-300 ${open ? "-rotate-45" : "translate-y-1"}`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile menu panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="glass absolute top-full mt-2 w-[calc(100%-2rem)] max-w-5xl rounded-2xl border border-white/10 p-2 md:hidden"
          >
            <ul className="flex flex-col">
              {PAGE_LINKS.map((l) => {
                const active = activeSection === l.href.slice(1);
                return (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "true" : undefined}
                      className={[
                        "block rounded-xl px-4 py-3 text-sm transition-colors hover:bg-white/5",
                        active ? "text-accent" : "text-zinc-200",
                      ].join(" ")}
                    >
                      {l.label}
                    </a>
                  </li>
                );
              })}
              <li className="p-2">
                <a
                  href="#contact"
                  onClick={() => setOpen(false)}
                  className="block rounded-full bg-white px-4 py-3 text-center text-sm font-medium text-zinc-900"
                >
                  Talk to us
                </a>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
