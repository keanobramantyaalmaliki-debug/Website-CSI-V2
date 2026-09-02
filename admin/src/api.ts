/**
 * Satu-satunya tempat panel ini berbicara dengan API.
 *
 * Semua path relatif — tidak ada host yang ditulis di mana pun. Di lokal Vite
 * yang meneruskannya ke :3001, di produksi reverse proxy. Begitu ada satu
 * `http://localhost:3001` yang terselip di kode, panel ini jalan di laptop dan
 * mati di server, dan bedanya baru ketahuan setelah deploy.
 */

import type { CrewMember } from "@shared/crew";
import type { Job } from "@shared/job";
import type { Industry } from "@shared/industry";
import type { Deployment } from "@shared/deployment";
import type { Value } from "@shared/value";
import type { WorkProject } from "@shared/workProject";
import type { CaseStudy } from "@shared/caseStudy";
import type { Service } from "@shared/service";
import type { Testimonial } from "@shared/testimonial";
import type { Vision } from "@shared/vision";
import type { ProcessStep } from "@shared/processStep";
import type { CrewFieldErrors, CrewInput } from "@shared/validateCrew";
import type { JobFieldErrors, JobInput } from "@shared/validateJob";
import type { ValueFieldErrors, ValueInput } from "@shared/validateValue";
import type {
  IndustryFieldErrors,
  IndustryInput,
} from "@shared/validateIndustry";
import type {
  DeploymentFieldErrors,
  DeploymentInput,
} from "@shared/validateDeployment";
import type {
  WorkProjectFieldErrors,
  WorkProjectInput,
} from "@shared/validateWorkProject";
import type {
  CaseStudyFieldErrors,
  CaseStudyInput,
} from "@shared/validateCaseStudy";
import type {
  TestimonialFieldErrors,
  TestimonialInput,
} from "@shared/validateTestimonial";
import type { ServiceFieldErrors, ServiceInput } from "@shared/validateService";
import type { VisionFieldErrors, VisionInput } from "@shared/validateVision";
import type {
  ProcessStepFieldErrors,
  ProcessStepInput,
} from "@shared/validateProcessStep";

export type JobRecord = Job & {
  updatedAt: string;
  publishedAt: string | null;
  /** Ada perubahan yang belum ikut Publish. */
  unpublished: boolean;
};

export type ValueRecord = Value & {
  updatedAt: string;
  publishedAt: string | null;
  /** Ada perubahan yang belum ikut Publish. */
  unpublished: boolean;
};

export type IndustryRecord = Industry & {
  updatedAt: string;
  publishedAt: string | null;
  /** Ada perubahan yang belum ikut Publish. */
  unpublished: boolean;
};

export type DeploymentRecord = Deployment & {
  updatedAt: string;
  publishedAt: string | null;
  /** Ada perubahan yang belum ikut Publish. */
  unpublished: boolean;
};

export type ProcessStepRecord = ProcessStep & {
  updatedAt: string;
  publishedAt: string | null;
  /** Ada perubahan yang belum ikut Publish. */
  unpublished: boolean;
};

export type TestimonialRecord = Testimonial & {
  updatedAt: string;
  publishedAt: string | null;
  /** Ada perubahan yang belum ikut Publish. */
  unpublished: boolean;
};

export type CrewRecord = CrewMember & {
  updatedAt: string;
  publishedAt: string | null;
  /** Ada perubahan yang belum ikut Publish. */
  unpublished: boolean;
};

export type WorkProjectRecord = WorkProject & {
  updatedAt: string;
  publishedAt: string | null;
  /** Ada perubahan yang belum ikut Publish. */
  unpublished: boolean;
};

export type CaseStudyRecord = CaseStudy & {
  updatedAt: string;
  publishedAt: string | null;
  /** Ada perubahan yang belum ikut Publish. */
  unpublished: boolean;
};

export type ServiceRecord = Service & {
  updatedAt: string;
  publishedAt: string | null;
  /** Ada perubahan yang belum ikut Publish. */
  unpublished: boolean;
};

/** Beda dari tetangganya di atas: tanpa `id`, karena barisnya cuma satu dan
 *  alamatnya endpoint-nya sendiri (`/api/vision`). */
export type VisionRecord = Vision & {
  updatedAt: string;
  publishedAt: string | null;
  /** Ada perubahan yang belum ikut Publish. */
  unpublished: boolean;
};

