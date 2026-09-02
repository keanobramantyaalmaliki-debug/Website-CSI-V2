/**
 * Pemeriksa isi satu deployment — dipakai server saat menyimpan DAN admin saat
 * mengisi form, dengan alasan yang sama seperti `validateJob.ts`: aturan yang
 * ditulis dua kali akan berbeda suatu hari, dan yang menemukannya pengunjung.
 *
 * Pesannya berbahasa Indonesia dan tanpa istilah teknis. Yang membacanya
 * editor non-teknis.
 *
 * ⚠️ Satu hal yang TIDAK diperiksa di sini: kembar. Fungsi ini cuma dioper
 * SATU deployment, jadi ia tidak akan pernah bisa menjawab pertanyaan tentang
 * baris lain. Penjaganya duduk di `routes/deployments.ts` lewat
 * `deploymentPairTaken()`.
 *
 * Dan yang dijaga di sana bukan `sector` sendirian melainkan PASANGAN
 * `sector` + `region` — beda dari industri dan layanan, dan bedanya disengaja.
 * "Logistics · Indonesia" dan "Logistics · International" itu dua sistem yang
 * benar-benar berbeda; menolak yang kedua berarti CMS ini memaksa editor
 * mengarang nama sektor palsu supaya bisa mencatat kenyataan.
 */
import { DEPLOYMENT_STATES, type Deployment } from "./deployment";

/** Urutan pemberitahuan = urutan isian dibaca dari atas ke bawah di form. */
export const DEPLOYMENT_FIELD_ORDER = [
  "sector",
  "region",
  "desc",
  "image",
  "state",
] as const;

export type DeploymentField = (typeof DEPLOYMENT_FIELD_ORDER)[number];

export type DeploymentFieldErrors = Partial<Record<DeploymentField, string>>;

/** Yang dikirim form ke pemeriksa — sama dengan `Deployment` tanpa hal yang
 *  diurus database sendiri (`id`, urutan). */
export type DeploymentInput = Omit<Deployment, "id" | "sortOrder">;

/**
 * Batas panjang, dan ketiganya berasal dari SATU sifat tata letak yang sama:
 * kartunya TIDAK BISA TUMBUH.
 *
 * `DeploymentCard.tsx` menguncinya `aspect-[4/3]` dengan
 * `min-h-[18rem] max-h-[22rem]`, lalu `overflow-hidden` dengan isi yang
 * `justify-end`. Artinya teks yang kepanjangan tidak memanjangkan kartunya
 * melainkan terdorong ke ATAS keluar kotak — dan yang hilang duluan justru
 * baris meta dan judulnya, bukan ekor kalimatnya. Tidak ada error, tidak ada
 * scrollbar; kartunya cuma diam-diam kehilangan kepala.
 *
 * Angkanya dihitung di kasus paling sempit, yaitu grid dua kolom di ~640px
 * (`sm:grid-cols-2`): kartu ±305px dikurangi `p-5` = ±265px ruang teks.
 *
 * `sector` — `<h3 className="text-base">`, ±33 karakter per baris. 40 berarti
 *   paling banyak melipat jadi dua baris. Yang ditolak adalah judul sepanjang
 *   kalimat.
 *
 * `region` — ikut satu baris dengan nomornya ("03 · International") dalam
 *   `font-mono text-[11px] tracking-widest`, yang cuma muat ±35 karakter
 *   sebelum melipat; lima di antaranya sudah dipakai "03 · ".
 *
 * `desc` — `text-sm leading-relaxed`, ±38 karakter per baris di lebar itu. 240
 *   ≈ 7 baris, dan tujuh baris masih muat di kartu terpendek (18rem) bersama
 *   judul dan baris meta. 240 juga ±1,5× kalimat terpanjang yang tayang hari
 *   ini (154).
 */
const MAX = {
  sector: 40,
  region: 30,
  desc: 240,
} as const;

const blank = (value: string) => value.trim().length === 0;

/**
 * Memeriksa satu deployment.
 *
 * Ketatnya IKUT STATUS, sama seperti entitas lain: draft cuma perlu sektor,
 * supaya editor bisa menyimpan pekerjaan setengah jalan tanpa dimarahi.
 * Pemeriksaan penuh berlaku begitu statusnya `live` — yaitu tepat saat isinya
 * akan dibaca pengunjung.
 */
export function validateDeployment(
  input: DeploymentInput,
): DeploymentFieldErrors {
  const errors: DeploymentFieldErrors = {};

  if (blank(input.sector)) errors.sector = "Sektor belum diisi.";
  else if (input.sector.length > MAX.sector)
    errors.sector = `Sektor kepanjangan (maksimal ${MAX.sector} karakter) — judul sepanjang ini mendorong isi kartu keluar kotaknya.`;

  if (!DEPLOYMENT_STATES.includes(input.state))
    errors.state = "Status deployment belum dipilih.";

  /* Sampai sini saja untuk draft. */
  if (input.state === "draft") return errors;

  /* Wilayah wajib untuk yang tayang, bukan sekadar dibatasi panjangnya. Baris
     metanya berbunyi "03 · " lalu berhenti kalau kosong — titik tengah
     menggantung tanpa apa pun sesudahnya, yang terbaca seperti halaman rusak,
     bukan seperti keterangan yang sengaja dikosongkan. */
  if (blank(input.region)) errors.region = "Wilayah belum diisi.";
  else if (input.region.length > MAX.region)
    errors.region = `Wilayah kepanjangan (maksimal ${MAX.region} karakter) — baris nomornya cuma muat sesegini.`;

  if (blank(input.desc)) errors.desc = "Keterangan belum diisi.";
  else if (input.desc.length > MAX.desc)
    errors.desc = `Keterangan kepanjangan (maksimal ${MAX.desc} karakter) — lebih dari ini, bagian atas kartu terpotong.`;

  /**
   * Foto WAJIB untuk kartu yang tayang.
   *
   * Kartu tanpa foto tidak rusak — `<img>`-nya memang tidak dirender sama
   * sekali, dan yang tersisa kotak gelap berisi teks. Masalahnya kartu itu
   * berdiri BERSEBELAHAN dengan empat kartu berfoto di grid yang sama, dan di
   * antara mereka ia terbaca seperti gambar yang gagal dimuat.
   */
  if (blank(input.image))
    errors.image = "Foto belum dipilih — kartu yang tampil butuh foto.";

  return errors;
}

/** Masalah PERTAMA menurut urutan baca form, atau null kalau sudah sah. */
export function firstDeploymentError(
  errors: DeploymentFieldErrors,
): { field: DeploymentField; message: string } | null {
  for (const field of DEPLOYMENT_FIELD_ORDER) {
    const message = errors[field];
    if (message) return { field, message };
  }
  return null;
}

/** Apakah deployment ini layak ikut ke `content.json`? */
export function isDeploymentPublishable(input: DeploymentInput): boolean {
  if (input.state === "draft") return false;
  return firstDeploymentError(validateDeployment(input)) === null;
}
