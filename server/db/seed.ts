/**
 * Isi database dengan konten yang SUDAH ADA di repo.
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
import { FALLBACK_WORK_PROJECTS } from "../../src/data/workProjectsFallback";
import { FALLBACK_CASE_STUDIES } from "../../src/data/caseStudiesFallback";
import { FALLBACK_TESTIMONIALS } from "../../src/data/testimonialsFallback";
import { FALLBACK_SERVICES } from "../../src/data/servicesFallback";
import { FALLBACK_INDUSTRIES } from "../../src/data/industriesFallback";
import { FALLBACK_DEPLOYMENTS } from "../../src/data/deploymentsFallback";
import { FALLBACK_VISION } from "../../src/data/visionFallback";
import { FALLBACK_PROCESS_STEPS } from "../../src/data/processStepsFallback";
import { FALLBACK_FOOTER } from "../../src/data/footerFallback";
import { db, sql } from "./client";
import {
  crewMembers,
  crewSocials,
  deployments,
  footer,
  footerSocials,
  images,
  industries,
  jobCopy,
  jobCopyBullets,
  jobSkills,
  jobs,
  peopleValues,
  processSteps,
  services,
  serviceSubs,
  workProjects,
  caseStudies,
  caseStudyScopes,
  testimonials,
  vision,
  workProjectTags,
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
             belum terpublish" padahal dia belum menyentuh apa pun. */
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

/**
 * Proyek "Selected Work" di halaman Work.
 *
 * Gerbang isinya sendiri lagi — alasan yang sama dengan `seedValues` dan
 * `seedCrew`: database yang sudah pernah di-seed entitas lain tidak boleh
 * membuat proyek dilewati diam-diam.
 *
 * Semua masuk sebagai `live` karena kedelapan kartu ini memang sudah tayang
 * hari ini. Menaruhnya sebagai `draft` akan MENGOSONGKAN kipas di halaman Work
 * pada publish pertama.
 */
async function seedWorkProjects() {
  const [{ count }] = await db
    .select({ count: raw<number>`count(*)::int` })
    .from(workProjects);

  if (count > 0) {
    console.log(`Tabel work_projects sudah berisi ${count} baris — dilewati.`);
    return;
  }

  await db.transaction(async (tx) => {
    for (const [index, proyek] of FALLBACK_WORK_PROJECTS.entries()) {
      /* `source: "static"` seperti foto lowongan dan crew, walau berkasnya
         bukan milik repo melainkan hotlink stok Unsplash. Yang dijaga kolom
         itu cuma satu hal: CMS boleh MEMILIH gambar ini tapi tidak boleh
         mencoba menghapusnya dari disk. Untuk alamat yang bahkan tidak ada di
         disk, itu justru jawaban yang benar. */
      const [row] = await tx
        .insert(images)
        .values({
          path: proyek.image,
          source: "static" as const,
          originalName: proyek.image.split("/").pop() ?? null,
        })
        .onConflictDoNothing({ target: images.path })
        .returning({ id: images.id });

      /* `onConflictDoNothing` tidak mengembalikan baris kalau path-nya sudah
         terdaftar, jadi baris lamanya dicari — sama seperti di `seedValues`. */
      const photoId =
        row?.id ??
        (
          await tx
            .select({ id: images.id })
            .from(images)
            .where(eq(images.path, proyek.image))
        )[0]?.id ??
        null;

      const [project] = await tx
        .insert(workProjects)
        .values({
          title: proyek.title,
          client: proyek.client,
          year: proyek.year,
          outcome: proyek.outcome ?? "",
          photoId,
          state: "live",
          /* Urutan literal = urutan kipas yang tayang hari ini. Mengurutkan
             ulang menurut tahun atau judul saat pindah ke CMS akan terbaca
             sebagai bug. */
          sortOrder: index,
          /* Sudah tayang hari ini — lihat alasan yang sama di seed lowongan. */
          publishedAt: new Date(),
        })
        .returning({ id: workProjects.id });

      if (proyek.tags.length) {
        await tx.insert(workProjectTags).values(
          proyek.tags.map((label, position) => ({
            projectId: project.id,
            position,
            label,
          })),
        );
      }
    }
  });

  console.log(
    `Seed selesai: ${FALLBACK_WORK_PROJECTS.length} proyek masuk ke database.`,
  );
}

