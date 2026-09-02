/**
 * Daftar layanan yang IKUT TER-BUNDLE — jaring pengaman kalau `content.json`
 * tidak ada, rusak, atau lambat.
 *
 * Literal murni, tanpa satu pun impor, dengan alasan yang sama seperti
 * `valuesFallback.ts`, `crewFallback.ts`, dan `workProjectsFallback.ts`: dua
 * pembaca yang sangat berbeda bergantung pada sifat itu —
 *
 * 1. `src/data/services.ts` memakainya sebagai cadangan di peramban.
 * 2. `server/db/seed.ts` membacanya dari Node untuk mengisi database pertama
 *    kali. Satu impor ke store situs sudah cukup menyeret `fetch` dan tipe DOM
 *    ke dalam skrip seed.
 *
 * Isinya SALINAN APA ADANYA dari literal `SERVICES` yang dulu tinggal di
 * `Office.tsx`, dengan satu hal yang ditinggalkan: nomor "01"–"09". Nomor itu
 * tidak pernah dicetak ke layar (cuma jadi `key` React), dan sekarang
 * urutannya yang berlaku — lihat catatan di `shared/service.ts`.
 */

export type ServiceContent = {
  /** Judul besar yang lewat di sabuk — sekaligus `key` React, jadi harus
   *  unik. */
  title: string;
  /** Satu kalimat penjelas, khusus daftar `sr-only`. */
  desc: string;
  /** Rincian yang ikut ke baris `sr-only` yang sama. Boleh kosong. */
  subs: string[];
};

export const FALLBACK_SERVICES: ServiceContent[] = [
  {
    title: "Custom Software Development",
    desc: "Software built around your processes, not the other way around.",
    subs: [],
  },
  {
    title: "Web Application Development",
    desc: "Fast, secure web apps built to scale with you.",
    subs: [],
  },
  {
    title: "Mobile App Development",
    desc: "Native and cross-platform apps for Android and iOS.",
    subs: [],
  },
  {
    title: "Artificial Intelligence Solutions",
    desc: "AI that automates workflows and surfaces opportunities in your data.",
    subs: [
      "Jenna.ai",
      "Knowledge Assistants",
      "Process Automation",
      "AI-Powered Analytics",
      "Custom AI Integration",
    ],
  },
  {
    title: "Enterprise Solutions",
    desc: "Platforms that connect departments and sharpen decisions org-wide.",
    subs: [],
  },
  {
    title: "System Integration",
    desc: "Secure API integrations that connect your existing systems.",
    subs: [],
  },
  {
    title: "UI/UX Design",
    desc: "User-centered interfaces people actually enjoy using.",
    subs: [],
  },
  {
    title: "Cloud & DevOps",
    desc: "Cloud infrastructure and DevOps built for reliability at scale.",
    subs: [],
  },
  {
    title: "Maintenance & Technical Support",
    desc: "Ongoing support that keeps your systems secure and current.",
    subs: [],
  },
];
