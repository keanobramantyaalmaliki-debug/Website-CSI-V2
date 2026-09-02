"use client";

import { useReducedMotion } from "motion/react";
import { FadeUpItem } from "@/components/motion/FadeUp";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import DeploymentRevealImage from "@/components/sections/DeploymentRevealImage";

export type DeploymentData = {
  /** "01"–"05". DITURUNKAN dari posisi kartu oleh `Deployments.tsx`, bukan
   *  disimpan di CMS — lihat `shared/deployment.ts`. */
  num: string;
  sector: string;
  region: string;
  desc: string;
  /**
   * Foto latar kartu, DIOPER PER KARTU.
   *
   * Dulu di sini ada peta `SECTOR_IMAGE` berkunci nama sektor plus
   * `DEFAULT_IMAGE`. Peta itu dicabut saat deployment masuk CMS, dan bukan
   * cuma karena datanya pindah: begitu nama sektor bisa diketik editor,
   * mengganti "Hospitality" jadi "Hotels & Resorts" akan menjatuhkan kartunya
   * diam-diam ke foto Public Services — tanpa satu pun error. Kunci berupa
   * teks bebas yang diketik orang lain memang tidak bisa dipakai begitu.
   *
   * Boleh kosong: `<img>`-nya lalu tidak dirender sama sekali (bukan
   * `src=""`, yang di beberapa peramban justru meminta ulang halamannya
   * sendiri). Kartu yang TAYANG wajib punya foto — dijaga
   * `validateDeployment.ts` — jadi kosong praktis cuma terjadi kalau isi
   * cadangan bundle suatu hari dipangkas.
   */
  image: string;
};

export default function DeploymentCard({ d }: { d: DeploymentData }) {
  const reduced = !!useReducedMotion();
  const coarse = useCoarsePointer();

  return (
    <FadeUpItem
      tag="article"
      className="group relative flex aspect-[4/3] w-full max-h-[22rem] min-h-[18rem] flex-col justify-end overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] transition-colors duration-500 hover:border-white/[0.16]"
    >
      {/* 1. Foto — selalu ter-mount, diredam saat diam.
          Desktop (penunjuk presisi) memakai hover CSS. Layar sentuh tidak punya
          hover, jadi reveal-nya diikat ke scroll — lihat DeploymentRevealImage. */}
      {!d.image ? null : coarse ? (
        <DeploymentRevealImage src={d.image} reduced={reduced} />
      ) : (
        <img
          src={d.image}
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
