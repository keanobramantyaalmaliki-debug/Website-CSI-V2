"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
} from "motion/react";

/**
 * Foto kartu deployment untuk perangkat SENTUH — reveal redup→terang diikat ke
 * scroll, bukan hover.
 *
 * Di desktop, `DeploymentCard` memakai `group-hover:` biasa. Tapi layar sentuh
 * tidak punya keadaan hover (lihat useCoarsePointer.ts), jadi foto akan terkunci
 * redup selamanya. Komponen ini hanya di-mount saat `useCoarsePointer()` true —
 * begitu semua hook `useScroll` di bawah tidak pernah berjalan di desktop, jadi
 * jalur mouse tetap murni CSS tanpa listener tambahan.
 *
 * Kecerahan mengikuti posisi kartu di viewport: foto tampil PENUH (opacity 1,
 * setara `group-hover:opacity-100` di jalur mouse — disamakan 24 Agu) saat
 * kartu berada di tengah layar, meredup lagi ke 0.4 di tepi — meniru "hidup"-nya hover yang kontinu.
 * Di bawah prefers-reduced-motion, crossfade opacity/grayscale tetap (sama
 * seperti hover desktop yang juga tetap beranimasi), hanya zoom yang dimatikan.
 */
export default function DeploymentRevealImage({
  src,
  reduced,
}: {
  src: string;
  reduced: boolean;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    // 0 = tepi atas kartu menyentuh dasar layar (baru masuk dari bawah),
    // 1 = tepi bawah kartu menyentuh puncak layar (baru keluar ke atas).
    offset: ["start end", "end start"],
  });

  // Segitiga: redup di kedua tepi (0), memuncak ke 1 saat kartu di tengah.
  const reveal = useTransform(scrollYProgress, [0.15, 0.5, 0.85], [0, 1, 0]);
  const opacity = useTransform(reveal, [0, 1], [0.4, 1]);
  const grayscale = useTransform(reveal, [0, 1], [1, 0]);
  const filter = useMotionTemplate`grayscale(${grayscale})`;
  const scale = useTransform(reveal, [0, 1], [1, reduced ? 1 : 1.03]);

  return (
    <motion.img
      ref={ref}
      src={src}
      alt=""
      loading="lazy"
      style={{ opacity, filter, scale }}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