/**
 * Cerita "Case Studies" di halaman Work.
 *
 * Gerbang isinya sendiri lagi, dan `live` lagi, dengan alasan yang sama seperti
 * `seedWorkProjects` di atas: kedua cerita ini sudah tayang hari ini, dan
 * menaruhnya sebagai `draft` akan menghapus seluruh seksinya dari halaman Work
 * pada publish pertama.
 */
async function seedCaseStudies() {
  const [{ count }] = await db
    .select({ count: raw<number>`count(*)::int` })
    .from(caseStudies);

  if (count > 0) {
    console.log(`Tabel case_studies sudah berisi ${count} baris — dilewati.`);
    return;
  }

  await db.transaction(async (tx) => {
    for (const [index, cerita] of FALLBACK_CASE_STUDIES.entries()) {
      /* `source: "static"` untuk hotlink Unsplash — penjelasan lengkapnya ada
         di `seedWorkProjects` di atas. */
      const [row] = await tx
        .insert(images)
        .values({
          path: cerita.image,
          source: "static" as const,
          originalName: cerita.image.split("/").pop() ?? null,
        })
        .onConflictDoNothing({ target: images.path })
        .returning({ id: images.id });

      const photoId =
        row?.id ??
        (
          await tx
            .select({ id: images.id })
            .from(images)
            .where(eq(images.path, cerita.image))
        )[0]?.id ??
        null;

      const [study] = await tx
        .insert(caseStudies)
        .values({
          title: cerita.title,
          client: cerita.client,
          year: cerita.year,
          industry: cerita.industry,
          outcome: cerita.outcome,
          quote: cerita.quote,
          desc: cerita.desc,
          photoId,
          state: "live",
          /* Urutan literal = urutan blok yang tayang hari ini. */
          sortOrder: index,
          publishedAt: new Date(),
        })
        .returning({ id: caseStudies.id });

      if (cerita.scope.length) {
        await tx.insert(caseStudyScopes).values(
          cerita.scope.map((label, position) => ({
            studyId: study.id,
            position,
            label,
          })),
        );
      }
    }
  });

  console.log(
    `Seed selesai: ${FALLBACK_CASE_STUDIES.length} case study masuk ke database.`,
  );
}

/**
 * Daftar layanan di halaman Services.
 *
 * Gerbang isinya sendiri, alasan yang sama dengan `seedValues`: database yang
 * sudah pernah di-seed lowongan tidak boleh membuat layanan dilewati
 * diam-diam.
 *
 * Tidak ada urusan gambar di sini — layanan memang tidak punya foto; yang
 * tayang cuma teks di sabuk 3D.
 */
async function seedServices() {
  const [{ count }] = await db
    .select({ count: raw<number>`count(*)::int` })
    .from(services);

  if (count > 0) {
    console.log(`Tabel services sudah berisi ${count} baris — dilewati.`);
    return;
  }

  await db.transaction(async (tx) => {
    for (const [index, layanan] of FALLBACK_SERVICES.entries()) {
      const [row] = await tx
        .insert(services)
        .values({
          title: layanan.title,
          desc: layanan.desc,
          /* Kesembilannya sudah tayang hari ini — masuk sebagai `draft` akan
             MENGOSONGKAN sabuk layanan pada publish pertama. */
          state: "live",
          /* Urutan literal = urutan sabuk (dan daftar sr-only) yang tayang
             hari ini. Mengurutkannya ulang menurut abjad saat pindah ke CMS
             akan terbaca sebagai bug. */
          sortOrder: index,
          publishedAt: new Date(),
        })
        .returning({ id: services.id });

      if (layanan.subs.length) {
        await tx.insert(serviceSubs).values(
          layanan.subs.map((label, position) => ({
            serviceId: row.id,
            position,
            label,
          })),
        );
      }
    }
  });

  console.log(
    `Seed selesai: ${FALLBACK_SERVICES.length} layanan masuk ke database.`,
  );
}

