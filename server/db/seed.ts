/**
 * Isi database dengan konten lowongan yang SUDAH ADA di repo.
 *
 * Jalankan sekali: `bun run db:seed`. Konten yang sekarang hidup sebagai
 * literal TypeScript (`FALLBACK_ROLES` di `src/data/careerRolesFallback.ts` dan
 * `FALLBACK_JOBS` di `src/data/jobsFallback.ts`) dipindahkan apa adanya ke Postgres — tidak ada yang perlu
 * diketik ulang, dan tidak ada kesempatan salah ketik saat memindahkannya.
 *
 * Dua sumber itu memang saling melengkapi hari ini: `FALLBACK_ROLES` adalah DAFTAR
 * (termasuk lowongan yang sudah ditutup), `FALLBACK_JOBS` adalah ISI HALAMAN untuk role
 * yang materinya lengkap. Dijodohkan lewat `slug`. Setelah seed, keduanya jadi
 * satu baris di tabel `jobs`, dan pemisahan itu berhenti jadi sesuatu yang
 * harus dijelaskan ke siapa pun.
 *
 * Aman diulang: kalau tabel `jobs` sudah ada isinya, skrip berhenti tanpa
 * menyentuh apa pun. Menimpa isi database dengan literal repo justru akan
 * MENGHAPUS suntingan yang sudah dibuat editor.
 */

import { sql as raw } from "drizzle-orm";

/* Sengaja menunjuk berkas `*Fallback` yang literal murni, bukan `careerRoles.ts`
   / `jobs.ts`: dua modul itu mengimpor store situs, dan store itu memakai
   `fetch` — tipe browser yang tidak boleh masuk ke program Node ini. */
import { FALLBACK_ROLES } from "../../src/data/careerRolesFallback";
import { FALLBACK_JOBS } from "../../src/data/jobsFallback";
import { db, sql } from "./client";
import {
  images,
  jobCopy,
  jobCopyBullets,
  jobSkills,
  jobs,
} from "./schema";

async function seed() {
  const [{ count }] = await db
    .select({ count: raw<number>`count(*)::int` })
    .from(jobs);

  if (count > 0) {
    console.log(
      `Tabel jobs sudah berisi ${count} baris — seed dilewati.\n` +
        `Kalau memang mau mulai dari nol: psql -d cogniti_dev -c 'truncate jobs cascade'`,
    );
    return;
  }

  await db.transaction(async (tx) => {
    /* ── gambar ──────────────────────────────────────────────
       Foto yang sudah ada didaftarkan sebagai `source: "static"`: berkasnya
       milik repo di `public/careers/` (hasil grading ffmpeg manual), jadi CMS
       boleh MEMILIHNYA tapi tidak boleh menghapusnya dari disk. */
    const photoPaths = [...new Set(FALLBACK_ROLES.map((r) => r.photo).filter(Boolean))];
    const imageRows = photoPaths.length
      ? await tx
          .insert(images)
          .values(
            photoPaths.map((path) => ({
              path,
              source: "static" as const,
              originalName: path.split("/").pop() ?? null,
            })),
          )
          .returning({ id: images.id, path: images.path })
      : [];
    const imageIdByPath = new Map(imageRows.map((r) => [r.path, r.id]));

    /* ── lowongan ────────────────────────────────────────────
       Urutan tampil diambil dari urutan literal `FALLBACK_ROLES`, bukan diurutkan ulang
       menurut judul atau status: itulah urutan yang sudah tayang hari ini, dan
       mengubahnya diam-diam saat pindah ke CMS akan terbaca sebagai bug. */
    for (const [index, role] of FALLBACK_ROLES.entries()) {
      const posting = role.slug
        ? (FALLBACK_JOBS.find((j) => j.slug === role.slug) ?? null)
        : null;

      /* Baris tanpa slug belum punya halaman sendiri. Slug tetap dibuatkan —
         kolomnya `not null`, dan editor butuh alamat siap pakai begitu dia
         melengkapi materinya. */
      const slug =
        role.slug ??
        role.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

      const [job] = await tx
        .insert(jobs)
        .values({
          slug,
          title: role.title,
          department: role.type,
          state: role.status === "open" ? "open" : "closed",
          overview: role.overview,
          photoId: imageIdByPath.get(role.photo) ?? null,
          askGithub: posting?.askGithub ?? false,
          sortOrder: index,
          /* Seluruh isi ini SUDAH tayang sekarang, jadi ditandai terpublish.
             Tanpa ini, badge admin akan menyambut editor dengan "7 perubahan
             belum tayang" padahal dia belum menyentuh apa pun. */
          publishedAt: new Date(),
        })
        .returning({ id: jobs.id });

      if (role.skills.length) {
        await tx.insert(jobSkills).values(
          role.skills.map((label, position) => ({
            jobId: job.id,
            position,
            label,
          })),
        );
      }

      if (!posting) continue;

      for (const lang of ["en", "id"] as const) {
        const copy = posting[lang];
        await tx
          .insert(jobCopy)
          .values({ jobId: job.id, lang, intro: copy.intro });

        const bullets = [
          ...copy.responsibilities.map((text, position) => ({
            kind: "responsibility" as const,
            position,
            text,
          })),
          ...copy.qualifications.map((text, position) => ({
            kind: "qualification" as const,
            position,
            text,
          })),
        ];
        if (bullets.length) {
          await tx.insert(jobCopyBullets).values(
            bullets.map((b) => ({ jobId: job.id, lang, ...b })),
          );
        }
      }
    }
  });

  const [{ count: after }] = await db
    .select({ count: raw<number>`count(*)::int` })
    .from(jobs);
  console.log(`Seed selesai: ${after} lowongan masuk ke database.`);
}

await seed();
await sql.end();
