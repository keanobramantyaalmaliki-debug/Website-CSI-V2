/**
 * Konten dari CMS — diambil sekali, sebelum React merender apa pun.
 *
 * Bentuknya sengaja SINKRON (`contentJobs()` mengembalikan nilai, bukan
 * Promise). Konten lowongan dibaca lewat pemanggilan biasa di banyak berkas
 * (`Navbar`, `CareersRoles`, rute `/careers/:slug`), dan mengubahnya jadi
 * asinkron berarti membongkar semuanya jadi state + efek — perombakan besar
 * demi sesuatu yang sudah selesai sebelum frame pertama.
 *
 * Caranya: `main.tsx` memanggil `loadContent()` dan baru `createRoot().render()`
 * di dalam `.then()`-nya. Sesudah itu store-nya terisi, dan semua pembaca
 * sinkron aman — tidak ada satu pun yang membacanya saat modul dievaluasi.
 *
 * ⚠️ JARINGAN PENGAMAN — jangan dilepas.
 *
 * Kalau `content.json` tidak ada, rusak, atau lambat, situs memakai data yang
 * ikut ter-bundle (`src/data/*.ts`). Situs ini tidak boleh pernah bergantung
 * pada database yang hidup: CMS mati harus berarti "konten agak lama", bukan
 * "halaman kosong".
 */

import type { ContentPayload } from "@shared/content";
import { CONTENT_VERSION } from "@shared/content";
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
import type { Footer, FooterSocial } from "@shared/footer";

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

/**
 * Nilai dari CMS, atau `null` kalau harus memakai isi bundle.
 *
 * `values` diperiksa TERPISAH dari `jobs`, tidak ikut memvonis seluruh berkas
 * di `loadContent()`. Sebabnya arah kompatibilitas yang satunya: situs versi
 * baru bisa memuat `content.json` yang ditulis sebelum nilai masuk CMS, dan
 * berkas seperti itu sehat-sehat saja — cuma belum punya bagian ini. Menolak
 * seluruh berkasnya akan membuat lowongan ikut jatuh ke isi bundle demi satu
 * field yang belum ada.
 */
export function contentValues(): Value[] | null {
  const rows = content?.values;
  return Array.isArray(rows) ? rows : null;
}

/**
 * Crew dari CMS, atau `null` kalau harus memakai isi bundle.
 *
 * Diperiksa terpisah dengan alasan yang sama seperti `contentValues()` di
 * atas: `content.json` yang ditulis sebelum crew masuk CMS adalah berkas
 * sehat yang cuma belum punya bagian ini.
 *
 * Daftar KOSONG bukan `null` dan tidak jatuh ke cadangan. Editor yang
 * menghapus semua anggotanya harus melihat halaman yang kosong, bukan tiga
 * belas nama lama yang hidup kembali sesudah Publish tanpa cara menghapusnya.
 */
export function contentCrew(): CrewMember[] | null {
  const rows = content?.crew;
  return Array.isArray(rows) ? rows : null;
}

/**
 * Proyek "Selected Work" dari CMS, atau `null` kalau harus memakai isi bundle.
 *
 * Diperiksa terpisah dengan alasan yang sama seperti `contentValues()` dan
 * `contentCrew()`: `content.json` yang ditulis sebelum proyek masuk CMS adalah
 * berkas sehat yang cuma belum punya bagian ini.
 *
 * Daftar KOSONG dihormati apa adanya, bukan jatuh ke cadangan — dan di sini
 * konsekuensinya lebih besar daripada di crew: seksinya tidak merender apa pun,
 * jadi "Selected Work" hilang dari halaman Work. Itu memang yang diminta editor
 * yang menghapus semua proyeknya; yang tidak boleh terjadi adalah delapan kartu
 * lama hidup kembali sesudah Publish tanpa cara menghapusnya.
 */
export function contentWorkProjects(): WorkProject[] | null {
  const rows = content?.projects;
  return Array.isArray(rows) ? rows : null;
}

/**
 * Cerita "Case Studies" dari CMS, atau `null` kalau harus memakai isi bundle.
 *
 * Diperiksa terpisah dengan alasan yang sama seperti pembaca-pembaca di atas:
 * `content.json` yang ditulis sebelum case study masuk CMS adalah berkas sehat
 * yang cuma belum punya bagian ini.
 *
 * Daftar KOSONG dihormati apa adanya — seksi "Case Studies" lalu tidak dirender
 * sama sekali di halaman Work, dan itu memang yang diminta editor yang
 * menghapus semua ceritanya.
 */
