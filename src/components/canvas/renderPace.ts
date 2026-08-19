/**
 * Cap 30 fps saat idle — keputusan "tick ini digambar atau dilewati".
 *
 * ── Kenapa ini ada ─────────────────────────────────────────────────────────
 * Scene ini berjalan tepat di ambang vsync (p50 16,7 ms, GPU ~100% saat idle —
 * audit 7 Agu). Di Chromium itu masih 60 fps; di Safari (ANGLE→Metal, sedikit
 * lebih lambat untuk pass fullscreen yang sama) frame time lewat sedikit dari
 * 16,7 ms dan vsync menguantisasinya ke 30 fps patah-patah (laporan Keano
 * 19 Agu, csi2.wibudev.com). Solusi yang dipilih: saat TIDAK ada yang bergerak,
 * gambar tiap 2 tick rAF — beban GPU turun ~50%, dan frame yang di-skip
 * menampilkan frame sebelumnya (canvas WebGL tidak di-clear kalau tidak
 * digambar), jadi untuk pemandangan diam hasilnya identik.
 *
 * ── Kenapa BUKAN frameloop="demand" ────────────────────────────────────────
 * Kontrak demand↔invalidate pernah rusak diam-diam lewat merge (cerita
 * lengkap di komentar Scene.tsx + frameloop.invariant.test.ts). Di sini SEMUA
 * useFrame tetap berdetak 60×/detik — mixer karakter, tween, sweep, semuanya
 * maju bersama; yang di-skip hanya panggilan composer.render() di ekor tick
 * (IdleFrameCap.tsx). Tidak ada kontrak baru yang bisa dilanggar file yang
 * belum lahir: useFrame baru otomatis ikut pola ini tanpa tahu apa-apa.
 *
 * ── Definisi "idle" ────────────────────────────────────────────────────────
 * Digambar TIAP tick (60 fps) selama salah satu:
 *   - !sceneReady        — loader masih menunggu frame nyata pertama
 *                          (INVARIANTS §3; skip di fase ini menunda sinyalnya)
 *   - pendingRoom !== null — sapuan GridReveal. ⚠️ Ini yang menjaga kontrak
 *                          frameTick.ts tetap benar: markFrame() menghitung
 *                          TICK, dan GridReveal menganggapnya "frame yang
 *                          tergambar" — anggapan itu hanya sah karena selama
 *                          pendingRoom aktif tidak pernah ada tick yang
 *                          di-skip. Dijaga renderPace.test.ts.
 *   - billiardActive     — bola menggelinding tanpa kamera/kursor bergerak
 *   - markSceneActivity() dipanggil < IDLE_GRACE_MS yang lalu — kamera menulis
 *     (tween/parallax, CameraController), sapuan reveal awal (Office.tsx),
 *     atau kursor bergerak/klik (pendengar pointer di IdleFrameCap: menjaga
 *     hover hologram/HoverScan tetap responsif walau kamera diam).
 * Selebihnya: gambar tiap 2 tick. Karakter, video TV, LED bernapas, debu —
 * semua jadi 30 fps saat ditonton diam-diam, yang justru makin PS1.
 *
 * Module-level, bukan state React — pola yang sama dengan frameTick.ts:
 * penulisnya di dalam useFrame (60×/detik), pembacanya di tick yang sama.
 */

import { useSceneStore } from "@/lib/store/sceneStore";

/**
 * Berapa lama setelah aktivitas terakhir 60 fps dipertahankan. 1 detik:
 * cukup untuk ekor peredam parallax dan animasi pendek yang dipicu klik
 * (glitch hologram) tanpa flip-flop 30↔60 di tengahnya; harga diamnya cuma
 * 1 detik ekstra 60 fps tiap kali gerakan berhenti.
 */
const IDLE_GRACE_MS = 1000;

let lastActivityAt = -Infinity;
let tick = 0;
let drawn = 0;

/** Dipanggil oleh siapa pun yang sedang menggerakkan sesuatu yang harus
 *  terlihat 60 fps. Aman dipanggil tiap frame. */
export function markSceneActivity(now: number = performance.now()): void {
  lastActivityAt = now;
}

/**
 * "Scene sedang bergerak/berinteraksi" — definisi TUNGGAL yang dipakai dua
 * konsumen: shouldDrawThisTick di bawah (aktif = gambar tiap tick) dan
 * monitor AdaptiveDpr (aktif = sampel frame time yang jujur; sampel idle
 * justru dipakai sebagai pembanding untuk membedakan cap OS dari GPU jenuh
 * — lihat adaptiveDpr.ts). Kalau definisinya sampai bercabang, dua fitur itu
 * diam-diam mengukur dunia yang berbeda.
 */
export function isSceneActive(now: number = performance.now()): boolean {
  const s = useSceneStore.getState();
  return (
    !s.sceneReady ||
    s.pendingRoom !== null ||
    s.billiardActive ||
    now - lastActivityAt < IDLE_GRACE_MS
  );
}

/**
 * Satu panggilan per tick rAF, dari pembungkus composer.render di
 * IdleFrameCap. Mengembalikan false = tick ini tidak digambar.
 *
 * Wajib dipanggil SETELAH semua useFrame priority 0 tick ini jalan (posisi
 * composer di priority 1 menjamin itu) — supaya markSceneActivity dari
 * CameraController di tick yang sama sudah terbaca.
 */
export function shouldDrawThisTick(now: number = performance.now()): boolean {
  tick++;
  const draw = isSceneActive(now) || tick % 2 === 0;
  if (draw) drawn++;
  return draw;
}

/** Khusus test — kembalikan seluruh state modul ke kondisi awal. */
export function resetPace(): void {
  lastActivityAt = -Infinity;
  tick = 0;
  drawn = 0;
}

// Jendela intip untuk skrip probe CDP (scripts/): store R3F tidak terjangkau
// dari luar canvas, counter ini satu-satunya cara memverifikasi cap-nya
// benar-benar melewati frame. drawn/ticks ≈ 0,5 saat idle, ≈ 1,0 saat aktif.
declare global {
  interface Window {
    __renderPace?: () => { ticks: number; drawn: number };
  }
}
if (typeof window !== "undefined") {
  window.__renderPace = () => ({ ticks: tick, drawn });
}
