"use client";

import TrustedByGrid, { type Brand } from "@/components/motion/TrustedByGrid";

// PLACEHOLDER — ganti dengan logo klien asli setelah izin publikasi didapat
// (lihat diskusi/section-1). Nama di bawah adalah wordmark generik, bukan klien nyata.
const PLACEHOLDER_BRANDS: Brand[] = [
  { name: "Client A" },
  { name: "Client B" },
  { name: "Client C" },
  { name: "Client D" },
  { name: "Client E" },
  { name: "Client F" },
  { name: "Client G" },
  { name: "Client H" },
];

export default function TrustedBy() {
  return (
    <section id="trusted-by" className="relative z-10 border-y border-white/[0.08] bg-white/[0.02]">
      <div className="px-6 py-24 sm:px-10 sm:py-32">
        <TrustedByGrid brands={PLACEHOLDER_BRANDS} />
      </div>
    </section>
  );
}
