/**
 * Kontrak pesan antara LoadingScreen (main thread) dan intro.worker.
 *
 * Dipisah ke berkas sendiri supaya kedua sisi mengimpor tipe yang SAMA. Kalau
 * tiap sisi mendeklarasikan bentuknya sendiri, keduanya bisa berbeda diam-diam
 * dan TypeScript tidak akan mengeluh — bug yang cuma muncul saat dijalankan.
 */

/** Main thread → worker. */
export type ToWorker =
  | {
      type: "init";
      canvas: OffscreenCanvas;
      width: number;
      height: number;
      dpr: number;
      reduced: boolean;
    }
  | { type: "resize"; width: number; height: number; dpr: number }
  | { type: "outro" };

/** Worker → main thread. Cuma satu: outro sudah tuntas, overlay boleh dilepas. */
export type FromWorker = { type: "done" };