/**
 * Testimoni klien di dasar halaman Services.
 *
 * Gerbang isinya sendiri, alasan yang sama dengan `seedValues`: database yang
 * sudah pernah di-seed lowongan tidak boleh membuat testimoni dilewati
 * diam-diam.
 *
 * Tidak ada urusan foto di sini — tabelnya memang tidak punya kolomnya, karena
 * komponennya menggambar ikon orang yang sama untuk setiap kutipan dan tidak
 * punya satu pun `<img>`.
 */
async function seedTestimonials() {
  const [{ count }] = await db
    .select({ count: raw<number>`count(*)::int` })
    .from(testimonials);

  if (count > 0) {
    console.log(`Tabel testimonials sudah berisi ${count} baris — dilewati.`);
    return;
  }

  await db.transaction(async (tx) => {
    for (const [index, t] of FALLBACK_TESTIMONIALS.entries()) {
      await tx.insert(testimonials).values({
        quote: t.quote,
        name: t.name,
        role: t.role,
        /* Ketiganya memang sudah tayang hari ini — masuk sebagai `draft` akan
           MENGOSONGKAN blok testimoni pada publish pertama. */
        state: "live",
        /* Urutan literal = urutan yang tayang; yang pertama adalah kutipan
           yang terlihat saat halaman dibuka. */
        sortOrder: index,
        publishedAt: new Date(),
      });
    }
  });

  console.log(
    `Seed selesai: ${FALLBACK_TESTIMONIALS.length} testimoni masuk ke database.`,
  );
}

/**
 * Sektor industri di strip halaman depan.
 *
 * Gerbang isinya sendiri, alasan yang sama dengan `seedValues`.
 *
 * Semua masuk sebagai `live`: ketiga belasnya memang sudah tayang hari ini —
 * dan angka 13 itu persis `MAX_LIVE_INDUSTRIES`, jadi seed ini mengisi
 * tumpukan sampai penuh. Sektor ke-14 yang ditambahkan lewat panel akan
 * ditolak `routes/industries.ts` sampai ada yang dijadikan draft atau dihapus;
 * itu memang yang diinginkan, bukan kecelakaan.
 */
async function seedIndustries() {
  const [{ count }] = await db
    .select({ count: raw<number>`count(*)::int` })
    .from(industries);

  if (count > 0) {
    console.log(`Tabel industries sudah berisi ${count} baris — dilewati.`);
    return;
  }

  await db.transaction(async (tx) => {
    for (const [index, industry] of FALLBACK_INDUSTRIES.entries()) {
      /* Beda dari foto entitas lain: ketiga belasnya URL Unsplash, bukan
         berkas di `public/`. Tetap `source: "static"` — arti kolom itu "bukan
         unggahan panel, jadi CMS tidak berhak menghapusnya", dan itu justru
         lebih benar lagi untuk berkas yang bahkan tidak ada di server ini. */
      let photoId: string | null = null;
      if (industry.image) {
        const [row] = await tx
          .insert(images)
          .values({
            path: industry.image,
            source: "static" as const,
            originalName: null,
          })
          .onConflictDoNothing({ target: images.path })
          .returning({ id: images.id });

        /* `onConflictDoNothing` tidak mengembalikan baris kalau path-nya sudah
           terdaftar, jadi baris lamanya dicari — sama seperti di `seedValues`. */
        photoId =
          row?.id ??
          (
            await tx
              .select({ id: images.id })
              .from(images)
              .where(eq(images.path, industry.image))
          )[0]?.id ??
          null;
      }

      await tx.insert(industries).values({
        name: industry.name,
        desc: industry.desc,
        tier: industry.tier,
        photoId,
        state: "live",
        sortOrder: index,
        /* Sudah tayang hari ini — lihat alasan yang sama di seed lowongan. */
        publishedAt: new Date(),
      });
    }
  });

  console.log(
    `Seed selesai: ${FALLBACK_INDUSTRIES.length} sektor masuk ke database.`,
  );
}

/**
 * Kartu deployment di halaman depan.
 *
 * Gerbangnya punya sendiri (`count > 0` di tabelnya) dengan alasan yang sama
 * seperti `seedValues`: database yang sudah berisi lowongan tapi belum berisi
 * deployment adalah keadaan yang normal, dan gerbang bersama akan melewatkan
 * yang kedua diam-diam.
 *
 * Foto tiap kartu URL Unsplash, bukan berkas di `public/` — persis seperti
 * sektor industri, dan `source: "static"` dipakai dengan alasan yang sama.
 */
