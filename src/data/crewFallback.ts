/**
 * Isi crew yang IKUT TER-BUNDLE — jaring pengaman kalau `content.json` tidak
 * ada, rusak, atau lambat.
 *
 * Literal murni, tanpa satu pun impor. Dua pembaca yang berbeda bergantung
 * pada sifat itu:
 *
 * 1. `src/data/people.ts` memakainya sebagai cadangan saat CMS tidak terbaca.
 * 2. `server/db/seed.ts` membacanya dari Node untuk mengisi database pertama
 *    kali. Kalau berkas ini mengimpor store situs (yang memakai `fetch`),
 *    skrip seed akan menyeret tipe browser ke dalam program Node.
 *
 * Isinya SALINAN APA ADANYA dari yang tayang sebelum ada CMS — bukan diketik
 * ulang. Sesudah seed berjalan, yang berlaku adalah isi database; berkas ini
 * berhenti jadi sumber kebenaran dan tinggal jadi cadangan.
 */

export type TeamMember = {
  name: string;
  role: string;
  category: "Management" | "Developer" | "R & D";
  social?: { platform: "linkedin" | "github" | "x"; url: string }[];
  photoUrl?: string;
};

export const FALLBACK_CREW: TeamMember[] = [
  {
    name: "Fahmi Maliki",
    role: "Founder & Chief Executive",
    category: "Management",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Lena Almaliki",
    role: "Chief Executive",
    category: "Management",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Jun",
    role: "Manager",
    category: "Management",
    social: [{ platform: "linkedin", url: "#" }],
    photoUrl: "/people/jun.webp",
  },
  {
    name: "Imam Maliki",
    role: "Head of Operations",
    category: "Management",
    social: [{ platform: "linkedin", url: "#" }],
    photoUrl: "/people/imam.webp",
  },
  {
    name: "Lisa Puspitasari",
    role: "Assistant Manager",
    category: "Management",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Bagas Nusantara Nabillah",
    role: "Senior Developer",
    category: "Developer",
    social: [
      { platform: "linkedin", url: "#" },
      { platform: "x", url: "#" },
    ],
    photoUrl: "/people/bagas.webp",
  },
  {
    name: "Amallia Dwi Yustianti",
    role: "Senior Developer",
    category: "Developer",
    social: [
      { platform: "linkedin", url: "#" },
      { platform: "x", url: "#" },
    ],
    photoUrl: "/people/amallia.webp",
  },
  {
    name: "Nico Arya Putra Laksana",
    role: "Junior Developer",
    category: "Developer",
    social: [{ platform: "linkedin", url: "#" }],
    photoUrl: "/people/nico.webp",
  },
  {
    name: "Keano Bramantya Almaliki",
    role: "Junior Developer",
    category: "Developer",
    social: [{ platform: "linkedin", url: "#" }],
  },
  {
    name: "Sayyid",
    role: "Junior Developer",
    category: "Developer",
    social: [{ platform: "linkedin", url: "#" }],
    photoUrl: "/people/sayyid.webp",
  },
  {
    name: "Bayu",
    role: "Research & Development",
    category: "R & D",
    social: [{ platform: "linkedin", url: "#" }],
    photoUrl: "/people/bayu.webp",
  },
  {
    name: "Roni",
    role: "Research & Development",
    category: "R & D",
    social: [{ platform: "linkedin", url: "#" }],
    photoUrl: "/people/roni.webp",
  },
  {
    name: "Inno",
    role: "Research & Development",
    category: "R & D",
    social: [{ platform: "linkedin", url: "#" }],
    photoUrl: "/people/inno.webp",
  },
];
