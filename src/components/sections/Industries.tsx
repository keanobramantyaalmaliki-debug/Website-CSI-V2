"use client";

import { useMemo } from "react";

import IndustriesStack from "@/components/canvas/IndustriesStack";
import { industries } from "@/data/industries";
import { sectionText } from "@/data/sectionTexts";

/**
 * Sejak 23 Agu galeri kolom expanding diganti tumpukan plank 3D
 * (IndustriesStack, porting pmndrs `raycast-cycling`): strip putih
 * full-bleed tanpa radius, hover/tap menyorot plank, klik = mode fokus.
 *
 * Revisi 23 Agu (malam): section = STRIP-NYA SAJA — heading + subtext hidup
 * sebagai overlay di dalam strip (lihat IndustriesStack.tsx); heading yang
 * terbaca mesin tetap di sini sebagai sr-only karena wrapper strip
 * aria-hidden.
 *
 * Gerbang perangkat DIHAPUS 23 Agu (malam, sesi mobile): dulu perangkat
 * sentuh jatuh ke carousel IndustriesMobile karena wheel-cycling butuh
 * hover + wheel — tapi wheel-cycling sudah dicabut dan interaksinya kini
 * cuma tap/klik, jadi stack yang sama tampil di SEMUA perangkat. Adaptasi
 * sentuh + layar potret (framing kamera, layout fokus, hint) hidup di dalam
 * IndustriesStack; IndustriesMobile pensiun.
 *
 * Isinya pindah ke CMS 2 Sep: `INDUSTRIES` yang dulu literal jadi `industries()`.
 */
export default function Industries() {
  /* `useMemo` berdaftar-kebergantungan KOSONG, dan pemanggilannya HARUS di
     dalam komponen — bukan di ruang modul. Jebakan yang sama sudah menggigit
     dua slice CMS sebelumnya: `industries()` yang dievaluasi saat modul dimuat
     membeku sebelum `loadContent()` selesai, jadi halaman menampilkan daftar
     cadangan tanpa satu pun galat yang memberitahu. */
  const daftar = useMemo(() => industries(), []);
  /* Judulnya `sr-only`, jadi baris ganda tidak berarti apa-apa di sini dan
     validator sudah menguncinya ke satu baris. Yang dipakai teks utuhnya. */
  const judul = useMemo(() => sectionText("industries").heading, []);

  /* Daftar boleh kosong — editor berhak mendraftkan semuanya. Tanpa gerbang
     ini yang tayang adalah strip putih setinggi layar berisi tumpukan nol
     plank, lengkap dengan heading yang menjanjikan sesuatu. */
  if (daftar.length === 0) return null;

  return (
    /* `section-shell` menyusul 26 Agu (QC zoom-out, ronde 3): jepitan tinggi
       + kamera mundur di IndustriesStack ternyata belum cukup — kanvas
       putihnya sendiri masih membentang tepi-ke-tepi, jadi saat browser
       di-zoom-out section ini tetap terbaca "tidak ikut mengecil" padahal
       panel ServicesTicker (yang lebarnya ter-cap shell) sudah benar. Di
       viewport ≤1920px shell tidak mengubah apa pun: strip tetap full-bleed
       tanpa radius, nyatu dengan kartu Process di atasnya. */
    <section id="industries" className="section-shell relative z-10 overflow-x-clip">
      <h2 className="sr-only">{judul}</h2>
      <IndustriesStack industries={daftar} />
      {/* Plank di canvas bukan DOM (strip-nya aria-hidden) — daftar sektor
          yang terbaca mesin & AT hidup di sini, pola sr-only yang sama
          dengan daftar layanan di Office.tsx. */}
      <ul className="sr-only">
        {daftar.map((s) => (
          <li key={s.name}>
            {s.name}: {s.desc}
            {s.tier === "core" ? " (Core Focus)" : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}
