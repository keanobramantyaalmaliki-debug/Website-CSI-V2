"use client";

import TrustedByGrid from "@/components/motion/TrustedByGrid";
import { PARTNER_BRANDS } from "@/data/brands";

export default function TrustedBy() {
  return (
    <section id="trusted-by" className="relative z-10 border-y border-white/[0.08] bg-white/[0.02]">
      <div className="px-6 py-24 sm:px-10 sm:py-32">
        <TrustedByGrid brands={PARTNER_BRANDS} />
      </div>
    </section>
  );
}