export function contentCaseStudies(): CaseStudy[] | null {
  const rows = content?.caseStudies;
  return Array.isArray(rows) ? rows : null;
}

/**
 * Daftar layanan halaman Services dari CMS, atau `null` kalau harus memakai isi
 * bundle.
 *
 * Diperiksa terpisah dengan alasan yang sama seperti pembaca-pembaca di atas:
 * `content.json` yang ditulis sebelum layanan masuk CMS adalah berkas sehat
 * yang cuma belum punya bagian ini.
 *
 * Daftar KOSONG dihormati apa adanya — sabuk 3D berikut daftar sr-only-nya lalu
 * tidak dirender sama sekali, dan itu memang yang diminta editor yang menghapus
 * semua layanannya. Yang tidak boleh terjadi adalah sembilan layanan lama hidup
 * kembali sesudah Publish tanpa cara menghapusnya.
 */
export function contentServices(): Service[] | null {
  const rows = content?.services;
  return Array.isArray(rows) ? rows : null;
}

/**
 * Kutipan klien halaman Services dari CMS, atau `null` kalau harus memakai isi
 * bundle.
 *
 * Diperiksa terpisah dengan alasan yang sama seperti pembaca-pembaca di atas:
 * `content.json` yang ditulis sebelum testimoni masuk CMS adalah berkas sehat
 * yang cuma belum punya bagian ini.
 *
 * Daftar KOSONG dihormati apa adanya — blok testimoni lalu tidak dirender sama
 * sekali di dasar halaman Services, dan itu memang yang diminta editor yang
 * menghapus semua kutipannya.
 */
export function contentTestimonials(): Testimonial[] | null {
  const rows = content?.testimonials;
  return Array.isArray(rows) ? rows : null;
}

/**
 * Sektor "Built Across Sectors" halaman depan dari CMS, atau `null` kalau harus
 * memakai isi bundle.
 *
 * Diperiksa terpisah dengan alasan yang sama seperti pembaca-pembaca di atas:
 * `content.json` yang ditulis sebelum sektor masuk CMS adalah berkas sehat yang
 * cuma belum punya bagian ini.
 *
 * Daftar KOSONG dihormati apa adanya — strip industri lalu tidak dirender sama
 * sekali. Yang menanganinya `Industries.tsx`, dan itu bukan sekadar `if` sopan:
 * tumpukan 3D-nya menghitung posisi dari `industries.length`, dan nol plank
 * membuat navigasi sentuhnya membaca `industries[navIndex]` yang tidak ada.
 */
export function contentIndustries(): Industry[] | null {
  const rows = content?.industries;
  return Array.isArray(rows) ? rows : null;
}

/**
 * Kartu "Built for real-world environments…" halaman depan dari CMS, atau
 * `null` kalau harus memakai isi bundle.
 *
 * Diperiksa terpisah dengan alasan yang sama seperti pembaca-pembaca di atas:
 * `content.json` yang ditulis sebelum deployment masuk CMS adalah berkas sehat
 * yang cuma belum punya bagian ini.
 *
 * Daftar KOSONG dihormati apa adanya — seluruh section lalu tidak dirender
 * sama sekali, judul dan kartu ajakan kontaknya sekalian. Yang menanganinya
 * `Deployments.tsx`.
 *
 * Menghilang seluruhnya AMAN untuk jarak mobile, dan itu perlu diperiksa
 * sebelum diputuskan: section ini `pt-0 pb-20`, tetangga atasnya CsiHero
 * `pb-20`, tetangga bawahnya Process `pt-0`. Begitu ia hilang, `pb-20` CsiHero
 * bertemu `pt-0` Process dan celahnya tetap 80px. Bandingkan dengan seksi Visi
 * di bawah, yang justru tidak boleh hilang karena celahnya cuma dijatah dari
 * satu tempat.
 */
export function contentDeployments(): Deployment[] | null {
  const rows = content?.deployments;
  return Array.isArray(rows) ? rows : null;
}

