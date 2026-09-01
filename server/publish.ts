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
import { CONTENT_VERSION, type ContentPayload, type Job } from "@shared/job";

import { record, type Actor } from "./audit";
import { db } from "./db/client";
import { jobs } from "./db/schema";
import { env } from "./env";
import { listJobs } from "./jobsRepo";

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
  const rows = await listJobs({ includeDrafts: false });

  const publicJobs: Job[] = rows.map(
    ({ updatedAt: _u, publishedAt: _p, unpublished: _n, ...job }) => job,
  );

  return {
    version: CONTENT_VERSION,
    generatedAt: new Date().toISOString(),
    jobs: publicJobs,
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
  await db.update(jobs).set({ publishedAt: new Date() });

  const warning = await purgeCloudflare();

  await record({
    actor,
    entity: "content",
    action: "publish",
    snapshot: { jobs: payload.jobs.length, generatedAt: payload.generatedAt },
  });

  return {
    jobs: payload.jobs.length,
    generatedAt: payload.generatedAt,
    warning,
  };
}

/** Berapa banyak perubahan yang belum tayang — angka di badge bar publish. */
export async function pendingCount(): Promise<number> {
  const rows = await db
    .select({
      updatedAt: jobs.updatedAt,
      publishedAt: jobs.publishedAt,
      deletedAt: jobs.deletedAt,
    })
    .from(jobs);

  return rows.filter((r) => {
    /**
     * Lowongan yang DIHAPUS ikut dihitung selama penghapusannya sendiri belum
     * tayang: barisnya masih terlihat pengunjung sampai publish berikutnya.
     * Tanpa ini editor menghapus lowongan, melihat badge tetap nol, dan
     * menyimpulkan tidak perlu menekan Publish — sementara lowongan yang sudah
     * ditutup masih menerima lamaran.
     *
     * Yang dibandingkan adalah `deletedAt`, bukan sekadar "pernah tayang":
     * begitu publish berikutnya jalan, baris ini sudah lenyap dari
     * `content.json` dan tidak menunggu apa-apa lagi.
     */
    if (r.deletedAt) return r.publishedAt !== null && r.deletedAt > r.publishedAt;

    /* Draft tidak pernah ikut ke content.json, jadi mengubahnya bukan
       perubahan yang menunggu tayang — kecuali ia PERNAH tayang lalu
       dikembalikan jadi draft, dan itu tertangkap oleh `publishedAt`. */
    return !r.publishedAt || r.updatedAt > r.publishedAt;
  }).length;
}
