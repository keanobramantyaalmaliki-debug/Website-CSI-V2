/**
 * Rakit `content.json` dari database dan taruh di tempat situs membacanya.
 *
 * INILAH satu-satunya jembatan antara database dan pengunjung. Situs publik
 * tidak pernah memanggil API dan tidak pernah menyentuh Postgres; ia membaca
 * satu berkas statis. Konsekuensinya yang paling penting: kalau proses API mati
 * atau Postgres tumbang, situs tetap tayang memakai isi publish terakhir.
 *
 * Karena itu publish TIDAK BOLEH menghasilkan berkas setengah jadi. Lihat
 * catatan tulis-atomik di bawah.
 */

import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { CONTENT_VERSION, type ContentPayload } from "@shared/content";
import type { CrewMember } from "@shared/crew";
import type { Job } from "@shared/job";
import type { Value } from "@shared/value";
import type { WorkProject } from "@shared/workProject";
import type { CaseStudy } from "@shared/caseStudy";
import type { Testimonial } from "@shared/testimonial";
import type { Service } from "@shared/service";
import type { Industry } from "@shared/industry";
import type { Deployment } from "@shared/deployment";
import type { ProcessStep } from "@shared/processStep";
import type { Vision } from "@shared/vision";
import type { Footer } from "@shared/footer";
import type { SectionText } from "@shared/sectionText";

import { record, type Actor } from "./audit";
import { db } from "./db/client";
import { dbNow } from "./db/now";
import {
  caseStudies,
  crewMembers,
  deployments,
  footer,
  industries,
  processSteps,
  jobs,
  sectionTexts,
  peopleValues,
  testimonials,
  services,
  vision,
  workProjects,
} from "./db/schema";
import { env } from "./env";
import { listCrew } from "./crewRepo";
import { listJobs } from "./jobsRepo";
import { listValues } from "./valuesRepo";
import { listWorkProjects } from "./workProjectsRepo";
import { listCaseStudies } from "./caseStudiesRepo";
import { listTestimonials } from "./testimonialsRepo";
import { listServices } from "./servicesRepo";
import { listIndustries } from "./industriesRepo";
import { listDeployments } from "./deploymentsRepo";
import { listProcessSteps } from "./processStepsRepo";
import { getVision } from "./visionRepo";
import { getFooter } from "./footerRepo";
import { listSectionTexts } from "./sectionTextRepo";

/**
 * `dist/` — hasil build Vite, yang disajikan `serve` di produksi.
 *
 * Sengaja BUKAN `public/`: berkas di `public/` hanya masuk ke situs saat build
 * berikutnya, jadi publish-nya tidak akan terlihat sampai ada yang menjalankan
 * `bun run build`. Menulis ke `dist/` membuat perubahan tayang seketika, dan
 * itulah inti kesepakatan "publish tanpa rebuild".
 */
export const CONTENT_PATH = path.resolve(process.cwd(), "dist", "content.json");

/** Hanya yang tayang. `draft` tidak pernah ikut — itu yang membuat tombol
 *  Publish aman ditekan kapan saja meski ada lowongan lain yang setengah jadi. */
