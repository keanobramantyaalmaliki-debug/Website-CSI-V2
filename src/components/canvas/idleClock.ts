/**
 * Jam idle bersama — satu sumber kebenaran untuk "sudah berapa lama pengunjung
 * tidak menyentuh apa pun".
 *
 * Sebelumnya jam ini tinggal di dalam CharacterGlitch.tsx (8 Agu), satu-satunya
 * efek yang membutuhkannya. Begitu efek idle KEDUA muncul, menyalin blok
 * listener itu adalah pilihan yang salah dengan dua cara sekaligus:
 *
 *   1. Tiap salinan membawa jebakan visibilitychange-nya sendiri (lihat di
 *      bawah) — dan salinan yang lupa memasangnya rusak dengan cara yang cuma
 *      terlihat kalau seseorang kebetulan pindah tab lalu kembali.
 *   2. Efek-efeknya tidak lagi menyeberang ke idle BERSAMAAN. Dua ambang 8
 *      detik yang dihitung dari dua timestamp berbeda meleset beberapa ratus
 *      milidetik, dan yang terbaca bukan "kantornya sepi" melainkan dua
 *      kejadian terpisah yang kebetulan berdekatan.
 *
 * Jadi listener DOM-nya satu set untuk seluruh aplikasi (dihitung referensinya
 * di useIdleClock), sedangkan AMBANG-nya milik masing-masing pemakai: glitch
 * karakter menunggu 8 detik, layar tidur menunggu jauh lebih lama. Yang dibagi
 * adalah jamnya, bukan definisi "idle".
 *
 * ── Dua cara membacanya, dan kapan memakai yang mana ────────────────────────
 *
 *   idleFor()    — di dalam useFrame. Tidak memicu render React sama sekali.
 *                  Untuk efek yang menganimasikan sesuatu tiap frame.
 *   useIdleFlag() — boolean React. Untuk efek yang harus BEREAKSI pada momen
 *                  penyeberangan (mis. useEffect yang mem-pause video), dan
 *                  yang karenanya tidak boleh bergantung pada render loop —
 *                  FrameloopGate mematikan useFrame total saat hero di-scroll
 *                  lewat, dan perintah yang menumpang useFrame tidak pernah
 *                  sampai. Kelas bug yang sudah pernah menggigit repo ini;
 *                  lihat catatan panjang di ScreenVideoGate (Office.tsx).
 */
import { useEffect, useState } from "react";

/**
 * Ambang idle bawaan (ms) — dipakai glitch karakter. 8 detik: cukup lama supaya
 * jeda membaca biasa (scroll berhenti sebentar) tidak memicunya, cukup pendek
 * supaya orang yang memang menonton kantornya masih kebagian efeknya.
 */
export const IDLE_MS = 8000;

/**
 * Timestamp input terakhir. Module-level, bukan di dalam hook: listener-nya
 * hidup-mati mengikuti mount komponen, tapi NILAINYA sengaja selamat dari
 * remount (ChunkBoundary, replay StrictMode) — remount bukan interaksi
 * pengunjung, dan jam yang ter-reset karenanya membuat efek idle mulai
 * menghitung dari nol tanpa ada yang benar-benar terjadi.
 *
 * Diinisialisasi ke waktu muat modul, BUKAN 0: pembaca yang datang sebelum
 * listener pertama terpasang akan membaca `now - 0` = angka raksasa, yaitu
 * "idle sejak awal waktu". Efek idle bisa menyala sebelum halamannya sempat
 * dilihat orang.
 */
let lastInputAt = typeof performance !== "undefined" ? performance.now() : 0;

/** Pelanggan useIdleFlag. Diberi tahu tiap bump supaya bisa memasang ulang
 *  timer-nya dari timestamp yang BARU — lihat catatan urutan di attach(). */
const subscribers = new Set<() => void>();

/**
 * Event yang dihitung sebagai "pengunjung masih di sini".
 *
 * pointermove menyala ratusan kali per detik, jadi handler-nya tidak boleh
 * mengerjakan apa pun selain menulis satu angka + memberi tahu pelanggan (yang
 * jumlahnya nol selama tidak ada yang memakai useIdleFlag).
 */
const EVENTS = [
  "pointermove",
  "pointerdown",
  "wheel",
  "keydown",
  "touchstart",
] as const;

/** Berapa lama (ms) sejak input terakhir. Aman dipanggil dari useFrame. */
export function idleFor(now = performance.now()): number {
  return now - lastInputAt;
}

