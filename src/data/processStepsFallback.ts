/**
 * Keenam langkah "Cara kerja" yang IKUT TER-BUNDLE — jaring pengaman kalau
 * `content.json` tidak ada, rusak, atau lambat.
 *
 * Literal murni, tanpa satu pun impor, dengan alasan yang sama seperti
 * `industriesFallback.ts` dan kawan-kawannya: dua pembaca yang sangat berbeda
 * bergantung pada sifat itu —
 *
 * 1. `src/data/processSteps.ts` memakainya sebagai cadangan di peramban.
 * 2. `server/db/seed.ts` membacanya dari Node untuk mengisi database pertama
 *    kali. Satu impor ke store situs sudah cukup menyeret `fetch` dan tipe DOM
 *    ke dalam skrip seed.
 *
 * Isinya SALINAN APA ADANYA dari literal `STEPS` yang dulu tinggal di
 * `Process.tsx`, dengan satu hal yang ditinggalkan dan satu hal yang
 * ditambahkan:
 *
 * - **nomor "01"–"06"** ditinggalkan — sekarang diturunkan dari posisi baris,
 *   supaya tidak ada dua sumber kebenaran yang bisa melenceng saat editor
 *   memindahkan satu langkah. Lihat `shared/processStep.ts`.
 * - **`glyph`** ditambahkan — dulu ilustrasinya dipasangkan menurut POSISI
 *   (`PROCESS_GLYPHS[i]`), sekarang disebut namanya. Nilai di bawah dipilih
 *   supaya pasangannya PERSIS sama dengan yang tayang sebelum CMS.
 */

export type ProcessGlyphKey =
  | "discovery"
  | "strategy"
  | "design"
  | "development"
  | "testing"
  | "deployment";

export type ProcessStepContent = {
  /** Judul langkah, `h3` di badan kartu. */
  title: string;
  /** Satu kata di atas judul; yang mengapitalkan CSS, bukan data. */
  kicker: string;
  /** Satu–dua kalimat penjelas di bawah judul. */
  desc: string;
  /** Ilustrasi garis beranimasi di kepala kartu — salah satu dari enam yang
   *  digambar di `src/components/motion/ProcessGlyphs.tsx`. */
  glyph: ProcessGlyphKey;
};

export const FALLBACK_PROCESS_STEPS: ProcessStepContent[] = [
  {
    title: "Discovery",
    kicker: "UNDERSTAND",
    desc: "We map your current workflows, pain points, and goals before writing a line of code.",
    glyph: "discovery",
  },
  {
    title: "Strategy & Planning",
    kicker: "PLAN",
    desc: "Scope, architecture, and timeline locked in, so the build has a clear target.",
    glyph: "strategy",
  },
  {
    title: "Design",
    kicker: "SHAPE",
    desc: "Interfaces and flows prototyped and tested with real users before development starts.",
    glyph: "design",
  },
  {
    title: "Development",
    kicker: "BUILD",
    desc: "Engineers build in short, reviewable cycles. Nothing lands without a second pair of eyes.",
    glyph: "development",
  },
  {
    title: "Testing & QA",
    kicker: "VERIFY",
    desc: "Automated and manual checks against real-world edge cases, not just the happy path.",
    glyph: "testing",
  },
  {
    title: "Deployment & Support",
    kicker: "LAUNCH",
    desc: "Shipped with monitoring in place, and a team that stays on for what comes after launch.",
    glyph: "deployment",
  },
];