async function collect(): Promise<ContentPayload> {
  const [
    jobRows,
    valueRows,
    crewRows,
    projectRows,
    studyRows,
    serviceRows,
    testimonialRows,
    industryRows,
    deploymentRows,
    processStepRows,
    visionRow,
    footerRow,
    sectionTextRows,
  ] = await Promise.all([
    listJobs({ includeDrafts: false }),
    listValues({ includeDrafts: false }),
    listCrew({ includeDrafts: false }),
    listWorkProjects({ includeDrafts: false }),
    listCaseStudies({ includeDrafts: false }),
    listServices({ includeDrafts: false }),
    listTestimonials({ includeDrafts: false }),
    listIndustries({ includeDrafts: false }),
    listDeployments({ includeDrafts: false }),
    listProcessSteps({ includeDrafts: false }),
    /* Tanpa `includeDrafts`: visi tidak punya keadaan draft/live sama
       sekali. Satu-satunya isi yang ada adalah isi yang tayang. */
    getVision(),
    /* Tanpa `includeDrafts` juga: kaki halaman tidak punya keadaan
       draft/live. Ia ikut setiap halaman, jadi satu-satunya isi yang ada
       adalah isi yang tayang. */
    getFooter(),
    /* Tanpa `includeDrafts`: judul seksi tidak punya keadaan draft/live.
       Seksi berjudul tanpa judul bukan draft, ia cacat. */
    listSectionTexts(),
  ]);

  const publicJobs: Job[] = jobRows.map(
    ({ updatedAt: _u, publishedAt: _p, unpublished: _n, ...job }) => job,
  );

  /* Kolom admin (`updatedAt`, `publishedAt`, `unpublished`) dibuang di sini,
     bukan dibiarkan ikut "karena tidak ada yang membacanya": `content.json`
     diunduh SETIAP pengunjung, dan bocornya jadwal sunting internal ke publik
     bukan sesuatu yang perlu terjadi demi tiga baris yang tidak dipakai. */
  const publicValues: Value[] = valueRows.map(
    ({ updatedAt: _u, publishedAt: _p, unpublished: _n, ...value }) => value,
  );

  const publicCrew: CrewMember[] = crewRows.map(
    ({ updatedAt: _u, publishedAt: _p, unpublished: _n, ...member }) => member,
  );

  const publicProjects: WorkProject[] = projectRows.map(
    ({ updatedAt: _u, publishedAt: _p, unpublished: _n, ...project }) =>
      project,
  );

  const publicCaseStudies: CaseStudy[] = studyRows.map(
    ({ updatedAt: _u, publishedAt: _p, unpublished: _n, ...study }) => study,
  );

  const publicServices: Service[] = serviceRows.map(
    ({ updatedAt: _u, publishedAt: _p, unpublished: _n, ...service }) =>
      service,
  );

  const publicTestimonials: Testimonial[] = testimonialRows.map(
    ({ updatedAt: _u, publishedAt: _p, unpublished: _n, ...testimonial }) =>
      testimonial,
  );

  const publicIndustries: Industry[] = industryRows.map(
    ({ updatedAt: _u, publishedAt: _p, unpublished: _n, ...industry }) =>
      industry,
  );

  const publicDeployments: Deployment[] = deploymentRows.map(
    ({ updatedAt: _u, publishedAt: _p, unpublished: _n, ...deployment }) =>
      deployment,
  );

  const publicProcessSteps: ProcessStep[] = processStepRows.map(
    ({ updatedAt: _u, publishedAt: _p, unpublished: _n, ...step }) => step,
  );

  /* `null` diteruskan apa adanya kalau barisnya belum ada — situs tahu
     artinya "pakai isi bundle". Lihat catatan di `shared/content.ts`. */
  const publicVision: Vision | null = visionRow
    ? { statement: visionRow.statement, photo: visionRow.photo }
    : null;

  /* `null` diteruskan apa adanya kalau barisnya belum ada, sama seperti visi —
     situs tahu artinya "pakai isi bundle". */
  const publicFooter: Footer | null = footerRow
    ? {
        email: footerRow.email,
        address: footerRow.address,
        copyright: footerRow.copyright,
        socials: footerRow.socials,
      }
    : null;

  /* `id` ikut dibuang bersama kolom admin: ia lahir cuma supaya riwayat
     punya `entity_id` bertipe uuid, dan situs mengalamati seksi lewat `key`. */
  const publicSectionTexts: SectionText[] = sectionTextRows.map(
    ({ id: _i, updatedAt: _u, publishedAt: _p, unpublished: _n, ...teks }) => teks,
  );

  return {
    version: CONTENT_VERSION,
    generatedAt: new Date().toISOString(),
    jobs: publicJobs,
    values: publicValues,
    crew: publicCrew,
    projects: publicProjects,
    caseStudies: publicCaseStudies,
    services: publicServices,
    testimonials: publicTestimonials,
    industries: publicIndustries,
    deployments: publicDeployments,
    processSteps: publicProcessSteps,
    vision: publicVision,
    footer: publicFooter,
    sectionTexts: publicSectionTexts,
  };
}

/**
 * Tulis atomik: berkas sementara di direktori yang sama, lalu `rename`.
 *
 * `rename` di dalam satu filesystem bersifat atomik di tingkat OS — pembaca
 * melihat berkas lama ATAU berkas baru, tidak pernah setengahnya. Menulis
 * langsung ke `content.json` membuka jendela beberapa milidetik di mana
 * pengunjung yang kebetulan memuat halaman saat itu menerima JSON terpotong,
 * dan situsnya jatuh ke fallback tanpa ada yang tahu kenapa.
 */
