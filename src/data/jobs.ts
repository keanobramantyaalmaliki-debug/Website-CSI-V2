/**
 * Isi lowongan yang punya HALAMAN SENDIRI (`/careers/<slug>`).
 *
 * Sumbernya poster rekrutmen resmi cogniti ("WE ARE HIRING") — bukan ringkasan
 * yang ditulis ulang. Bullet `id` disalin VERBATIM dari poster; `en` adalah
 * terjemahannya, dipakai sebagai bahasa default karena seluruh sisa situs
 * berbahasa Inggris.
 *
 * Modul ini melayani HALAMAN lowongan; `careerRoles.ts` melayani DAFTAR-nya
 * (termasuk yang sudah `closed`). Yang menjodohkan keduanya `slug`: role yang
 * punya slug barisnya jadi tautan ke halaman, yang belum tetap memakai
 * accordion di tempat.
 *
 * Sejak CMS hidup (Agu 2026) keduanya diisi dari `content.json`, dan pembagian
 * itu tidak lagi terlihat oleh editor — di panel admin satu lowongan ya satu
 * isian. Literalnya (`jobsFallback.ts`) tinggal sebagai jaring pengaman.
 */

import type { Job } from "@shared/job";
import { contentJobs } from "@/lib/content/store";

import {
  FALLBACK_JOBS,
  type JobCopy,
  type JobLang,
  type JobPosting,
} from "./jobsFallback";

export { FALLBACK_JOBS };
export type { JobCopy, JobLang, JobPosting };

/**
 * Pilihan "Years of experience".
 *
 * `value` yang berangkat ke email SELALU sama untuk kedua bahasa — kalau
 * labelnya yang dikirim, satu inbox berisi campuran "3–5 years" dan "3–5 tahun"
 * untuk hal yang persis sama, dan lamaran jadi tidak bisa disortir.
 */
export const EXPERIENCE_OPTIONS = [
  { value: "0–1 years", en: "Less than 1 year", id: "Kurang dari 1 tahun" },
  { value: "1–2 years", en: "1–2 years", id: "1–2 tahun" },
  { value: "3–5 years", en: "3–5 years", id: "3–5 tahun" },
  { value: "5+ years", en: "More than 5 years", id: "Lebih dari 5 tahun" },
] as const;

/**
 * Label antarmuka yang ikut berganti bersama toggle bahasa.
 *
 * Ditaruh di modul yang sama dengan isinya, bukan diserak sebagai ternary di
 * JSX: kalau lowongan keempat menyusul, penerjemahnya cukup membaca satu
 * berkas ini untuk tahu SELURUH teks yang berbahasa.
 */
export const JOB_UI: Record<JobLang, {
  back: string;
  responsibilities: string;
  qualifications: string;
  langLabel: string;
}> = {
  en: {
    back: "Back to careers",
    responsibilities: "What you will do",
    qualifications: "You are a great fit if you",
    langLabel: "Language",
  },
  id: {
    back: "Kembali ke careers",
    responsibilities: "Apa yang akan kamu kerjakan",
    qualifications: "Kamu cocok untuk posisi ini kalau",
    langLabel: "Bahasa",
  },
};

/**
 * Teks form lamaran, ikut toggle bahasa yang sama dengan isi halaman.
 *
 * Dipisah dari `JOB_UI` bukan karena sifatnya beda melainkan karena jumlahnya:
 * digabung, label tombol "Apply" tenggelam di antara dua puluh placeholder.
 * Keduanya tetap di berkas ini supaya penerjemah cukup membaca satu tempat.
 *
 * Yang TIDAK ada di sini: pesan galat isian. Itu milik
 * `lib/careers/submitApplication.ts` — yang tahu SEBAB sebuah isian ditolak
 * cuma pemeriksanya, dan menyalin kalimatnya ke sini berarti aturannya hidup
 * di dua tempat.
 */