/** Tandai "baru saja ada input". Dipanggil listener; diekspor untuk test. */
export function bumpIdleClock(): void {
  lastInputAt = performance.now();
  for (const notify of subscribers) notify();
}

let refCount = 0;
let detach: (() => void) | null = null;

function attach(): () => void {
  const bump = () => bumpIdleClock();
  for (const e of EVENTS) window.addEventListener(e, bump, { passive: true });

  // Kembali dari tab lain ≠ idle: tanpa reset ini, jam idle terus berjalan
  // selama tab tersembunyi dan pengunjung yang baru kembali langsung disambut
  // efek idle — terbaca "pas saya balik kok rusak", bukan easter egg.
  const onVisibility = () => {
    if (document.visibilityState === "visible") bump();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    for (const e of EVENTS) window.removeEventListener(e, bump);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

/**
 * Pasang listener jam idle selama komponen ter-mount. Aman dipanggil dari
 * beberapa komponen sekaligus: yang terpasang tetap SATU set (dihitung
 * referensinya), jadi menambah efek idle baru tidak menambah beban di jalur
 * pointermove.
 */
export function useIdleClock(): void {
  useEffect(() => {
    // bump HANYA saat pemasang pertama. Kalau tiap pemasang ikut nge-bump,
    // komponen yang mount belakangan (mis. layar tidur yang baru di-mount saat
    // pengunjung masuk ruangan) akan me-reset jam milik efek yang SUDAH
    // menghitung — hitungan idle jadi mundur tanpa ada input apa pun.
    if (refCount++ === 0) {
      bumpIdleClock();
      detach = attach();
    }
    return () => {
      if (--refCount === 0) {
        detach?.();
        detach = null;
      }
    };
  }, []);
}

/**
 * Berapa sering memeriksa ambang saat pengunjung sedang TERJAGA (ms).
 *
 * Polling, bukan timer yang dipasang ulang tiap event: pointermove bisa menyala
 * 500×/detik, dan clearTimeout+setTimeout sesering itu jauh lebih mahal
 * daripada satu pemeriksaan per detik. Konsekuensinya penyeberangan KE idle
 * bisa telat sampai 1 detik — tidak masalah untuk ambang berpuluh detik, dan
 * arah sebaliknya (bangun) tidak lewat sini sama sekali.
 */
const POLL_MS = 1000;

/** Event yang membangunkan. Sama dengan EVENTS — dipisah supaya jelas bahwa
 *  keduanya boleh berbeda kalau nanti ada alasan (mis. scroll tidak
 *  membangunkan layar). */
const WAKE_EVENTS = EVENTS;

/**
 * Boolean React: true saat pengunjung sudah diam selama `threshold` ms.
 *
 * Asimetris, dan itu disengaja — dua arahnya punya tuntutan yang berbeda:
 *
 *   tidur  → boleh telat sampai POLL_MS. Tidak ada yang menunggu.
 *   bangun → harus terasa SEKETIKA. Jeda satu detik antara menggerakkan mouse
 *            dan layar menyala kembali terbaca sebagai website yang lemot,
 *            bukan sebagai kantor yang bangun.
 *
 * Makanya listener pembangun cuma terpasang SELAMA tidur. Saat terjaga —
 * yaitu hampir sepanjang waktu — hook ini tidak menempel apa pun di
 * pointermove dan ongkosnya persis satu interval per detik.
 */
export function useIdleFlag(threshold = IDLE_MS): boolean {
  const [idle, setIdle] = useState(false);
  useIdleClock();

  useEffect(() => {
    if (idle) {
      const wake = () => setIdle(false);
      // once: tiap listener melepas dirinya sendiri setelah dipakai; cleanup di
      // bawah membereskan sisanya yang tidak kebagian menyala.
      for (const e of WAKE_EVENTS) {
        window.addEventListener(e, wake, { passive: true, once: true });
      }
      // Bangun juga saat tab kembali terlihat: bump() dari attach() sudah
      // memajukan jam, tapi tanpa ini flag-nya baru turun pada gerakan pertama.
      const onVisibility = () => {
        if (document.visibilityState === "visible") setIdle(false);
      };
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        for (const e of WAKE_EVENTS) window.removeEventListener(e, wake);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }

    const id = window.setInterval(() => {
      if (idleFor() >= threshold) setIdle(true);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [idle, threshold]);

  return idle;
}
