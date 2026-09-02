"use client";

import { useMemo } from "react";
import { motion } from "motion/react";

import { vision } from "@/data/vision";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Vision() {
  /**
   * Dipanggil DI DALAM komponen, bukan di ruang modul.
   *
   * Kalimatnya dulu `const HEADTEXT = "…"` di sini. Menggantinya jadi
   * `const HEADTEXT = vision().statement` di tempat yang sama akan tetap
   * "jalan" dan tetap salah: nilainya dihitung saat modul ini diimpor —
   * sebelum `loadContent()` di `main.tsx` selesai — jadi isi CMS-nya tidak
   * akan pernah kelihatan, tanpa satu pun error. Jebakan yang sama sudah
   * memakan empat slice sebelumnya.
   *
   * `useMemo` tanpa dependensi cukup: `content.json` tidak berubah lagi
   * sesudah dimuat sekali, dan yang dihindari cuma pemanggilan ulang tiap
   * render.
   */
  const { statement, photo } = useMemo(() => vision(), []);

  return (
    <section
      id="vision"
      /* Mobile: pt-20 = 80px dari ujung plank Industries (satu-satunya
         pasangan yang angkanya di pt — Industries tak punya pb) dan pb-20 =
         80px ke Contact yang pt-0 (aturan 28 Agu, lihat PeopleIntro.tsx);
         ≥sm kembali py-32. */
      className="section-shell relative overflow-hidden px-3 pt-20 pb-20 sm:py-32"
    >
      <div className="relative z-10">
        <p className="max-w-[1600px] text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
          {statement}
        </p>

        <motion.div
          /* max-w-full + sm:max-h-[900px] = jepitan zoom-out (26 Agu): 90vw/90vh
             ikut viewport CSS yang membengkak saat zoom-out, jadi fotonya dulu
             terus menggembung melewati kolom konten. Di 1440×900 zoom 100%
             (90vw=1296, 90vh=810) kedua jepitan tidak tersentuh — nol perubahan. */
          className="mt-8 aspect-[16/9] w-[90vw] max-w-full overflow-hidden sm:mt-16 sm:aspect-auto sm:h-[90vh] sm:max-h-[900px]"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <img
            src={photo}
            alt="CSI office"
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </motion.div>
      </div>
    </section>
  );
}
