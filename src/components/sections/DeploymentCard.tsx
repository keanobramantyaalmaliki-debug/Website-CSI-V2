"use client";

import { useReducedMotion } from "motion/react";
import { FadeUpItem } from "@/components/motion/FadeUp";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import DeploymentRevealImage from "@/components/sections/DeploymentRevealImage";

export type DeploymentData = {
  num: string;
  sector: string;
  region: string;
  desc: string;
};

const SECTOR_IMAGE: Record<string, string> = {
  "Public Services":
    "https://images.unsplash.com/photo-1756227584303-f1400daaa69d?w=900&q=80&auto=format&fit=crop",
  Infrastructure:
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&q=80&auto=format&fit=crop",
  Logistics:
    "https://images.unsplash.com/photo-1645736315000-6f788915923b?w=900&q=80&auto=format&fit=crop",
  Hospitality:
    "https://images.unsplash.com/photo-1758193783649-13371d7fb8dd?w=900&q=80&auto=format&fit=crop",
  Communities:
    "https://images.unsplash.com/photo-1691724414154-8b1551e7b292?w=900&q=80&auto=format&fit=crop",
};

const DEFAULT_IMAGE = SECTOR_IMAGE["Public Services"];

export default function DeploymentCard({ d }: { d: DeploymentData }) {
  const reduced = !!useReducedMotion();
  const coarse = useCoarsePointer();
  const image = SECTOR_IMAGE[d.sector] ?? DEFAULT_IMAGE;

  return (
    <FadeUpItem
      tag="article"
      className="group relative flex aspect-[4/3] w-full max-h-[22rem] min-h-[18rem] flex-col justify-end overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] transition-colors duration-500 hover:border-white/[0.16]"
    >
      {/* 1. Foto — selalu ter-mount, diredam saat diam.
          Desktop (penunjuk presisi) memakai hover CSS. Layar sentuh tidak punya
          hover, jadi reveal-nya diikat ke scroll — lihat DeploymentRevealImage. */}
      {coarse ? (
        <DeploymentRevealImage src={image} reduced={reduced} />
      ) : (
        <img
          src={image}
          alt=""
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-cover opacity-40 grayscale transition-[filter,opacity,transform] duration-500 group-hover:opacity-100 group-hover:grayscale-0 ${reduced ? "" : "group-hover:scale-[1.03]"}`}
        />
      )}

      {/* 2. Wash rata — menjaga baris meta di pita atas tetap terbaca di atas foto apa pun */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/45 transition-colors duration-500 group-hover:bg-black/55"
      />

      {/* 3. Scrim gradien — idiom sama dengan CaseStudySpotlight.tsx */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent"
      />

      {/* 4. Blok teks — relative supaya di atas ketiga layer absolute di atas */}
      <div className="relative flex flex-col gap-1.5 p-5">
        <p className="font-mono text-[11px] tracking-widest text-zinc-300 sm:text-xs">
          {d.num} · {d.region}
        </p>
        <h3 className="text-base font-medium text-zinc-100">{d.sector}</h3>
        {/* 65ch: plafon dalam ala basement (27 Agu) — deskripsi tidak ikut
            sel grid melebar saat zoom-out; di ≤1500px viewport tak berefek. */}
        <p className="max-w-[65ch] text-sm leading-relaxed text-zinc-300">{d.desc}</p>
      </div>
    </FadeUpItem>
  );
}