async function writeAtomic(payload: ContentPayload): Promise<void> {
  await mkdir(path.dirname(CONTENT_PATH), { recursive: true });
  const temp = `${CONTENT_PATH}.tmp-${process.pid}`;
  await writeFile(temp, JSON.stringify(payload), "utf8");
  await rename(temp, CONTENT_PATH);
}

/**
 * Minta Cloudflare melupakan salinan lamanya.
 *
 * Tanpa ini, `content.json` yang sudah di-cache di edge tetap disajikan sampai
 * kedaluwarsa, dan editor melihat perubahannya "tidak muncul" padahal berkasnya
 * sudah benar di server — keluhan yang sangat mahal untuk dilacak.
 *
 * Gagal purge TIDAK menggagalkan publish: berkasnya sudah tertulis, dan
 * memutar balik keadaan itu justru lebih buruk daripada cache yang basi
 * beberapa menit. Hasilnya dilaporkan supaya admin bisa menampilkannya.
 */
async function purgeCloudflare(): Promise<string | null> {
  const { zoneId, purgeToken } = env.cloudflare;
  if (!zoneId || !purgeToken) return null;

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${purgeToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          files: [
            "https://cogniti.id/content.json",
            "https://www.cogniti.id/content.json",
          ],
        }),
      },
    );
    if (!res.ok) return `Cache Cloudflare gagal dibersihkan (${res.status}).`;
    return null;
  } catch {
    return "Cache Cloudflare gagal dihubungi.";
  }
}

export type PublishResult = {
  jobs: number;
  values: number;
  crew: number;
  projects: number;
  caseStudies: number;
  services: number;
  testimonials: number;
  industries: number;
  deployments: number;
  processSteps: number;
  /** Bukan cacah baris seperti tetangganya — visi selalu tepat satu. Yang
   *  dilaporkan: apakah isinya datang dari CMS, atau situs masih memakai
   *  cadangan bundle karena barisnya belum ada. */
  vision: boolean;
  /** Sama seperti `vision`, dan bukan cacah baris: kaki halaman selalu tepat
   *  satu. Yang dilaporkan apakah isinya datang dari CMS, atau situs masih
   *  memakai cadangan bundle karena barisnya belum ada. */
  footer: boolean;
  /** Cacah baris lagi seperti tetangga di atas visi, bukan boolean: seksi
   *  berjudul memang sebelas, dan angka yang kurang dari itu adalah kabar
   *  berguna (seed belum lengkap, sebagian seksi masih pakai judul cadangan). */
  sectionTexts: number;
  generatedAt: string;
  warning: string | null;
};

