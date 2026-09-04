/**
 * Judul & subteks tiap seksi yang IKUT TER-BUNDLE — jaring pengaman kalau
 * `content.json` tidak ada, rusak, atau lambat.
 *
 * Literal murni, tanpa satu pun impor, dengan alasan yang sama seperti
 * `visionFallback.ts` dan `servicesFallback.ts`: dua pembaca yang sangat
 * berbeda bergantung pada sifat itu —
 *
 * 1. `src/data/sectionTexts.ts` memakainya sebagai cadangan di peramban.
 * 2. `server/db/seed.ts` membacanya dari Node untuk mengisi database pertama
 *    kali. Satu impor ke store situs sudah cukup menyeret `fetch` dan tipe DOM
 *    ke dalam skrip seed.
 *
 * ‼️ Cadangan ini yang PALING berat tugasnya di seluruh CMS.
 *
 * Di daftar seperti nilai atau layanan, CMS yang mengembalikan daftar kosong
 * berarti seksinya tidak dirender, dan itu memang yang diminta editor. Di
 * sini tidak ada keadaan seperti itu: sebelas seksi ini tetap tayang apa pun
 * isi `content.json`-nya, jadi judul yang hilang bukan seksi yang hilang
 * melainkan seksi berkepala kosong. Karena itu `sectionTexts.ts` jatuh ke
 * cadangan PER-ISIAN, bukan per-seksi.
 *
 * Isinya SALINAN APA ADANYA dari literal yang dulu tinggal di sebelas
 * komponennya (`HEADING_LINES` di `CsiHero.tsx`, `<LineMask>The Crew</LineMask>`
 * di `TheCrew.tsx`, dan seterusnya). Baris baru ditulis `\n`; paragraf kedua
 * subteks `people-intro` dipisah baris kosong.
 */

export type SectionTextContent = {
  /** Judul seksinya. `\n` memisahkan baris. */
  heading: string;
  /** Subteks di bawahnya. String kosong = seksi ini memang tidak punya. */
  subheading: string;
};

export const FALLBACK_SECTION_TEXTS = {
  "csi-hero": {
    heading: "Think beyond software.\nBuild intelligence.",
    subheading:
      "We build intelligent digital solutions that help businesses, enterprises, and governments innovate, automate, and grow. At cogniti, we believe software should do more than function. It should create value, simplify complexity, and empower organizations to make smarter decisions.",
  },
  deployments: {
    heading: "Built for real-world environments where decisions matter.",
    subheading: "",
  },
  process: {
    heading: "How We Work",
    subheading: "",
  },
  industries: {
    heading: "Built Across Sectors",
    subheading: "",
  },
  "services-lead": {
    heading: "Where Software Becomes Intelligence.",
    subheading:
      "We build the software, AI, and cloud infrastructure that turn complex operations into decisions your team can act on for government agencies and enterprises across Indonesia.",
  },
  "work-lead": {
    heading: "From Public Sector\nto Enterprise.",
    subheading:
      "Every project is an answer to a real problem, not a demo, not a prototype. Here is the work already running in the field, from citizen service portals to enterprise cloud infrastructure.",
  },
  "selected-work": {
    heading: "Selected Work",
    subheading: "",
  },
  "case-studies": {
    heading: "Case Studies",
    subheading: "",
  },
  "people-intro": {
    heading: "The People Behind CSI.",
    subheading:
      "We are a collective of strategists, designers, and builders who believe the best digital work happens when craft meets conviction.\n\nEvery engagement is a genuine partnership. We embed ourselves in your world and leave you with something built to last.",
  },
  "the-crew": {
    heading: "The Crew",
    subheading: "",
  },
  careers: {
    heading: "Build What Comes Next.",
    subheading:
      "We are looking for curious minds who want to create meaningful impact through technology.",
  },
} satisfies Record<string, SectionTextContent>;