export type ImageRow = {
  id: string;
  path: string;
  source: "upload" | "static";
  originalName: string | null;
  width: number | null;
  height: number | null;
};

export type Pengguna = { id: string; name: string } | null;

/**
 * Hasil pemanggilan API.
 *
 * `errors` dipisahkan dari `pesan` karena keduanya ditampilkan di tempat yang
 * berbeda: galat per-isian menempel di sebelah isiannya, sedangkan `pesan`
 * adalah kalimat tunggal di atas form. Menggabungkannya jadi satu string akan
 * memaksa editor mencari sendiri isian mana yang bermasalah.
 */
export type Hasil<T> =
  | { ok: true; data: T }
  | { ok: false; pesan: string; errors?: FieldErrors; perluMasuk?: boolean };

/** Galat per-isian dari entitas mana pun. Digabung jadi satu tipe karena
 *  `minta()` tidak tahu — dan tidak perlu tahu — entitas apa yang sedang
 *  dipanggil; yang membaca `errors` adalah form yang memang cuma mengenal
 *  isiannya sendiri. */
export type FieldErrors = JobFieldErrors &
  ValueFieldErrors &
  CrewFieldErrors &
  WorkProjectFieldErrors &
  CaseStudyFieldErrors &
  ServiceFieldErrors &
  TestimonialFieldErrors &
  IndustryFieldErrors &
  DeploymentFieldErrors &
  ProcessStepFieldErrors &
  VisionFieldErrors;

async function minta<T>(path: string, init: RequestInit = {}): Promise<Hasil<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      /* Cookie sesi ikut dikirim. Tanpa ini setiap request dianggap tamu dan
         panel memaksa login berulang-ulang tanpa alasan yang terlihat. */
      credentials: "same-origin",
      ...init,
    });
  } catch {
    return {
      ok: false,
      pesan: "Tidak bisa menghubungi server. Periksa koneksi, lalu coba lagi.",
    };
  }

  const isi = await res.json().catch(() => null);

  if (res.ok) return { ok: true, data: isi as T };

  /* Badan bukan-JSON pada galat 5xx berarti yang menjawab BUKAN API-nya,
     melainkan yang berdiri di depannya — proxy Vite di lokal (500), nginx di
     produksi (502). Tanpa cabang ini editor membaca "Ada yang salah" dan
     mencari kesalahannya di isian, padahal prosesnya memang sedang mati. */
  if (isi === null && res.status >= 500) {
    return {
      ok: false,
      pesan: "Server sedang tidak bisa dihubungi. Coba lagi sebentar lagi.",
    };
  }

  const badan = (isi ?? {}) as { error?: string; errors?: FieldErrors };
  return {
    ok: false,
    pesan: badan.error ?? "Ada yang salah. Coba lagi sebentar lagi.",
    errors: badan.errors,
    perluMasuk: res.status === 401,
  };
}