export async function publish(actor: Actor): Promise<PublishResult> {
  const payload = await collect();
  await writeAtomic(payload);

  /* Tandai SESUDAH berkasnya benar-benar tertulis. Menandai lebih dulu lalu
     gagal menulis akan membuat badge "belum terpublish" padam untuk perubahan yang
     sebenarnya tidak pernah tayang.

     TERMASUK baris yang sudah dihapus, dan itu bukan kelalaian: penghapusan
     JUGA sebuah perubahan yang menunggu tayang, dan `content.json` yang barusan
     ditulis sudah tidak memuatnya lagi. Dulu klausa `isNull(deletedAt)` di sini
     membuat baris terhapus tidak pernah bisa ditandai — badge-nya menghitung
     penghapusan yang sudah lama tayang, selamanya, dan angkanya cuma bisa naik. */
  const now = dbNow();
  await db.update(jobs).set({ publishedAt: now });
  await db.update(peopleValues).set({ publishedAt: now });
  await db.update(crewMembers).set({ publishedAt: now });
  await db.update(workProjects).set({ publishedAt: now });
  await db.update(caseStudies).set({ publishedAt: now });
  await db.update(services).set({ publishedAt: now });
  await db.update(testimonials).set({ publishedAt: now });
  await db.update(industries).set({ publishedAt: now });
  await db.update(deployments).set({ publishedAt: now });
  await db.update(processSteps).set({ publishedAt: now });
  /* Tanpa `where`: tabelnya memang cuma boleh punya satu baris, dijaga
     CHECK `vision_satu_baris`. Kalau barisnya belum ada, ini tidak
     menyentuh apa pun dan itu jawaban yang benar. */
  await db.update(vision).set({ publishedAt: now });
  /* Tanpa `where` juga, alasan sama: dijaga CHECK `footer_satu_baris`. */
  await db.update(footer).set({ publishedAt: now });
  /* Tanpa `where` juga, tapi alasannya beda: barisnya sebelas, dan publish
     memang menayangkan kesebelasnya sekaligus. */
  await db.update(sectionTexts).set({ publishedAt: now });

  const warning = await purgeCloudflare();

  await record({
    actor,
    entity: "content",
    action: "publish",
    snapshot: {
      jobs: payload.jobs.length,
      values: payload.values.length,
      crew: payload.crew.length,
      projects: payload.projects.length,
      caseStudies: payload.caseStudies.length,
      services: payload.services.length,
      testimonials: payload.testimonials.length,
      industries: payload.industries.length,
      deployments: payload.deployments.length,
      processSteps: payload.processSteps.length,
      vision: payload.vision !== null,
      footer: payload.footer !== null,
      sectionTexts: payload.sectionTexts.length,
      generatedAt: payload.generatedAt,
    },
  });

  return {
    jobs: payload.jobs.length,
    values: payload.values.length,
    crew: payload.crew.length,
    projects: payload.projects.length,
    caseStudies: payload.caseStudies.length,
    services: payload.services.length,
    testimonials: payload.testimonials.length,
    industries: payload.industries.length,
    deployments: payload.deployments.length,
    processSteps: payload.processSteps.length,
    vision: payload.vision !== null,
    footer: payload.footer !== null,
    sectionTexts: payload.sectionTexts.length,
    generatedAt: payload.generatedAt,
    warning,
  };
}

/**
 * Apakah satu baris punya perubahan yang belum terpublish?
 *
 * Cukup tiga cap waktu, jadi aturannya sama untuk semua entitas dan ditulis
 * sekali di sini. Kalau tiap entitas menyalin aturan ini, perbaikan seperti
 * yang di bawah — penghapusan yang ikut dihitung — akan diperbaiki di satu
 * tempat dan tetap salah di tempat lain.
 */
type Stamps = {
  updatedAt: Date;
  publishedAt: Date | null;
  deletedAt: Date | null;
};

function menunggu(r: Stamps): boolean {
  /**
   * Baris yang DIHAPUS ikut dihitung selama penghapusannya sendiri belum
   * tayang: isinya masih terlihat pengunjung sampai publish berikutnya. Tanpa
   * ini editor menghapus sesuatu, melihat badge tetap nol, dan menyimpulkan
   * tidak perlu menekan Publish — sementara yang dihapus masih tayang.
   *
   * Yang dibandingkan `deletedAt`, bukan sekadar "pernah tayang": begitu
   * publish berikutnya jalan, baris ini sudah lenyap dari `content.json` dan
   * tidak menunggu apa-apa lagi.
   */
  if (r.deletedAt) return r.publishedAt !== null && r.deletedAt > r.publishedAt;

  /* Draft tidak pernah ikut ke content.json, jadi mengubahnya bukan perubahan
     yang menunggu tayang — kecuali ia PERNAH tayang lalu dikembalikan jadi
     draft, dan itu tertangkap oleh `publishedAt`. */
  return !r.publishedAt || r.updatedAt > r.publishedAt;
}

/** Berapa banyak perubahan yang belum terpublish — angka di badge bar publish.
 *  Satu angka untuk SEMUA entitas: yang ditanyakan editor adalah "apa masih
 *  ada yang perlu saya publish", bukan "berapa di tabel mana". */
