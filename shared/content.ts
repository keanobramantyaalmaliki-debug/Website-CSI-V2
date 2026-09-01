/**
 * Isi `content.json` — satu-satunya berkas yang dibaca situs publik.
 *
 * Berdiri sendiri, bukan menumpang di `shared/job.ts`, karena isinya bukan
 * milik satu entitas: lowongan cuma penghuni pertama, dan sembilan entitas
 * berikutnya akan menambah field di sini. Ditaruh di berkas lowongan, tiap
 * entitas baru memaksa satu berkas yang tidak ada hubungannya ikut disunting,
 * dan lama-lama `job.ts` jadi tempat semua orang bertemu.
 *
 * ⚠️ MENAMBAH field itu aman, MENGUBAH bentuk field yang sudah ada tidak.
 * Pengunjung bisa memegang HTML+JS lama yang ter-cache sementara
 * `content.json`-nya sudah versi baru; field baru yang tidak dikenal akan
 * diabaikan begitu saja, tapi field lama yang berubah bentuk akan dibaca
 * salah tanpa error. Untuk yang kedua itulah `version` dinaikkan — situs versi
 * lama lalu tahu harus jatuh ke data bawaan bundle-nya.
 *
 * Konsekuensi arah sebaliknya: situs versi BARU bisa membaca `content.json`
 * lama yang belum punya field-nya. Karena itu tiap pembaca di
 * `src/lib/content/store.ts` memeriksa sendiri apakah bagiannya ada, dan
 * jatuh ke isi bundle kalau belum — bukan menganggap seluruh berkasnya rusak.
 */

import type { Job } from "./job";
import type { CrewMember } from "./crew";
import type { Value } from "./value";
import type { WorkProject } from "./workProject";
import type { CaseStudy } from "./caseStudy";

export type ContentPayload = {
  version: 1;
  /** ISO 8601, untuk ditampilkan di admin sebagai "terakhir dipublish". */
  generatedAt: string;
  jobs: Job[];
  /** Nilai yang `live` saja, sudah urut sesuai `sortOrder`. */
  values: Value[];
  /** Anggota crew yang `live` saja. Urutannya departemen lalu nama, tapi situs
   *  TIDAK bergantung padanya — `TheCrew.tsx` mengelompokkan dan mengurutkan
   *  A–Z sendiri, karena "A-Z" itu tercetak sebagai judul kolom di halaman. */
  crew: CrewMember[];
  /** Proyek "Selected Work" yang `live` saja, sudah urut sesuai `sortOrder` —
   *  dan di sini situs BENAR-BENAR bergantung pada urutannya: yang pertama
   *  adalah kartu yang terbuka saat halaman Work dibuka. */
  projects: WorkProject[];
  /** Cerita "Case Studies" yang `live` saja, sudah urut sesuai `sortOrder`.
   *  Tetangga `projects` di halaman yang sama, tapi entitas yang berbeda:
   *  yang itu daftar kartu, yang ini bacaan. */
  caseStudies: CaseStudy[];
};

export const CONTENT_VERSION = 1 as const;
