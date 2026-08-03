/**
 * Aturan KAPAN chunk billiard boleh mulai diunduh.
 *
 * Dipisah dari `BilliardLazy.tsx` karena dua alasan yang kebetulan sejalan:
 *
 *   1. Berkas komponen yang juga mengekspor konstanta/fungsi mematikan fast
 *      refresh untuk berkas itu (aturan `react-refresh/only-export-components`).
 *   2. Keputusannya memang bukan komponen — ia fungsi murni dari
 *      (ruangan, jenis pointer) → boolean, dan diuji seperti itu.
 */

/**
 * Ruangan tempat meja billiard berdiri (pusat felt ≈ x 0,375 / z −1,63 di
 * koordinat three).
 *
 * ⚠️ Kalau mejanya dipindah ruangan, ubah di sini juga — prefetch yang menunggu
 * ruangan yang salah sama saja dengan tidak ada prefetch, dan gejalanya cuma
 * "kok klik meja jadi lambat lagi".
 */
export const BILLIARD_ROOM = "Lounge";

/**
 * Boleh mulai mengunduh chunk billiard?
 *
 * `coarse` didahulukan: di perangkat sentuh minigame TIDAK BISA dibuka sama
 * sekali (INVARIANTS §6 — `Office.tsx` menolak klik meja), jadi mengunduh ~1 MB
 * GLB di sana murni membuang kuota pengunjung. Itu justru penghematan terbesar
 * dari seluruh perubahan ini.
 */
export function shouldPrefetchBilliard(room: string, coarse: boolean): boolean {
  if (coarse) return false;
  return room === BILLIARD_ROOM;
}
