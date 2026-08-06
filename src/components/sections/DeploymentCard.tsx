"use client";

import FlipCard from "@/components/motion/FlipCard";

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
  const image = SECTOR_IMAGE[d.sector] ?? DEFAULT_IMAGE;

  return (
    <div data-deployment-card="">
      <FlipCard
        ariaLabel={`${d.sector} — detail`}
        className="h-56 w-full sm:h-64"
        front={
          <div className="flex h-full flex-col justify-between p-5">
            <span className="font-mono text-xs tabular-nums text-zinc-500">{d.num}</span>
            <div className="flex items-center gap-3">
              <h3 className="flex-1 text-base font-medium text-zinc-100">{d.sector}</h3>
              <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-zinc-300">
                {d.region}
              </span>
            </div>
          </div>
        }
        back={
          <div className="relative h-full w-full">
            <img
              src={image}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/30 to-transparent p-5">
              <h3 className="font-medium text-zinc-50">{d.sector}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">{d.desc}</p>
            </div>
          </div>
        }
      />
    </div>
  );
}