async function seedDeployments() {
  const [{ count }] = await db
    .select({ count: raw<number>`count(*)::int` })
    .from(deployments);

  if (count > 0) {
    console.log(`Tabel deployments sudah berisi ${count} baris — dilewati.`);
    return;
  }

  await db.transaction(async (tx) => {
    for (const [index, item] of FALLBACK_DEPLOYMENTS.entries()) {
      let photoId: string | null = null;
      if (item.image) {
        const [row] = await tx
          .insert(images)
          .values({
            path: item.image,
            source: "static" as const,
            originalName: null,
          })
          .onConflictDoNothing({ target: images.path })
          .returning({ id: images.id });

        /* `onConflictDoNothing` tidak mengembalikan baris kalau path-nya sudah
           terdaftar, jadi baris lamanya dicari — sama seperti di `seedValues`. */
        photoId =
          row?.id ??
          (
            await tx
              .select({ id: images.id })
              .from(images)
              .where(eq(images.path, item.image))
          )[0]?.id ??
          null;
      }

      await tx.insert(deployments).values({
        sector: item.sector,
        region: item.region,
        desc: item.desc,
        photoId,
        state: "live",
        sortOrder: index,
        /* Sudah tayang hari ini — lihat alasan yang sama di seed lowongan. */
        publishedAt: new Date(),
      });
    }
  });

  console.log(
    `Seed selesai: ${FALLBACK_DEPLOYMENTS.length} deployment masuk ke database.`,
  );
}

/**
 * Seksi Visi di halaman depan.
 *
 * Satu baris, bukan daftar — jadi gerbangnya tetap `count > 0` seperti yang
 * lain, tapi artinya lebih tegas: barisnya ada atau tidak ada sama sekali.
 * Gerbangnya tetap punya sendiri, alasan yang sama dengan `seedValues`.
 *
 * Tidak ada `state` yang perlu diisi di sini. Tabelnya memang tidak punya
 * kolomnya, karena seksi Visi TIDAK BOLEH menghilang: `pt-20 pb-20` miliknya
 * satu-satunya yang menjatah celah 80px antara plank Industries dan Contact di
 * mobile. Yang bisa diubah editor cuma isinya, bukan keberadaannya.
 */
async function seedVision() {
  const [{ count }] = await db
    .select({ count: raw<number>`count(*)::int` })
    .from(vision);

  if (count > 0) {
    console.log(`Tabel vision sudah berisi ${count} baris — dilewati.`);
    return;
  }

  await db.transaction(async (tx) => {
    /* Fotonya `source: "static"`: berkasnya milik repo di `public/home/`
       (hasil grading ffmpeg manual), jadi CMS boleh MEMILIHNYA tapi tidak
       boleh menghapusnya dari disk. */
    let photoId: string | null = null;
    if (FALLBACK_VISION.photo) {
      const [row] = await tx
        .insert(images)
        .values({
          path: FALLBACK_VISION.photo,
          source: "static" as const,
          originalName: FALLBACK_VISION.photo.split("/").pop() ?? null,
        })
        .onConflictDoNothing({ target: images.path })
        .returning({ id: images.id });

      /* `onConflictDoNothing` tidak mengembalikan baris kalau path-nya sudah
         terdaftar, jadi baris lamanya dicari — sama seperti di `seedValues`. */
      photoId =
        row?.id ??
        (
          await tx
            .select({ id: images.id })
            .from(images)
            .where(eq(images.path, FALLBACK_VISION.photo))
        )[0]?.id ??
        null;
    }

    await tx.insert(vision).values({
      /* `id: 1` ditulis eksplisit walau kolomnya sudah `default(1)`, supaya
         batasan satu-barisnya terbaca di sini juga dan bukan cuma di skema. */
      id: 1,
      statement: FALLBACK_VISION.statement,
      photoId,
      /* Sudah tayang hari ini — lihat alasan yang sama di seed lowongan. */
      publishedAt: new Date(),
    });
  });

  console.log("Seed selesai: visi masuk ke database.");
}

