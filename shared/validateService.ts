/**
 * Pemeriksa isi layanan — dipakai server saat menyimpan DAN admin saat mengisi
 * form, dengan alasan yang sama seperti `validateJob.ts`: aturan yang ditulis
 * dua kali akan berbeda suatu hari, dan yang menemukannya pengunjung.
 *
 * Pesannya berbahasa Indonesia dan tanpa istilah teknis. Yang membacanya
 * editor non-teknis.
 */
import { SERVICE_STATES, type Service } from "./service";

/** Urutan pemberitahuan = urutan isian dibaca dari atas ke bawah di form. */
export const SERVICE_FIELD_ORDER = ["title", "desc", "subs", "state"] as const;

export type ServiceField = (typeof SERVICE_FIELD_ORDER)[number];

export type ServiceFieldErrors = Partial<Record<ServiceField, string>>;

/** Yang dikirim form ke pemeriksa — sama dengan `Service` tanpa hal yang
 *  diurus database sendiri (`id`, urutan). */
export type ServiceInput = Omit<Service, "id" | "sortOrder">;

/**
 * Batas panjang. Yang menahan cuma SATU yang benar-benar soal tata letak;
 * sisanya soal bentuk kalimat. Tidak ada satu pun yang datang dari kolom
 * database (`text` tidak punya batas).
 *
 * `title` — inilah yang punya alasan visual. Judul dirender oversized di
 *   sabuk 3D dengan `maxWidth = slot * 0.7`; ia boleh melipat, tapi lewat
 *   tiga baris judulnya mulai menyentuh label "Our Service" di celah tengah
 *   (lihat catatan `maxWidth` di ServicesTicker.tsx). 60 ≈ 2× judul
 *   terpanjang yang tayang hari ini ("Maintenance & Technical Support", 31).
 *
 * `desc` dan `subs` tidak pernah terlihat mata — keduanya hidup di daftar
 *   `sr-only`. Batasnya menjaga bentuknya tetap SATU KALIMAT: begitu editor
 *   mengetik paragraf di sana, yang mendengarnya pembaca layar, dan ia tidak
 *   punya cara melewatinya. 160 ≈ 2× kalimat terpanjang sekarang (68).
 */
const MAX = {
  title: 60,
  desc: 160,
  sub: 40,
  /* Sepuluh rincian sudah dua kali lipat dari yang terbanyak sekarang (lima,
     di layanan AI). Lebih dari itu bukan rincian lagi melainkan daftar
     layanan kedua yang menyelinap ke dalam satu baris. */
  subs: 10,
} as const;

const blank = (value: string) => value.trim().length === 0;

/**
 * Rincian layanan.
 *
 * Berbeda dengan label proyek, di sini rincian TIDAK dipakai sebagai key
 * React — ia cuma dirangkai jadi satu string dengan `join(", ")`. Jadi
 * rincian kembar tidak merusak apa pun; yang dijaga cuma isinya, karena
 * kalimat yang menyebut hal yang sama dua kali terdengar seperti salah ketik
 * di telinga pemakai pembaca layar.
 */
function subsError(subs: string[]): string | null {
  if (subs.length > MAX.subs)
    return `Terlalu banyak rincian (maksimal ${MAX.subs}).`;

  const seen = new Set<string>();
  for (const sub of subs) {
    if (blank(sub))
      return "Ada rincian yang masih kosong. Isi teksnya, atau hapus barisnya.";
    if (sub.length > MAX.sub)
      return `Rincian "${sub}" kepanjangan (maksimal ${MAX.sub} karakter).`;

    const kunci = sub.trim().toLowerCase();
    if (seen.has(kunci))
      return `Rincian "${sub.trim()}" ditulis dua kali — cukup satu.`;
    seen.add(kunci);
  }
  return null;
}

/**
 * Memeriksa satu layanan.
 *
 * Ketatnya IKUT STATUS, sama seperti lowongan: draf cuma perlu judul, supaya
 * editor bisa menyimpan pekerjaan setengah jalan tanpa dimarahi. Pemeriksaan
 * penuh berlaku begitu statusnya `live` — yaitu tepat saat isinya akan dibaca
 * pengunjung.
 */
export function validateService(input: ServiceInput): ServiceFieldErrors {
  const errors: ServiceFieldErrors = {};

  if (blank(input.title)) errors.title = "Nama layanan belum diisi.";
  else if (input.title.length > MAX.title)
    errors.title = `Nama layanan kepanjangan (maksimal ${MAX.title} karakter).`;

  if (!SERVICE_STATES.includes(input.state))
    errors.state = "Status layanan belum dipilih.";

  /* Sampai sini saja untuk draf. Yang di bawah soal layak-tidaknya dibaca
     pengunjung, dan draf memang tidak pernah sampai ke sana. */
  if (input.state === "draft") return errors;

  /**
   * Penjelasan WAJIB untuk layanan yang tayang.
   *
   * Godaannya besar untuk membiarkannya kosong — toh tidak ada yang terlihat
   * berubah di layar. Justru itu masalahnya: sabuk 3D adalah `aria-hidden`,
   * jadi daftar `sr-only` inilah SATU-SATUNYA halaman Services yang sampai ke
   * pembaca layar dan mesin pencari. Layanan tanpa penjelasan tayang sebagai
   * "Nama Layanan:" lalu berhenti.
   */
  if (blank(input.desc))
    errors.desc =
      "Penjelasan belum diisi — ini satu-satunya teks layanan yang terbaca pembaca layar dan mesin pencari.";
  else if (input.desc.length > MAX.desc)
    errors.desc = `Penjelasan kepanjangan (maksimal ${MAX.desc} karakter). Cukup satu kalimat.`;

  const rincian = subsError(input.subs);
  if (rincian) errors.subs = rincian;

  return errors;
}

/** Masalah PERTAMA menurut urutan baca form, atau null kalau sudah sah. */
export function firstServiceError(
  errors: ServiceFieldErrors,
): { field: ServiceField; message: string } | null {
  for (const field of SERVICE_FIELD_ORDER) {
    const message = errors[field];
    if (message) return { field, message };
  }
  return null;
}

/** Apakah layanan ini layak ikut ke `content.json`? */
export function isServicePublishable(input: ServiceInput): boolean {
  if (input.state === "draft") return false;
  return firstServiceError(validateService(input)) === null;
}
