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
import type { Testimonial } from "./testimonial";
import type { Service } from "./service";
import type { Industry } from "./industry";
import type { Deployment } from "./deployment";
import type { ProcessStep } from "./processStep";
import type { Vision } from "./vision";
import type { Footer } from "./footer";

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
  /** Layanan halaman Services yang `live` saja, sudah urut sesuai
   *  `sortOrder`. Situs bergantung pada urutannya lewat jalur yang tidak
   *  terlihat: sabuk 3D-nya melingkar tanpa awal, tapi daftar `sr-only` di
   *  bawahnya dibaca lurus dari atas ke bawah oleh pembaca layar dan mesin
   *  pencari. */
  services: Service[];
  /** Kutipan klien di dasar halaman Services yang `live` saja, sudah urut
   *  sesuai `sortOrder` — dan situs bergantung pada urutannya: yang pertama
   *  adalah kutipan yang TERLIHAT saat halaman dibuka, sisanya baru muncul
   *  kalau pengunjung menekan panah. */
  testimonials: Testimonial[];
  /**
   * Sektor "Built Across Sectors" di halaman depan yang `live` saja, sudah
   * urut sesuai `sortOrder`.
   *
   * Situs bergantung pada urutannya lewat DUA jalur sekaligus, dan itu bukan
   * kebetulan: urutan menentukan anak tangga spiral mana yang ditempati sebuah
   * sektor, sekaligus nomor "01"–"13" yang tercetak di HUD, navigasi sentuh,
   * dan kepala kartu fokus.
   *
   * Panjangnya PALING BANYAK 13 (`MAX_LIVE_INDUSTRIES`) — batas geometri
   * tumpukan 3D-nya, ditegakkan `routes/industries.ts` jauh sebelum sampai ke
   * sini. Kurang dari itu aman berapa pun, sampai kosong.
   */
  industries: Industry[];
  /**
   * Kartu "Built for real-world environments…" di halaman depan yang `live`
   * saja, sudah urut sesuai `sortOrder`.
   *
   * Situs bergantung pada urutannya lewat dua jalur sekaligus, sama seperti
   * `industries`: grid CSS merender persis urutan larik ini, dan urutan itu
   * juga menentukan nomor "01"–"05" yang tercetak di baris meta tiap kartu.
   *
   * Tidak ada batas panjang. Grid-nya tinggal menambah baris ke bawah, jadi
   * kartu ke-empat belas tidak merusak apa pun — beda dari `industries` yang
   * dibatasi geometri tumpukan 3D-nya.
   */
  deployments: Deployment[];
  /**
   * Langkah "How We Work" di halaman depan yang `live` saja, sudah urut sesuai
   * `sortOrder`.
   *
   * Urutannya paling menentukan dari semua field di sini, dan bukan karena
   * tata letak: larik ini DIBACA sebagai kalimat. "Discovery" sebelum "Design"
   * sebelum "Deployment" adalah isi yang disampaikan seksinya; larik yang
   * tertukar bukan kartu yang salah tempat melainkan cerita yang salah. Ia
   * sekaligus menentukan nomor "01"–"06" di pojok kartu dan sisi kiri/kanan
   * berselang-seling yang membuat tali SVG-nya terbaca zig-zag.
   *
   * Panjangnya PALING BANYAK 6 (`MAX_LIVE_PROCESS_STEPS`), ditegakkan
   * `routes/processSteps.ts` jauh sebelum sampai ke sini. Beda dari batas 13
   * `industries` yang lahir dari geometri, yang ini menjaga panjang halaman —
   * dan seperti di sana, kurang dari itu aman berapa pun sampai kosong.
   */
  processSteps: ProcessStep[];
  /**
   * Seksi Visi di halaman depan. SATU objek, bukan larik — dan satu-satunya
   * field di sini yang bisa bernilai `null`.
   *
   * `null` artinya "belum ada barisnya di database", bukan "editor
   * mengosongkannya": beda dari daftar, seksi Visi tidak punya keadaan
   * menghilang, karena `pt-20 pb-20` miliknya satu-satunya yang menjatah celah
   * 80px antara plank Industries dan Contact di mobile. Situs memperlakukan
   * `null` persis seperti bagian yang belum ada di `content.json` lama — jatuh
   * ke isi bundle-nya.
   */
  vision: Vision | null;
  /**
   * Isi kaki halaman. SATU objek seperti `vision`, dan field kedua yang bisa
   * bernilai `null`.
   *
   * `null` artinya "belum ada barisnya di database", bukan "editor
   * mengosongkannya". Kaki halaman ikut SETIAP halaman situs, jadi ia tidak
   * punya keadaan menghilang — situs memperlakukan `null` persis seperti
   * bagian yang belum ada di `content.json` lama: jatuh ke isi bundle-nya.
   *
   * ⚠️ `socials` di dalamnya BOLEH larik kosong, dan itu BEDA dari `null`.
   * Kosong berarti editor benar-benar menghapus semua tautannya dan kaki
   * halaman tayang tanpa baris tautan; `null` berarti CMS-nya belum bicara.
   * Menyamakan keduanya membuat tautan yang sengaja dihapus hidup lagi dari
   * cadangan bundle.
   */
  footer: Footer | null;
};

export const CONTENT_VERSION = 1 as const;