const kirimJson = (metode: string, body: unknown): RequestInit => ({
  method: metode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

/* ── sesi ───────────────────────────────────────────────────────────── */

export const siapaAku = () => minta<{ user: Pengguna }>("/api/auth/me");

export const masuk = (password: string) =>
  minta<{ user: Pengguna }>("/api/auth/login", kirimJson("POST", { password }));

export const keluar = () => minta<{ ok: true }>("/api/auth/logout", { method: "POST" });

/* ── lowongan ───────────────────────────────────────────────────────── */

export const ambilLowongan = () => minta<{ jobs: JobRecord[] }>("/api/jobs");

export const ambilSatuLowongan = (id: string) =>
  minta<{ job: JobRecord }>(`/api/jobs/${id}`);

export const buatLowongan = (input: JobInput) =>
  minta<{ job: JobRecord }>("/api/jobs", kirimJson("POST", input));

export const simpanLowongan = (id: string, input: JobInput) =>
  minta<{ job: JobRecord }>(`/api/jobs/${id}`, kirimJson("PUT", input));

export const hapusLowongan = (id: string) =>
  minta<{ ok: true; deleted: string }>(`/api/jobs/${id}`, { method: "DELETE" });

/* ── nilai (People → What We Stand For) ─────────────────────────────── */

export const ambilNilai = () => minta<{ values: ValueRecord[] }>("/api/values");

export const ambilSatuNilai = (id: string) =>
  minta<{ value: ValueRecord }>(`/api/values/${id}`);

export const buatNilai = (input: ValueInput) =>
  minta<{ value: ValueRecord }>("/api/values", kirimJson("POST", input));

export const simpanNilai = (id: string, input: ValueInput) =>
  minta<{ value: ValueRecord }>(`/api/values/${id}`, kirimJson("PUT", input));

export const hapusNilai = (id: string) =>
  minta<{ ok: true; deleted: string }>(`/api/values/${id}`, { method: "DELETE" });

/** Kirim SELURUH daftar id dalam urutan barunya. Server menolak daftar yang
 *  tidak menyebut semua nilai — lihat `reorderValues` di server. */
export const urutkanNilai = (ids: string[]) =>
  minta<{ values: ValueRecord[] }>("/api/values/urutkan", kirimJson("POST", { ids }));

/* ── industri (Home → Built Across Sectors) ─────────────────────────── */

export const ambilIndustri = () =>
  minta<{ industries: IndustryRecord[] }>("/api/industries");

export const ambilSatuIndustri = (id: string) =>
  minta<{ industry: IndustryRecord }>(`/api/industries/${id}`);

export const buatIndustri = (input: IndustryInput) =>
  minta<{ industry: IndustryRecord }>("/api/industries", kirimJson("POST", input));

export const simpanIndustri = (id: string, input: IndustryInput) =>
  minta<{ industry: IndustryRecord }>(
    `/api/industries/${id}`,
    kirimJson("PUT", input),
  );

export const hapusIndustri = (id: string) =>
  minta<{ ok: true; deleted: string }>(`/api/industries/${id}`, {
    method: "DELETE",
  });

/** Sama seperti nilai: SELURUH daftar id dalam urutan barunya. Urutan ini
 *  menentukan anak tangga spiral yang ditempati tiap sektor SEKALIGUS nomor
 *  "01"–"13" yang tercetak di HUD-nya. */
export const urutkanIndustri = (ids: string[]) =>
  minta<{ industries: IndustryRecord[] }>(
    "/api/industries/urutkan",
    kirimJson("POST", { ids }),
  );

/* ── deployment (Home → Built for real-world environments) ──────────── */

export const ambilDeployment = () =>
  minta<{ deployments: DeploymentRecord[] }>("/api/deployments");

export const ambilSatuDeployment = (id: string) =>
  minta<{ deployment: DeploymentRecord }>(`/api/deployments/${id}`);

export const buatDeployment = (input: DeploymentInput) =>
  minta<{ deployment: DeploymentRecord }>(
    "/api/deployments",
    kirimJson("POST", input),
  );

export const simpanDeployment = (id: string, input: DeploymentInput) =>
  minta<{ deployment: DeploymentRecord }>(
    `/api/deployments/${id}`,
    kirimJson("PUT", input),
  );

export const hapusDeployment = (id: string) =>
  minta<{ ok: true; deleted: string }>(`/api/deployments/${id}`, {
    method: "DELETE",
  });

/** SELURUH daftar id dalam urutan barunya, seperti nilai dan industri. Di sini
 *  urutan menentukan dua hal sekaligus: posisi kartu di grid DAN nomor
 *  "01"–"05" yang tercetak di kartunya — nomor itu tidak pernah disimpan,
 *  situs menurunkannya dari posisi baris. */
export const urutkanDeployment = (ids: string[]) =>
  minta<{ deployments: DeploymentRecord[] }>(
    "/api/deployments/urutkan",
    kirimJson("POST", { ids }),
  );

/* ── cara kerja (Home → How We Work) ────────────────────────────────── */

export const ambilProses = () =>
  minta<{ steps: ProcessStepRecord[] }>("/api/process-steps");

export const ambilSatuProses = (id: string) =>
  minta<{ step: ProcessStepRecord }>(`/api/process-steps/${id}`);

export const buatProses = (input: ProcessStepInput) =>
  minta<{ step: ProcessStepRecord }>(
    "/api/process-steps",
    kirimJson("POST", input),
  );

export const simpanProses = (id: string, input: ProcessStepInput) =>
  minta<{ step: ProcessStepRecord }>(
    `/api/process-steps/${id}`,
    kirimJson("PUT", input),
  );

export const hapusProses = (id: string) =>
  minta<{ ok: true; deleted: string }>(`/api/process-steps/${id}`, {
    method: "DELETE",
  });

/** SELURUH daftar id dalam urutan barunya, seperti nilai dan industri. Urutan
 *  di sini bukan sekadar tata letak: ia alur kerja yang dibaca dari atas ke
 *  bawah SEKALIGUS penentu nomor "01"–"06" di kartunya — nomor itu tidak
 *  pernah disimpan, situs menurunkannya dari posisi baris. */
export const urutkanProses = (ids: string[]) =>
  minta<{ steps: ProcessStepRecord[] }>(
    "/api/process-steps/urutkan",
    kirimJson("POST", { ids }),
  );

/* ── crew (People → The Crew) ───────────────────────────────────────── */

/* Tanpa `urutkanCrew`: situs mengurutkan crew A–Z sendiri di dalam tiap
   departemen, jadi endpoint mengurutkan cuma akan memberi editor tombol yang
   tidak mengubah apa pun. Alasan lengkapnya di `server/db/schema.ts`. */

export const ambilCrew = () => minta<{ crew: CrewRecord[] }>("/api/crew");

export const ambilSatuCrew = (id: string) =>
  minta<{ member: CrewRecord }>(`/api/crew/${id}`);

export const buatCrew = (input: CrewInput) =>
  minta<{ member: CrewRecord }>("/api/crew", kirimJson("POST", input));

export const simpanCrew = (id: string, input: CrewInput) =>
  minta<{ member: CrewRecord }>(`/api/crew/${id}`, kirimJson("PUT", input));

export const hapusCrew = (id: string) =>
  minta<{ ok: true; deleted: string }>(`/api/crew/${id}`, { method: "DELETE" });

/* ── proyek (Work → Selected Work) ──────────────────────────────────── */

export const ambilProyek = () =>
  minta<{ projects: WorkProjectRecord[] }>("/api/projects");

export const ambilSatuProyek = (id: string) =>
  minta<{ project: WorkProjectRecord }>(`/api/projects/${id}`);

export const buatProyek = (input: WorkProjectInput) =>
  minta<{ project: WorkProjectRecord }>("/api/projects", kirimJson("POST", input));

export const simpanProyek = (id: string, input: WorkProjectInput) =>
  minta<{ project: WorkProjectRecord }>(
    `/api/projects/${id}`,
    kirimJson("PUT", input),
  );

export const hapusProyek = (id: string) =>
  minta<{ ok: true; deleted: string }>(`/api/projects/${id}`, { method: "DELETE" });

/** Kirim SELURUH daftar id dalam urutan barunya. Server menolak daftar yang
 *  tidak menyebut semua proyek — lihat `reorderWorkProjects` di server. */
export const urutkanProyek = (ids: string[]) =>
  minta<{ projects: WorkProjectRecord[] }>(
    "/api/projects/urutkan",
    kirimJson("POST", { ids }),
  );

/* ── case study (Work → Case Studies) ───────────────────────────────── */

export const ambilCaseStudy = () =>
  minta<{ studies: CaseStudyRecord[] }>("/api/case-studies");

export const ambilSatuCaseStudy = (id: string) =>
  minta<{ study: CaseStudyRecord }>(`/api/case-studies/${id}`);

export const buatCaseStudy = (input: CaseStudyInput) =>
  minta<{ study: CaseStudyRecord }>(
    "/api/case-studies",
    kirimJson("POST", input),
  );

export const simpanCaseStudy = (id: string, input: CaseStudyInput) =>
  minta<{ study: CaseStudyRecord }>(
    `/api/case-studies/${id}`,
    kirimJson("PUT", input),
  );

export const hapusCaseStudy = (id: string) =>
  minta<{ ok: true; deleted: string }>(`/api/case-studies/${id}`, {
    method: "DELETE",
  });

/** Kirim SELURUH daftar id dalam urutan barunya. Server menolak daftar yang
 *  tidak menyebut semua cerita — lihat `reorderCaseStudies` di server. */
export const urutkanCaseStudy = (ids: string[]) =>
  minta<{ studies: CaseStudyRecord[] }>(
    "/api/case-studies/urutkan",
    kirimJson("POST", { ids }),
  );

/* ── gambar ─────────────────────────────────────────────────────────── */

export const ambilGambar = () => minta<{ images: ImageRow[] }>("/api/images");

export function unggahGambar(file: File) {
  const form = new FormData();
  form.append("file", file);
  /* Sengaja TANPA header content-type: browser harus menuliskannya sendiri
     berikut `boundary` multipart. Mengisinya manual membuat server menerima
     badan yang tidak bisa diurai, dan pesannya tidak menyebut penyebabnya. */
  return minta<{ image: ImageRow }>("/api/images", { method: "POST", body: form });
}

/* ── layanan (Services → sabuk layanan) ─────────────────────────────── */

export const ambilLayanan = () => minta<{ services: ServiceRecord[] }>("/api/services");

export const ambilSatuLayanan = (id: string) =>
  minta<{ service: ServiceRecord }>(`/api/services/${id}`);

export const buatLayanan = (input: ServiceInput) =>
  minta<{ service: ServiceRecord }>("/api/services", kirimJson("POST", input));

export const simpanLayanan = (id: string, input: ServiceInput) =>
  minta<{ service: ServiceRecord }>(
    `/api/services/${id}`,
    kirimJson("PUT", input),
  );

export const hapusLayanan = (id: string) =>
  minta<{ ok: true; deleted: string }>(`/api/services/${id}`, {
    method: "DELETE",
  });

/** Kirim SELURUH daftar id dalam urutan barunya. Server menolak daftar yang
 *  tidak menyebut semua layanan — lihat `reorderServices` di server. */
export const urutkanLayanan = (ids: string[]) =>
  minta<{ services: ServiceRecord[] }>(
    "/api/services/urutkan",
    kirimJson("POST", { ids }),
  );

/* ── testimoni (Services → kutipan klien) ───────────────────────────── */

export const ambilTestimoni = () =>
  minta<{ testimonials: TestimonialRecord[] }>("/api/testimonials");

export const ambilSatuTestimoni = (id: string) =>
  minta<{ testimonial: TestimonialRecord }>(`/api/testimonials/${id}`);

export const buatTestimoni = (input: TestimonialInput) =>
  minta<{ testimonial: TestimonialRecord }>(
    "/api/testimonials",
    kirimJson("POST", input),
  );

export const simpanTestimoni = (id: string, input: TestimonialInput) =>
  minta<{ testimonial: TestimonialRecord }>(
    `/api/testimonials/${id}`,
    kirimJson("PUT", input),
  );

export const hapusTestimoni = (id: string) =>
  minta<{ ok: true; deleted: string }>(`/api/testimonials/${id}`, {
    method: "DELETE",
  });

/** Kirim SELURUH daftar id dalam urutan barunya. Server menolak daftar yang
 *  tidak menyebut semua testimoni — lihat `reorderTestimonials` di server. */
export const urutkanTestimoni = (ids: string[]) =>
  minta<{ testimonials: TestimonialRecord[] }>(
    "/api/testimonials/urutkan",
    kirimJson("POST", { ids }),
  );

/* ── visi (halaman depan → paragraf penutup) ────────────────────────── */

/**
 * Dua fungsi saja, dan tidak ada `buat`/`hapus`/`urutkan`.
 *
 * Visi satu baris: `PUT` yang sama menangani pengisian pertama maupun
 * perubahan berikutnya (server memakai upsert), dan tidak ada yang bisa
 * dihapus — seksinya tidak boleh menghilang dari halaman depan.
 */

/** `vision: null` berarti barisnya belum ada di database, bukan galat.
 *  Form membukanya sebagai isian kosong. */
export const ambilVisi = () => minta<{ vision: VisionRecord | null }>("/api/vision");

export const simpanVisi = (input: VisionInput) =>
  minta<{ vision: VisionRecord }>("/api/vision", kirimJson("PUT", input));

/* ── publish ────────────────────────────────────────────────────────── */

export const statusPublish = () =>
  minta<{ pending: number }>("/api/publish/status");

export const tayangkan = () =>
  minta<{
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
    /* Bukan cacah — visi selalu tepat satu. `false` berarti situs masih
       memakai cadangan bundle karena barisnya belum ada. */
    vision: boolean;
    generatedAt: string;
    warning: string | null;
  }>(
    "/api/publish",
    { method: "POST" },
  );
