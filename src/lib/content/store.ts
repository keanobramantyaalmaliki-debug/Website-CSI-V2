/**
 * Konten dari CMS — diambil sekali, sebelum React merender apa pun.
 *
 * Bentuknya sengaja SINKRON (`getContent()` mengembalikan nilai, bukan
 * Promise). Konten lowongan dibaca di module scope oleh beberapa berkas
 * (`Navbar`, `SiteLayout`), dan mengubahnya jadi asinkron berarti membongkar
 * semuanya jadi state + efek — perombakan besar demi sesuatu yang sudah selesai
 * sebelum frame pertama.
 *
 * Caranya: `loadContent()` dipanggil di `main.tsx` dan DITUNGGU sebelum
 * `createRoot().render()`. Sesudah itu store-nya terisi, dan semua pembaca
 * sinkron aman.
 *
 * ⚠️ JARINGAN PENGAMAN — jangan dilepas.
 *
 * Kalau `content.json` tidak ada, rusak, atau lambat, situs memakai data yang
 * ikut ter-bundle (`src/data/*.ts`). Situs ini tidak boleh pernah bergantung
 * pada database yang hidup: CMS mati harus berarti "konten agak lama", bukan
 * "halaman kosong".
 */

import type { ContentPayload, Job } from "@shared/job";
import { CONTENT_VERSION } from "@shared/job";

/**
 * Batas tunggu.
 *
 * Berkasnya statis dan sejalur dengan HTML-nya, jadi dalam keadaan normal
 * selesai dalam puluhan milidetik. 1,5 detik adalah batas "ada yang tidak
 * beres" — dan menunggu lebih lama tidak menolong siapa pun, karena isi
 * cadangannya sudah ada di bundle sejak awal.
 */
const TIMEOUT_MS = 1500;

let content: ContentPayload | null = null;
let loaded = false;

/** Kenapa isi cadangan yang dipakai — muncul di konsol, sekali, saat memang
 *  ada yang salah. Bukan `console.error`: ini keadaan yang SUDAH ditangani. */
function fallback(reason: string): null {
  console.warn(
    `[content] memakai konten bawaan bundle — ${reason}`,
  );
  return null;
}

export async function loadContent(): Promise<void> {
  if (loaded) return;
  loaded = true;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("/content.json", {
      signal: controller.signal,
      /* Selalu tanya server. Berkas ini berubah tiap kali editor menekan
         Publish, dan salinan cache peramban akan membuat perubahan itu
         "tidak muncul" secara acak per pengunjung. Kesegarannya diurus
         Cache-Control + purge Cloudflare di sisi server. */
      cache: "no-cache",
    });
    if (!res.ok) return void fallback(`server membalas ${res.status}`);

    const data = (await res.json()) as ContentPayload;

    /**
     * Versi diperiksa, bukan dipercaya.
     *
     * Pengunjung bisa memegang HTML+JS lama yang ter-cache sementara
     * `content.json`-nya sudah versi baru. Membacanya apa adanya akan
     * menghasilkan halaman yang salah bentuk tanpa error; menolaknya
     * menghasilkan halaman yang benar tapi agak lama.
     */
    if (data?.version !== CONTENT_VERSION || !Array.isArray(data.jobs)) {
      return void fallback("bentuk content.json tidak dikenali");
    }

    content = data;
  } catch (error) {
    fallback(
      error instanceof DOMException && error.name === "AbortError"
        ? "melewati batas waktu"
        : "tidak bisa diambil",
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Lowongan dari CMS, atau `null` kalau harus memakai isi bundle. */
export function contentJobs(): Job[] | null {
  return content?.jobs ?? null;
}

/** Kapan konten ini dipublish — dipakai test dan pemeriksaan manual. */
export function contentGeneratedAt(): string | null {
  return content?.generatedAt ?? null;
}

/** Hanya untuk test: kembalikan store ke keadaan kosong. */
export function __resetContent(): void {
  content = null;
  loaded = false;
}

/** Hanya untuk test: pasang konten tanpa lewat jaringan. */
export function __setContent(payload: ContentPayload | null): void {
  content = payload;
  loaded = true;
}