export const APPLY_UI: Record<JobLang, {
  heading: string;
  requiredNote: string;
  optional: string;
  firstName: string;
  firstNamePlaceholder: string;
  lastName: string;
  lastNamePlaceholder: string;
  email: string;
  location: string;
  locationPlaceholder: string;
  motivation: string;
  motivationPlaceholder: string;
  experience: string;
  experiencePlaceholder: string;
  skills: string;
  portfolio: string;
  linkedin: string;
  github: string;
  submit: string;
  sending: string;
  sentLabel: string;
  sentNote: string;
  idleNote: string;
}> = {
  en: {
    heading: "Apply now",
    requiredNote: "* All fields are required unless stated otherwise",
    optional: "optional",
    firstName: "First name",
    firstNamePlaceholder: "Jane",
    lastName: "Last name",
    lastNamePlaceholder: "Doe",
    email: "Email",
    location: "Where are you based?",
    locationPlaceholder: "Jakarta, Indonesia",
    motivation: "Why do you want to join?",
    motivationPlaceholder: "Because I want to build things people actually use",
    experience: "Years of experience",
    experiencePlaceholder: "Select one",
    skills: "Skills",
    portfolio: "Portfolio",
    linkedin: "LinkedIn",
    github: "GitHub",
    submit: "Apply",
    sending: "Sending…",
    sentLabel: "Sent ✓",
    sentNote: "Thanks — your application is in. We’ll be in touch.",
    idleNote: "Prefer email? Send your CV to careers@cogniti.id.",
  },
  id: {
    heading: "Lamar sekarang",
    requiredNote: "* Semua isian wajib kecuali ditandai opsional",
    optional: "opsional",
    firstName: "Nama depan",
    firstNamePlaceholder: "Jane",
    lastName: "Nama belakang",
    lastNamePlaceholder: "Doe",
    email: "Email",
    location: "Kamu berbasis di mana?",
    locationPlaceholder: "Jakarta, Indonesia",
    motivation: "Kenapa kamu ingin bergabung?",
    motivationPlaceholder: "Karena aku ingin membangun hal yang benar-benar dipakai orang",
    experience: "Lama pengalaman",
    experiencePlaceholder: "Pilih salah satu",
    skills: "Keahlian",
    portfolio: "Portofolio",
    linkedin: "LinkedIn",
    github: "GitHub",
    submit: "Kirim lamaran",
    sending: "Mengirim…",
    sentLabel: "Terkirim ✓",
    sentNote: "Terima kasih — lamaranmu sudah masuk. Kami akan menghubungi.",
    idleNote: "Lebih suka email? Kirim CV ke careers@cogniti.id.",
  },
};

/**
 * Terjemahkan satu lowongan CMS jadi bentuk halaman.
 *
 * Mengembalikan `null` untuk lowongan yang `detail`-nya kosong: itu lowongan
 * yang belum punya halaman sendiri, dan barisnya di tabel careers harus tetap
 * jadi accordion — bukan tautan ke halaman kosong.
 */
function fromContent(job: Job): JobPosting | null {
  if (!job.detail) return null;
  return {
    slug: job.slug,
    title: job.title,
    photo: job.photo,
    askGithub: job.askGithub,
    skills: job.skills,
    en: job.detail.en,
    id: job.detail.id,
  };
}

/** Seluruh lowongan yang punya halaman sendiri — dari CMS kalau ada,
 *  dari bundle kalau tidak. */
export function jobPostings(): readonly JobPosting[] {
  const cms = contentJobs();
  if (!cms) return FALLBACK_JOBS;
  return cms
    .map(fromContent)
    .filter((job): job is JobPosting => job !== null);
}

/** Lowongan dengan slug ini, atau null kalau tidak ada. */
export function getJob(slug: string | undefined): JobPosting | null {
  if (!slug) return null;
  return jobPostings().find((job) => job.slug === slug) ?? null;
}

/**
 * Apakah pathname ini halaman lowongan?
 *
 * Dipakai `SiteLayout` untuk menyembunyikan hero 3D — dan itu sebabnya
 * pemeriksaannya SENGAJA tidak menuntut slug-nya dikenali: `/careers/ngawur`
 * juga halaman non-ruangan, dan hero-nya tidak boleh berkedip muncul sesaat
 * sebelum `<JobDetail>` mengalihkannya.
 */
export function isJobPath(pathname: string): boolean {
  return pathname.toLowerCase().startsWith("/careers");
}