/**
 * Langkah "How We Work" dari CMS, atau `null` kalau harus memakai isi bundle.
 *
 * Diperiksa terpisah dengan alasan yang sama seperti pembaca-pembaca di atas:
 * `content.json` yang ditulis sebelum entitas ini ada tetap sah, bagian inilah
 * yang belum ada di dalamnya — jadi yang jatuh ke bundle cuma seksi ini, bukan
 * seluruh situs.
 *
 * Daftar KOSONG dihormati apa adanya — seluruh section lalu tidak dirender
 * sama sekali, judul, tali SVG, dan landasan ekornya sekalian. Yang
 * menanganinya `Process.tsx`.
 *
 * Menghilang seluruhnya AMAN untuk jarak mobile, dan itu perlu diperiksa
 * sebelum diputuskan: section ini `pt-0 sm:pt-32` tanpa `pb` sama sekali,
 * jadi ia tidak menjatah celah apa pun. Yang menjatah 80px ke tetangga
 * bawahnya (Industries) adalah `pb-20` milik Deployments di atasnya, dan itu
 * tetap berlaku persis sama saat seksi ini tidak ada. Bandingkan dengan seksi
 * Visi di bawah, yang justru tidak boleh hilang karena celahnya cuma dijatah
 * dari satu tempat.
 */
export function contentProcessSteps(): ProcessStep[] | null {
  const rows = content?.processSteps;
  return Array.isArray(rows) ? rows : null;
}

/**
 * Seksi Visi dari CMS, atau `null` kalau harus memakai isi bundle.
 *
 * Diperiksa terpisah dengan alasan yang sama seperti pembaca-pembaca di atas:
 * `content.json` yang ditulis sebelum visi masuk CMS adalah berkas sehat yang
 * cuma belum punya bagian ini.
 *
 * ‼️ SATU-SATUNYA pembaca di berkas ini yang TIDAK punya keadaan "kosong yang
 * dihormati".
 *
 * Di daftar, kosong berarti seksinya tidak dirender, dan itu memang yang
 * diminta editor yang menghapus semua isinya. Seksi Visi tidak punya jalan ke
 * sana: `pt-20 pb-20` miliknya satu-satunya yang menjatah celah 80px antara
 * plank Industries (tanpa `pb`) dan Contact (`pt-0`) di mobile, jadi ia selalu
 * dirender. Isian kosong ditangani `src/data/vision.ts` per isian — kalimat
 * kosong memakai kalimat cadangan, foto kosong memakai foto cadangan.
 *
 * Bentuknya juga bukan larik, jadi penjaganya `typeof … === "object"` dan
 * bukan `Array.isArray`. `null` yang ditulis publish (barisnya belum ada di
 * database) lolos lewat jalur yang sama dengan field yang belum ada sama
 * sekali, dan itu memang jawaban yang sama.
 */
export function contentVision(): Vision | null {
  const row = content?.vision;
  if (!row || typeof row !== "object") return null;
  if (typeof row.statement !== "string" || typeof row.photo !== "string") {
    return null;
  }
  return row;
}

/**
 * Isi kaki halaman dari CMS, atau `null` kalau harus memakai isi bundle.
 *
 * Penjaganya paling teliti di berkas ini, dan itu bukan kelebihan hati-hati:
 * `socials` satu-satunya bagian `content.json` yang berupa larik OBJEK yang
 * langsung disebar jadi elemen `<a href>`. Satu `href` yang ternyata angka
 * membuat React merender `href="3"` — tautan yang mengarah ke halaman
 * cogniti.id/3, tanpa satu pun galat.
 *
 * ‼️ Larik `socials` KOSONG dihormati, beda dari isian teks di sebelahnya.
 * Editor yang menghapus semua tautannya memang minta kaki halaman tanpa baris
 * tautan; menjatuhkannya ke cadangan bundle akan menghidupkan lagi tautan yang
 * baru saja dihapus. Isian teks yang kosong TIDAK begitu — itu ditangani
 * `src/data/footer.ts` per isian, karena kaki halaman tanpa hak cipta cuma
 * terlihat seperti halaman yang belum selesai dimuat.
 */
export function contentFooter(): Footer | null {
  const row = content?.footer;
  if (!row || typeof row !== "object") return null;
  if (
    typeof row.email !== "string" ||
    typeof row.address !== "string" ||
    typeof row.copyright !== "string"
  ) {
    return null;
  }
  if (!Array.isArray(row.socials)) return null;

  const socials: FooterSocial[] = [];
  for (const item of row.socials) {
    /* Baris yang bentuknya salah DIBUANG, bukan menggugurkan seluruh kaki
       halaman. Satu tautan rusak tidak sebanding dengan alamat kantor dan
       hak cipta yang ikut mundur ke isi bundle. */
    if (!item || typeof item !== "object") continue;
    if (typeof item.label !== "string" || typeof item.href !== "string") continue;
    socials.push({ label: item.label, href: item.href });
  }

  return { ...row, socials };
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