/**
 * Kaki halaman — surel, alamat, hak cipta, dan tautan sosialnya.
 *
 * Gerbangnya baris INDUK, bukan tautannya: kalau barisnya sudah ada, seluruh
 * seed dilewati termasuk tautan sosialnya. Menyisipkan tautan ke baris yang
 * sudah disunting editor akan menduplikasi daftar yang sudah benar — dan
 * `position` yang sudah terpakai membuatnya gagal di tengah jalan, bukan
 * gagal di depan.
 *
 * Tidak ada `state` di sini, alasan yang sama dengan visi: tabelnya memang
 * tidak punya kolomnya. Kaki halaman ikut setiap halaman situs; yang bisa
 * diubah editor isinya, bukan keberadaannya.
 *
 * Tidak ada gambar apa pun, jadi tidak ada urusan dengan tabel `images` —
 * satu-satunya seed konten yang begitu.
 */
async function seedFooter() {
  const [{ count }] = await db
    .select({ count: raw<number>`count(*)::int` })
    .from(footer);

  if (count > 0) {
    console.log(`Tabel footer sudah berisi ${count} baris — dilewati.`);
    return;
  }

  await db.transaction(async (tx) => {
    await tx.insert(footer).values({
      /* `id: 1` ditulis eksplisit walau kolomnya sudah `default(1)`, supaya
         batasan satu-barisnya terbaca di sini juga dan bukan cuma di skema. */
      id: 1,
      email: FALLBACK_FOOTER.email,
      address: FALLBACK_FOOTER.address,
      copyright: FALLBACK_FOOTER.copyright,
      /* Sudah tayang hari ini — lihat alasan yang sama di seed lowongan. */
      publishedAt: new Date(),
    });

    if (FALLBACK_FOOTER.socials.length) {
      await tx.insert(footerSocials).values(
        FALLBACK_FOOTER.socials.map((s, position) => ({
          footerId: 1,
          position,
          label: s.label,
          href: s.href,
        })),
      );
    }
  });

  console.log(
    `Seed selesai: kaki halaman + ${FALLBACK_FOOTER.socials.length} tautan sosial masuk ke database.`,
  );
}

/**
 * Langkah "How We Work" di halaman depan.
 *
 * Gerbang isinya sendiri, alasan yang sama dengan `seedValues`.
 *
 * Semua masuk sebagai `live`: keenamnya memang sudah tayang hari ini — dan
 * angka 6 itu persis `MAX_LIVE_PROCESS_STEPS`, jadi seed ini mengisi seksinya
 * sampai penuh, sama seperti seed industri. Langkah ke-7 lewat panel akan
 * ditolak `routes/processSteps.ts` sampai ada yang dijadikan draft atau
 * dihapus.
 *
 * `glyph` ikut ditulis dari literal, bukan dihitung dari `index`: ilustrasinya
 * MILIK langkahnya, supaya menghapus atau menukar urutan tidak menggeser
 * gambar diam-diam seperti dulu waktu `PROCESS_GLYPHS[i]` yang menentukan.
 */
async function seedProcessSteps() {
  const [{ count }] = await db
    .select({ count: raw<number>`count(*)::int` })
    .from(processSteps);

  if (count > 0) {
    console.log(`Tabel process_steps sudah berisi ${count} baris — dilewati.`);
    return;
  }

  await db.transaction(async (tx) => {
    for (const [index, step] of FALLBACK_PROCESS_STEPS.entries()) {
      await tx.insert(processSteps).values({
        title: step.title,
        kicker: step.kicker,
        desc: step.desc,
        glyph: step.glyph,
        state: "live",
        /* Urutan literal = urutan yang tayang; nomor "01"–"06" di kartunya
           dihitung dari posisi ini saat render, bukan disimpan. */
        sortOrder: index,
        /* Sudah tayang hari ini — lihat alasan yang sama di seed lowongan. */
        publishedAt: new Date(),
      });
    }
  });

  console.log(
    `Seed selesai: ${FALLBACK_PROCESS_STEPS.length} langkah cara kerja masuk ke database.`,
  );
}

await seedJobs();
await seedValues();
await seedCrew();
await seedWorkProjects();
await seedCaseStudies();
await seedServices();
await seedTestimonials();
await seedIndustries();
await seedDeployments();
await seedVision();
await seedProcessSteps();
await seedFooter();
await sql.end();
