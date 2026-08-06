"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { Fragment, useRef, type ReactNode } from "react";
import { useLineSplit } from "@/lib/hooks/useLineSplit";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const DURATION = 0.8;

/**
 * Jeda antar baris. Cukup untuk terbaca berurutan, belum terasa sebagai antrean.
 *
 * Diekspor untuk satu keperluan: heading yang patahannya memang dirancang, jadi
 * ditulis sebagai dua LineMask bersaudara. Yang kedua memakai angka ini sebagai
 * `delay` supaya iramanya sama dengan heading yang patah sendiri.
 */
export const LINE_STAGGER = 0.12;

/**
 * Ruang bening di bawah tiap topeng, untuk ekor huruf (g, j, p, q, y).
 *
 * Heading di sistem ini memakai `sm:text-5xl` yang line-height-nya 1.0 — kotak
 * barisnya lebih pendek dari tinggi glyph-nya, jadi ekor huruf menjuntai keluar.
 * Selama satu heading = satu topeng, itu tak kelihatan: ekor baris atas jatuh ke
 * kotak baris berikutnya yang masih di dalam topeng yang sama. Begitu tiap baris
 * punya topengnya sendiri, tiap ekor bertemu tepi potong.
 *
 * Ditebus dengan margin negatif sebesar ini pada topengnya, jadi tinggi yang
 * disumbangkan ke layout tidak berubah sedikit pun.
 */
const DESCENDER_ROOM = "0.24em";

/**
 * T1 — clip-mask heading reveal, per baris hasil layout.
 *
 * Anak berupa string diukur dulu (lihat useLineSplit): patahan barisnya diambil
 * dari hasil layout browser, bukan ditebak dari tanda baca atau ditulis tangan
 * sebagai dua LineMask bertumpuk. Heading yang sama tetap benar di lebar mana
 * pun, dan tidak ada `delay` yang perlu disetel manual per baris.
 *
 * Anak selain string tidak dipecah — hanya string yang bisa dibelah per kata
 * tanpa membongkar elemen di dalamnya.
 */
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

  // Di bawah reduced-motion tidak ada stagger yang perlu dihitung, jadi
  // pengukurannya dilewati sepenuhnya — tanpa observer, tanpa memecah DOM.
  const text = reduced || typeof children !== "string" ? null : children;
  const lines = useLineSplit(ref, text, inView);

  // Pembungkusnya `flow-root`, bukan `block`: BFC menahan margin negatif topeng
  // TERAKHIR supaya tidak menyatu ke luar (margin collapsing) dan diam-diam
  // memangkas jarak heading ke isi di bawahnya. Versi lama tidak kena karena
  // pembungkusnya sendiri yang `overflow-hidden` — dan itu sudah membuat BFC.
  const line = (index: number, content: ReactNode) => (
    <span
      key={index}
      className="block overflow-hidden"
      style={{ marginBottom: `-${DESCENDER_ROOM}` }}
    >
      <motion.span
        className="block"
        // Padding-nya di sini, bukan di topeng: tinggi topeng ikut anaknya, jadi
        // `y: 110%` tetap menyembunyikan barisnya sepenuhnya.
        style={{ paddingBottom: DESCENDER_ROOM }}
        initial={{ y: reduced ? 0 : "110%" }}
        animate={inView ? { y: 0 } : undefined}
        transition={{
          duration: DURATION,
          ease: EASE,
          delay: delay + index * LINE_STAGGER,
        }}
      >
        {content}
      </motion.span>
    </span>
  );

  // Tidak dipecah: reduced-motion, atau anaknya bukan string.
  if (text === null) {
    return (
      <span ref={ref} className="flow-root">
        {line(0, children)}
      </span>
    );
  }

  // Sudah terukur: satu topeng per baris.
  if (lines !== null) {
    return (
      <span ref={ref} className="flow-root">
        {lines.map((content, index) =>
          // Spasi penutup menjaga textContent tetap utuh untuk pembaca layar dan
          // alat baca teks; di ujung baris ia diciutkan, jadi tak terlihat.
          line(index, index < lines.length - 1 ? `${content} ` : content),
        )}
      </span>
    );
  }

  // Pass pengukuran. Berjalan sebelum lukisan pertama, dan bentuknya sama persis
  // dengan hasil satu baris — kalau pengukurannya tidak pernah jalan (mis. ref
  // belum terpasang), yang tampil adalah perilaku T1 sebelumnya, bukan halaman
  // rusak.
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <span ref={ref} className="flow-root">
      {line(
        0,
        words.map((word, index) => (
          <Fragment key={index}>
            {index > 0 ? " " : null}
            <span data-line-word="">{word}</span>
          </Fragment>
        )),
      )}
    </span>
  );
}
