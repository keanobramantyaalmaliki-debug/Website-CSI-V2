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

import { record, type Actor } from "./audit";
import { db } from "./db/client";
import {
  caseStudies,
  crewMembers,
  jobs,
  peopleValues,
  workProjects,
} from "./db/schema";
import { env } from "./env";
import { listCrew } from "./crewRepo";
import { listJobs } from "./jobsRepo";
import { listValues } from "./valuesRepo";
import { listWorkProjects } from "./workProjectsRepo";
import { listCaseStudies } from "./caseStudiesRepo";

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
  const [jobRows, valueRows, crewRows, projectRows, studyRows] =
    await Promise.all([
      listJobs({ includeDrafts: false }),
      listValues({ includeDrafts: false }),
      listCrew({ includeDrafts: false }),
      listWorkProjects({ includeDrafts: false }),
      listCaseStudies({ includeDrafts: false }),
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

  return {
    version: CONTENT_VERSION,
    generatedAt: new Date().toISOString(),
    jobs: publicJobs,
    values: publicValues,
    crew: publicCrew,
    projects: publicProjects,
    caseStudies: publicCaseStudies,
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
  generatedAt: string;
  warning: string | null;
};

export async function publish(actor: Actor): Promise<PublishResult> {
  const payload = await collect();
  await writeAtomic(payload);

  /* Tandai SESUDAH berkasnya benar-benar tertulis. Menandai lebih dulu lalu
     gagal menulis akan membuat badge "belum tayang" padam untuk perubahan yang
     sebenarnya tidak pernah tayang.

     TERMASUK baris yang sudah dihapus, dan itu bukan kelalaian: penghapusan
     JUGA sebuah perubahan yang menunggu tayang, dan `content.json` yang barusan
     ditulis sudah tidak memuatnya lagi. Dulu klausa `isNull(deletedAt)` di sini
     membuat baris terhapus tidak pernah bisa ditandai — badge-nya menghitung
     penghapusan yang sudah lama tayang, selamanya, dan angkanya cuma bisa naik. */
  const now = new Date();
  await db.update(jobs).set({ publishedAt: now });
  await db.update(peopleValues).set({ publishedAt: now });
  await db.update(crewMembers).set({ publishedAt: now });
  await db.update(workProjects).set({ publishedAt: now });
  await db.update(caseStudies).set({ publishedAt: now });

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
      generatedAt: payload.generatedAt,
    },
  });

  return {
    jobs: payload.jobs.length,
    values: payload.values.length,
    crew: payload.crew.length,
    projects: payload.projects.length,
    caseStudies: payload.caseStudies.length,
    generatedAt: payload.generatedAt,
    warning,
  };
}

/**
 * Apakah satu baris punya perubahan yang belum tayang?
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

/** Berapa banyak perubahan yang belum tayang — angka di badge bar publish.
 *  Satu angka untuk SEMUA entitas: yang ditanyakan editor adalah "apa masih
 *  ada yang perlu saya publish", bukan "berapa di tabel mana". */
export async function pendingCount(): Promise<number> {
  const [jobRows, valueRows, crewRows, projectRows, studyRows] =
    await Promise.all([
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
    ]);

  return [
    ...jobRows,
    ...valueRows,
    ...crewRows,
    ...projectRows,
    ...studyRows,
  ].filter(menunggu).length;
}