export async function pendingCount(): Promise<number> {
  const [
    jobRows,
    valueRows,
    crewRows,
    projectRows,
    studyRows,
    serviceRows,
    testimonialRows,
    industryRows,
    deploymentRows,
    processStepRows,
    visionRows,
    footerRows,
    sectionTextRows,
  ] = await Promise.all([
    db
      .select({
        updatedAt: jobs.updatedAt,
        publishedAt: jobs.publishedAt,
        deletedAt: jobs.deletedAt,
      })
      .from(jobs),
    db
      .select({
        updatedAt: peopleValues.updatedAt,
        publishedAt: peopleValues.publishedAt,
        deletedAt: peopleValues.deletedAt,
      })
      .from(peopleValues),
    db
      .select({
        updatedAt: crewMembers.updatedAt,
        publishedAt: crewMembers.publishedAt,
        deletedAt: crewMembers.deletedAt,
      })
      .from(crewMembers),
    db
      .select({
        updatedAt: workProjects.updatedAt,
        publishedAt: workProjects.publishedAt,
        deletedAt: workProjects.deletedAt,
      })
      .from(workProjects),
    db
      .select({
        updatedAt: caseStudies.updatedAt,
        publishedAt: caseStudies.publishedAt,
        deletedAt: caseStudies.deletedAt,
      })
      .from(caseStudies),
    db
      .select({
        updatedAt: services.updatedAt,
        publishedAt: services.publishedAt,
        deletedAt: services.deletedAt,
      })
      .from(services),
    db
      .select({
        updatedAt: testimonials.updatedAt,
        publishedAt: testimonials.publishedAt,
        deletedAt: testimonials.deletedAt,
      })
      .from(testimonials),
    db
      .select({
        updatedAt: industries.updatedAt,
        publishedAt: industries.publishedAt,
        deletedAt: industries.deletedAt,
      })
      .from(industries),
    db
      .select({
        updatedAt: deployments.updatedAt,
        publishedAt: deployments.publishedAt,
        deletedAt: deployments.deletedAt,
      })
      .from(deployments),
    db
      .select({
        updatedAt: processSteps.updatedAt,
        publishedAt: processSteps.publishedAt,
        deletedAt: processSteps.deletedAt,
      })
      .from(processSteps),
    /**
     * `deletedAt: null` dipetakan tetap, karena tabelnya memang tidak punya
     * kolomnya — seksi Visi tidak bisa dihapus, `pt-20 pb-20` miliknya
     * satu-satunya yang menjatah celah 80px antara plank Industries dan
     * Contact di mobile.
     *
     * Ditulis di sini alih-alih melonggarkan `Stamps` jadi opsional: `menunggu`
     * berhak menuntut ketiga cap waktunya disebut, supaya entitas berikutnya
     * yang PUNYA `deletedAt` tidak bisa lupa mengirimkannya dan diam-diam
     * berhenti menghitung penghapusan.
     */
    db
      .select({
        updatedAt: vision.updatedAt,
        publishedAt: vision.publishedAt,
      })
      .from(vision)
      .then((rows) => rows.map((r) => ({ ...r, deletedAt: null }))),
    /* `deletedAt: null` dipetakan tetap juga — kaki halaman tidak punya
       kolomnya, dengan alasan yang sama seperti visi: tidak ada jalur hapus.

       ⚠️ Tautan sosialnya TIDAK ikut dihitung terpisah, dan itu bukan lubang:
       `saveFooter()` menaikkan `updatedAt` baris induk di dalam transaksi yang
       sama, jadi menambah atau menghapus tautan sudah tercermin di satu cap
       waktu ini. Tabel `footer_socials` sendiri memang tidak punya cap
       waktu. */
    db
      .select({
        updatedAt: footer.updatedAt,
        publishedAt: footer.publishedAt,
      })
      .from(footer)
      .then((rows) => rows.map((r) => ({ ...r, deletedAt: null }))),
    /* `deletedAt: null` dipetakan tetap, alasan sama seperti visi dan kaki
       halaman: tabel ini tidak punya kolomnya karena tidak ada jalur hapus. */
    db
      .select({
        updatedAt: sectionTexts.updatedAt,
        publishedAt: sectionTexts.publishedAt,
      })
      .from(sectionTexts)
      .then((rows) => rows.map((r) => ({ ...r, deletedAt: null }))),
  ]);

  return [
    ...jobRows,
    ...valueRows,
    ...crewRows,
    ...projectRows,
    ...studyRows,
    ...serviceRows,
    ...testimonialRows,
    ...industryRows,
    ...deploymentRows,
    ...processStepRows,
    ...visionRows,
    ...footerRows,
    ...sectionTextRows,
  ].filter(menunggu).length;
}
