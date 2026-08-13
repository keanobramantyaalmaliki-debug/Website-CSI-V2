import { useSceneStore } from "@/lib/store/sceneStore";

/**
 * Pengunduh office.glb dengan progres byte dan sambung-ulang otomatis.
 *
 * ── Kenapa tidak cukup useGLTF.preload ──────────────────────────────────────
 * Diukur di deploy publik 13 Agu (csi2.wibudev.com): origin cuma sanggup
 * ~50 KB/s, jadi 13MB = 4+ menit. Dua akibat yang sama-sama fatal dan
 * sama-sama tak tertangani jalur lama:
 *
 *   1. Loader menutupi layar bermenit-menit TANPA tanda kemajuan apa pun —
 *      pengunjung membacanya sebagai "stuck". GLTFLoader tidak membuka akses
 *      progres byte lewat useGLTF, jadi unduhannya dikerjakan sendiri di sini
 *      dengan ReadableStream dan progresnya ditulis ke sceneStore.
 *   2. Unduhan sepanjang itu sering putus di tengah. Dulu: putus = lempar =
 *      SceneFailed permanen. Sekarang: sambung ulang dari byte terakhir lewat
 *      header Range (origin-nya sudah menjawab `accept-ranges: bytes`),
 *      maksimal MAX_ATTEMPTS percobaan.
 *
 * Hasil unduhan jadi blob URL yang di-suspend Office.tsx (readOfficeModelUrl),
 * lalu diteruskan ke useGLTF — parsing draco/webp tidak berubah sedikit pun.
 *
 * Modul ini sengaja TANPA import three, supaya boleh ikut bundle utama:
 * Hero memanggil startOfficeModelDownload() saat mount sehingga 13MB-nya
 * berjalan PARALEL dengan unduhan chunk Scene, bukan menunggu di belakangnya.
 */

export const OFFICE_MODEL_URL = "/3d/models/office.glb";

/** Total percobaan fetch (1 awal + sisanya sambung-ulang). */
const MAX_ATTEMPTS = 4;
/** Jeda antar percobaan (ms) — naik dua kali lipat tiap gagal. */
const RETRY_BASE_MS = 1000;

type State =
  | { phase: "idle" }
  | { phase: "pending"; promise: Promise<string> }
  | { phase: "ready"; url: string }
  | { phase: "error"; error: unknown; promise: Promise<string> };

let state: State = { phase: "idle" };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Tulis progres ke store, dijatah per persen bulat (atau per 256KB kalau
 * totalnya tidak diketahui). Tanpa jatah ini setiap potongan stream (~16KB,
 * ratusan kali untuk 13MB) memicu render ulang LoadingScreen.
 */
function makeProgressReporter() {
  let lastKey = -1;
  return (loaded: number, total: number) => {
    const key = total > 0 ? Math.floor((loaded / total) * 100) : Math.floor(loaded / 262144);
    if (key === lastKey) return;
    lastKey = key;
    useSceneStore.getState().setModelLoad({ loaded, total });
  };
}

async function download(): Promise<string> {
  const report = makeProgressReporter();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let total = 0;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));
    try {
      const res = await fetch(OFFICE_MODEL_URL, {
        headers: received > 0 ? { Range: `bytes=${received}-` } : undefined,
      });

      if (received > 0 && res.status !== 206) {
        // Server (atau cache di depannya) mengabaikan Range dan mengirim file
        // dari awal — buang yang sudah terkumpul supaya tidak tersambung ganda.
        chunks.length = 0;
        received = 0;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} untuk ${OFFICE_MODEL_URL}`);

      if (res.status === 206) {
        // content-range: "bytes <awal>-<akhir>/<total>"
        const m = res.headers.get("content-range")?.match(/\/(\d+)\s*$/);
        if (m) total = Number(m[1]);
      } else {
        total = Number(res.headers.get("content-length") ?? 0);
      }

      if (!res.body) {
        // Lingkungan tanpa streaming (mis. beberapa webview lama): sekali telan.
        const buf = new Uint8Array(await res.arrayBuffer());
        chunks.push(buf);
        received += buf.length;
      } else {
        const reader = res.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          report(received, total);
        }
      }

      // Content-Length bisa saja bohong lewat proxy; yang dipercaya adalah
      // stream yang selesai tanpa error. Kalau totalnya diketahui dan byte-nya
      // kurang, anggap putus dan coba sambung lagi.
      if (total > 0 && received < total)
        throw new Error(`terputus di ${received}/${total} byte`);

      report(received, total > 0 ? total : received);
      const blob = new Blob(chunks as BlobPart[], { type: "model/gltf-binary" });
      // Blob URL sengaja tidak pernah di-revoke: GLTFLoader membacanya async
      // setelah render, dan satu URL 13MB untuk seumur halaman itu murah
      // dibanding tebakan "sudah aman di-revoke belum".
      return URL.createObjectURL(blob);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error(`gagal mengunduh ${OFFICE_MODEL_URL}`);
}

/**
 * Mulai unduhan kalau belum jalan. Idempoten — aman dipanggil dari Hero,
 * Office, dan StrictMode sekaligus; yang jalan tetap satu.
 */
export function startOfficeModelDownload(): void {
  if (state.phase !== "idle") return;
  const promise = download().then(
    (url) => {
      state = { phase: "ready", url };
      return url;
    },
    (error) => {
      state = { phase: "error", error, promise };
      throw error;
    },
  );
  state = { phase: "pending", promise };
}

/**
 * Baca blob URL model — SUSPEND selama unduhan berjalan, LEMPAR kalau gagal
 * (ditangkap ChunkBoundary "Scene" di Hero, sama seperti kegagalan useGLTF
 * dulu). Panggil hanya dari dalam <Suspense>.
 */
export function readOfficeModelUrl(): string {
  if (state.phase === "idle") startOfficeModelDownload();
  if (state.phase === "ready") return state.url;
  if (state.phase === "error") throw state.error;
  // phase === "pending" — biar TypeScript pun tahu ini bukan idle lagi.
  if (state.phase !== "pending") throw new Error("unreachable");
  throw state.promise;
}

/**
 * Buka jalan untuk percobaan ulang: hanya membersihkan keadaan GAGAL.
 * Unduhan yang masih jalan atau sudah berhasil tidak disentuh.
 */
export function resetOfficeModelDownload(): void {
  if (state.phase === "error") state = { phase: "idle" };
}
