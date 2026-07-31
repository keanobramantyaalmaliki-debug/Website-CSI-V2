/// <reference lib="webworker" />

/**
 * Worker perender animasi loading.
 *
 * ── Kenapa ini ada sama sekali ──────────────────────────────────────────────
 * Animasinya bisa saja digambar di main thread — tapi justru di sanalah
 * masalahnya. Setelah office.glb selesai diunduh, three memblokir main thread
 * SELAMA 2,32 DETIK untuk mengompilasi 233 shader material dan mengunggah 91
 * texture. Angkanya terukur, tercatat di Office.tsx:352-372.
 *
 * Kanvas 2D menggambar di thread yang sama, jadi animasi main-thread akan
 * MEMBEKU tepat 2,3 detik di detik-detik terakhir sebelum kantor muncul —
 * persis kesan "halaman ini nge-hang" yang mau dihindari. Dengan OffscreenCanvas
 * di worker, putarannya jalan terus menembus stall itu.
 *
 * Hari ini masalah tersebut tersamar karena loadernya cuma teks yang keburu
 * hilang: yang terlihat cuma layar hitam diam, yang terbaca seperti "masih
 * memuat". Begitu ada yang bergerak di situ, bekunya jadi kasat mata.
 */
import { createIntroAnimation, type IntroAnimation } from "./introAnimation";
import type { FromWorker, ToWorker } from "./introMessages";

const self_ = self as unknown as DedicatedWorkerGlobalScope;

let anim: IntroAnimation | null = null;
/** Disimpan karena resize perlu menyetel ulang width/height-nya. */
let surface: OffscreenCanvas | null = null;
let rafId: number | null = null;
let timerId: ReturnType<typeof setTimeout> | null = null;

/**
 * `requestAnimationFrame` ADA di DedicatedWorkerGlobalScope — sudah dicek di
 * typings TypeScript (lib.webworker.d.ts:1197) — tapi dukungan browsernya belum
 * merata; Safari termasuk yang belum. Karena itu dideteksi saat runtime, bukan
 * diasumsikan ada.
 *
 * Cadangannya setTimeout 16 ms ≈ 60 fps. Kurang presisi dan tidak ikut berhenti
 * saat tab disembunyikan, tapi animasinya digerakkan CAP WAKTU (performance.now
 * dioper ke frame()), bukan hitungan frame — jadi jitter timer tidak membuat
 * animasinya melar atau meleset, cuma sedikit kurang halus.
 */
const hasRaf = typeof self_.requestAnimationFrame === "function";

function schedule(cb: () => void) {
  if (hasRaf) {
    rafId = self_.requestAnimationFrame(cb);
  } else {
    timerId = setTimeout(cb, 16);
  }
}

function stop() {
  if (rafId !== null) {
    self_.cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
}

function loop() {
  if (!anim) return;

  anim.frame(performance.now());

  if (anim.isFinished()) {
    stop();
    const done: FromWorker = { type: "done" };
    self_.postMessage(done);
    return;
  }

  schedule(loop);
}

self_.onmessage = (e: MessageEvent<ToWorker>) => {
  const msg = e.data;

  switch (msg.type) {
    case "init": {
      // Pesan init kedua tidak mungkin datang dalam pemakaian normal, tapi
      // diabaikan saja daripada menggambar dua loop di kanvas yang sama.
      if (anim) return;

      const { canvas, width, height, dpr, reduced } = msg;
      surface = canvas;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      // alpha WAJIB true (dan itu memang default): batang digambar dengan
      // `destination-out` untuk MELUBANGI lingkaran, dan tanpa saluran alpha
      // lubangnya tidak akan tembus. Ditulis eksplisit supaya tidak ada yang
      // "mengoptimalkan"-nya jadi false — lihat catatan di introAnimation.ts.
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;

      anim = createIntroAnimation({ ctx, width, height, dpr, reduced });
      schedule(loop);
      return;
    }

    case "resize": {
      if (!anim || !surface) return;
      const { width, height, dpr } = msg;
      // Menyetel width/height MERESET seluruh state context, termasuk transform
      // DPR. Karena itu anim.resize() memasangnya ulang setelah ini — urutan
      // kedua baris ini tidak boleh dibalik.
      surface.width = Math.round(width * dpr);
      surface.height = Math.round(height * dpr);
      anim.resize(width, height, dpr);
      return;
    }

    case "outro": {
      if (!anim) return;
      anim.startOutro(performance.now());
      return;
    }
  }
};
