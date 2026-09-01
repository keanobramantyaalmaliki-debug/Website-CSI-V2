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

import { eq, sql as raw } from "drizzle-orm";

/* Sengaja menunjuk berkas `*Fallback` yang literal murni, bukan `careerRoles.ts`
   / `jobs.ts`: dua modul itu mengimpor store situs, dan store itu memakai
   `fetch` — tipe browser yang tidak boleh masuk ke program Node ini. */
import { FALLBACK_ROLES } from "../../src/data/careerRolesFallback";
import { FALLBACK_JOBS } from "../../src/data/jobsFallback";
import { FALLBACK_CREW } from "../../src/data/crewFallback";
import { FALLBACK_VALUES } from "../../src/data/valuesFallback";
import { db, sql } from "./client";
import {
  crewMembers,
  crewSocials,
  images,
  jobCopy,
  jobCopyBullets,
  jobSkills,
  jobs,
  peopleValues,
} from "./schema";

async function seedJobs() {
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

/**
 * Nilai "What We Stand For".
 *
 * Punya pemeriksaan isi SENDIRI, bukan menumpang pemeriksaan tabel `jobs`.
 * Seed lowongan sudah pernah jalan di database yang ada, jadi kalau keduanya
 * digerbangi satu pemeriksaan, nilai tidak akan pernah masuk — skripnya
 * berhenti di baris pertama sambil melapor "sudah terisi", dan tabel nilainya
 * tetap kosong tanpa ada yang salah kelihatannya.
 */
async function seedValues() {
  const [{ count }] = await db
    .select({ count: raw<number>`count(*)::int` })
    .from(peopleValues);

  if (count > 0) {
    console.log(`Tabel people_values sudah berisi ${count} baris — dilewati.`);
    return;
  }

  await db.transaction(async (tx) => {
    for (const [index, value] of FALLBACK_VALUES.entries()) {
      /* Foto nilai juga `source: "static"`: berkasnya milik repo di
         `public/people/`, boleh dipilih CMS tapi tidak boleh dihapus dari
         disk. */
      let photoId: string | null = null;
      if (value.photo) {
        const [row] = await tx
          .insert(images)
          .values({
            path: value.photo,
            source: "static" as const,
            originalName: value.photo.split("/").pop() ?? null,
          })
          .onConflictDoNothing({ target: images.path })
          .returning({ id: images.id });

        /* `onConflictDoNothing` tidak mengembalikan baris kalau path-nya sudah
           terdaftar (mungkin dipakai lowongan), jadi baris lamanya dicari. */
        photoId =
          row?.id ??
          (
            await tx
              .select({ id: images.id })
              .from(images)
              .where(eq(images.path, value.photo))
          )[0]?.id ??
          null;
      }

      await tx.insert(peopleValues).values({
        title: value.title,
        tagline: value.tagline,
        description: value.description,
        photoId,
        state: "live",
        sortOrder: index,
        /* Sudah tayang hari ini — lihat alasan yang sama di seed lowongan. */
        publishedAt: new Date(),
      });
    }
  });

  console.log(`Seed selesai: ${FALLBACK_VALUES.length} nilai masuk ke database.`);
}

/**
 * Anggota crew di halaman People.
 *
 * Gerbang isinya sendiri, alasan yang sama dengan `seedValues`: database yang
 * sudah pernah di-seed lowongan tidak boleh membuat crew dilewati diam-diam.
 *
 * Semua masuk sebagai `live`: tiga belas orang ini memang sudah tayang hari
 * ini. Menaruhnya sebagai `draft` akan MENGOSONGKAN halaman People pada
 * publish pertama — kerusakan yang tidak kelihatan sampai ada yang menekan
 * tombolnya.
 */
async function seedCrew() {
  const [{ count }] = await db
    .select({ count: raw<number>`count(*)::int` })
    .from(crewMembers);

  if (count > 0) {
    console.log(`Tabel crew_members sudah berisi ${count} baris — dilewati.`);
    return;
  }

  await db.transaction(async (tx) => {
    for (const orang of FALLBACK_CREW) {
      /* Foto crew `source: "static"` juga: berkasnya milik repo di
         `public/people/`. Beberapa orang memang belum punya foto, dan itu
         bukan data yang kurang — situs menggambar avatar inisial untuk
         mereka. */
      let photoId: string | null = null;
      if (orang.photoUrl) {
        const [row] = await tx
          .insert(images)
          .values({
            path: orang.photoUrl,
            source: "static" as const,
            originalName: orang.photoUrl.split("/").pop() ?? null,
          })
          .onConflictDoNothing({ target: images.path })
          .returning({ id: images.id });

        photoId =
          row?.id ??
          (
            await tx
              .select({ id: images.id })
              .from(images)
              .where(eq(images.path, orang.photoUrl))
          )[0]?.id ??
          null;
      }

      const [member] = await tx
        .insert(crewMembers)
        .values({
          name: orang.name,
          role: orang.role,
          category: orang.category,
          photoId,
          state: "live",
          /* Sudah tayang hari ini — lihat alasan yang sama di seed lowongan. */
          publishedAt: new Date(),
        })
        .returning({ id: crewMembers.id });

      const social = orang.social ?? [];
      if (social.length) {
        await tx.insert(crewSocials).values(
          social.map((s, position) => ({
            memberId: member.id,
            position,
            platform: s.platform,
            url: s.url,
          })),
        );
      }
    }
  });

  console.log(`Seed selesai: ${FALLBACK_CREW.length} anggota crew masuk ke database.`);
}

await seedJobs();
await seedValues();
await seedCrew();
await sql.end();
