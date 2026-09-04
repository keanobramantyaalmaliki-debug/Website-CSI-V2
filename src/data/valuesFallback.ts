/**
 * Isi "What We Stand For" yang IKUT TER-BUNDLE — jaring pengaman kalau
 * `content.json` tidak ada, rusak, atau lambat.
 *
 * Literal murni, tanpa satu pun impor, dengan alasan yang sama seperti
 * `crewFallback.ts` dan `jobsFallback.ts`: dua pembaca yang sangat berbeda
 * bergantung pada sifat itu —
 *
 * 1. `src/data/people.ts` memakainya sebagai cadangan di peramban.
 * 2. `server/db/seed.ts` membacanya dari Node untuk mengisi database pertama
 *    kali. Satu impor ke store situs sudah cukup menyeret `fetch` dan tipe DOM
 *    ke dalam skrip seed.
 *
 * Isinya SALINAN APA ADANYA dari yang tayang sebelum ada CMS. Sesudah seed
 * berjalan, yang berlaku adalah isi database; berkas ini berhenti jadi sumber
 * kebenaran dan tinggal jadi cadangan.
 */

export type ValueContent = {
  /** Judul besar di kolom kiri panel. */
  title: string;
  /** Baris kecil huruf besar di bawah judul. */
  tagline: string;
  description: string;
  /** Kosong = bingkai "PHOTO" yang tampil. Di CMS foto WAJIB untuk nilai yang
   *  `live`; yang boleh kosong cuma draft, dan draft tidak pernah sampai ke
   *  sini. */
  photo?: string;
};

export const FALLBACK_VALUES: ValueContent[] = [
  {
    title: "Craft First",
    tagline: "Precision over speed",
    description:
      "We believe the details are the work. Every margin, transition, and copy decision is deliberate, because what looks effortless took effort to get right.",
    photo: "/people/craft-first.webp",
  },
  {
    title: "Partnership",
    tagline: "Embedded, not adjacent",
    description:
      "We work as part of your team, not apart from it. That means shared context, honest feedback, and outcomes we're both responsible for.",
    photo: "/people/partnership.webp",
  },
  {
    title: "Long-Term Thinking",
    tagline: "Built to outlast the brief",
    description:
      "We design systems, not artifacts. The work we ship should still make sense two years from now, even after the team changes.",
    photo: "/people/long-term-thinking.webp",
  },
];
