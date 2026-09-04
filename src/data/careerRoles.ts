/**
 * Daftar yang dirender tabel Careers — dari CMS kalau ada, dari bundle kalau
 * tidak.
 *
 * Literal cadangannya sendiri tinggal di `careerRolesFallback.ts`; pemisahan
 * itu yang membuat skrip seed bisa membacanya tanpa ikut menyeret store,
 * `fetch`, dan seluruh lingkungan browser.
 */

import { contentJobs } from "@/lib/content/store";
import { FALLBACK_ROLES, type CareerRole } from "./careerRolesFallback";

export { FALLBACK_ROLES };
export type { CareerRole };

/**
 * Daftar yang benar-benar dirender tabel Careers.
 *
 * Fungsi, bukan konstanta: `content.json` baru terbaca sesudah `loadContent()`
 * selesai di `main.tsx`, dan konstanta di module scope akan membeku pada isi
 * bundle sebelum itu terjadi.
 */
export function careerRoles(): CareerRole[] {
  const cms = contentJobs();
  if (!cms) return FALLBACK_ROLES;

  return cms.map((job) => ({
    title: job.title,
    type: job.department,
    status: job.state === "open" ? "open" : "closed",
    overview: job.overview,
    skills: job.skills,
    photo: job.photo,
    /* Slug HANYA untuk lowongan yang punya isi halaman. Baris tanpa slug
       memakai accordion di tempat — lihat CareersRoles.tsx. */
    slug: job.detail ? job.slug : undefined,
  }));
}
