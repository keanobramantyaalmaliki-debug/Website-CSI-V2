/**
 * Satu-satunya tempat panel ini berbicara dengan API.
 *
 * Semua path relatif — tidak ada host yang ditulis di mana pun. Di lokal Vite
 * yang meneruskannya ke :3001, di produksi reverse proxy. Begitu ada satu
 * `http://localhost:3001` yang terselip di kode, panel ini jalan di laptop dan
 * mati di server, dan bedanya baru ketahuan setelah deploy.
 */

import type { Job } from "@shared/job";
import type { JobFieldErrors, JobInput } from "@shared/validateJob";

export type JobRecord = Job & {
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
  | { ok: false; pesan: string; errors?: JobFieldErrors; perluMasuk?: boolean };

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

  const badan = (isi ?? {}) as { error?: string; errors?: JobFieldErrors };
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

export const masuk = (email: string, password: string) =>
  minta<{ user: Pengguna }>(
    "/api/auth/login",
    kirimJson("POST", { email, password }),
  );

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

/* ── publish ────────────────────────────────────────────────────────── */

export const statusPublish = () =>
  minta<{ pending: number }>("/api/publish/status");

export const tayangkan = () =>
  minta<{ jobs: number; generatedAt: string; warning: string | null }>(
    "/api/publish",
    { method: "POST" },
  );
