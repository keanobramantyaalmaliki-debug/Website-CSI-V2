"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** T1 — clip-mask heading reveal. Wrap text inside a heading/p element. */
export default function LineMask({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });
  const reduced = useReducedMotion();

  return (
    /* pb + -mb sepasang: pb memberi ruang descender ("g", "y") yang keluar
       dari line box saat line-height ketat (text-7xl = leading 1) supaya tak
       terpangkas overflow-hidden; -mb seukuran menariknya kembali sehingga
       tinggi layout tidak berubah. Posisi awal y:110% tetap tersembunyi:
       jendela mask cuma bertambah 0.15em, offset-nya 110% tinggi teks. */
    <span ref={ref} className="-mb-[0.15em] block overflow-hidden pb-[0.15em]">
      <motion.span
        className="block"
        initial={{ y: reduced ? 0 : "110%" }}
        animate={inView ? { y: 0 } : undefined}
        transition={{ duration: 0.8, ease: EASE, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}
