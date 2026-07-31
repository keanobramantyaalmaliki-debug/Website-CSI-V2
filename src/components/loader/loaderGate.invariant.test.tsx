/**
 * PENJAGA INVARIANT — overlay loader HARUS selalu punya jalan keluar
 *
 * ── Kegagalan yang dijaga ───────────────────────────────────────────────────
 * LoadingScreen adalah overlay putih z-[60] yang menutupi SELURUH situs,
 * termasuk navbar. Ia hanya memulai outro saat `sceneReady` bernilai true, dan
 * satu-satunya yang menyalakan flag itu adalah useFrame di Office.tsx — yang
 * hidup di dalam <Scene/>.
 *
 * Artinya setiap kondisi yang membuat <Scene/> tidak di-mount adalah kondisi di
 * mana situsnya TIDAK BISA DIPAKAI SAMA SEKALI. Satu ditemukan saat loader
 * digabung ke main: Hero.tsx punya jalur `prefers-reduced-motion` yang
 * mengganti <Scene/> dengan <StaticHero/>. Di jalur itu sceneReady selamanya
 * false, dan bahkan jaring pengaman 1500 ms di LoadingScreen tidak menolong —
 * ia sendiri digerbangi `if (!sceneReady) return`.
 *
 * Kegagalannya total (layar putih permanen) tapi penyebabnya tak terlihat: dua
 * komponen yang masing-masing benar, ditulis di dua cabang berbeda, rusak hanya
 * saat bertemu. Persis pola yang sama dengan bug frameloop 96df186 — lihat
 * frameloop.invariant.test.ts.
 *
 * ── Kenapa test ini me-render sungguhan ─────────────────────────────────────
 * Berbeda dengan penjaga frameloop yang membaca teks, di sini yang perlu
 * dibuktikan adalah PERILAKU: overlay benar-benar menyingkir. jsdom cukup untuk
 * itu — LoadingScreen tidak butuh WebGL, ia canvas 2D + div. Jalur worker
 * memang tidak tersedia di jsdom, jadi yang teruji adalah jalur cadangan dan
 * jaring pengamannya. Itu justru yang tepat: keduanya pengaman terakhir, dan
 * pengaman yang tak pernah dites adalah pengaman yang tak bisa dipercaya.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useSceneStore } from "@/lib/store/sceneStore";
import LoadingScreen from "./LoadingScreen";

/** Kembalikan store ke kondisi awal — zustand berbagi state antar test. */
beforeEach(() => {
  useSceneStore.setState({ sceneReady: false, loaderDone: false });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Overlay dikenali dari z-[60]-nya; itu yang membuatnya menutupi segalanya. */
function overlay(): HTMLElement | null {
  return document.querySelector(".z-\\[60\\]");
}

describe("LoadingScreen selalu punya jalan keluar", () => {
  /**
   * ⚠️ Tidak ada test "overlay bertahan selama sceneReady false" di sini, dan
   * itu bukan kelalaian.
   *
   * jsdom tidak mengimplementasikan `HTMLCanvasElement.getContext()` sama
   * sekali — ia mengembalikan null. LoadingScreen menangani itu persis seperti
   * yang dirancang (lihat startLocal(): `if (!ctx) { finish(); return; }`):
   * kalau tidak ada satu pun jalur yang bisa menggambar, overlay dilepas SEGERA,
   * karena layar putih tanpa animasi jauh lebih baik daripada layar putih yang
   * menutupi kantor selamanya.
   *
   * Jadi di jsdom overlay memang menghilang seketika, dan itu perilaku yang
   * BENAR. Menuliskannya sebagai kegagalan cuma akan menghasilkan test merah
   * yang memaksa orang berikutnya melemahkan kode produksi agar test-nya hijau.
   *
   * Sisi "overlay bertahan" karena itu diverifikasi di browser sungguhan, bukan
   * di sini. Yang dijaga berkas ini adalah arah sebaliknya — bahwa overlay
   * selalu punya jalan KELUAR, karena itu kegagalan yang membuat situs mati
   * total dan yang benar-benar pernah terjadi.
   */
  it("menyingkir setelah sceneReady, walau 'done' dari worker tak pernah datang", () => {
    render(<LoadingScreen />);

    act(() => {
      useSceneStore.getState().setSceneReady(true);
    });

    // Jaring pengaman di LoadingScreen: OUTRO_MS (900) + BG_FADE_MS (600).
    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(
      overlay(),
      "Overlay putih masih menutupi layar >1,5 detik setelah kantor siap. " +
        "Jaring pengaman di LoadingScreen tidak bekerja — situs jadi tidak " +
        "bisa dipakai sama sekali. Lihat INVARIANTS.md §3.",
    ).toBeNull();
  });

  it("membuka gerbang loaderDone supaya sapuan reveal bisa mulai", () => {
    render(<LoadingScreen />);

    act(() => {
      useSceneStore.getState().setSceneReady(true);
    });
    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(
      useSceneStore.getState().loaderDone,
      "loaderDone tidak pernah true. Sapuan reveal di Office.tsx menahan " +
        "kantor di progress 0 sampai gerbang ini terbuka — kantor tidak akan " +
        "pernah tampil (kecuali lewat batas 3 detiknya sendiri).",
    ).toBe(true);
  });
});

/**
 * Penjaga yang paling penting di berkas ini: memastikan jalur reduced-motion
 * punya pemantik `sceneReady` sendiri.
 *
 * Dibaca dari teks, bukan dirender: me-render <Hero/> berarti menyeret Scene,
 * three, dan postprocessing ke jsdom yang tidak punya WebGL. Yang perlu dijaga
 * juga sederhana — keberadaan pemantiknya, bukan waktunya.
 */
describe("jalur reduced-motion tetap menyalakan sceneReady", () => {
  it("Hero.tsx menyetel sceneReady saat <Scene/> tidak di-mount", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    const hero = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "../sections/Hero.tsx",
      ),
      "utf8",
    );

    const code = hero.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

    // Hero hanya perlu pemantik ini SELAMA ia masih punya cabang yang
    // melewatkan <Scene/>. Kalau StaticHero dihapus nanti, syaratnya ikut gugur
    // dengan sendirinya — test tidak memaksa mempertahankan kode mati.
    //
    // Catatan (31 Jul): percabangan `reduced ? <StaticHero/> : <Scene/>` hilang
    // dari render saat resolusi konflik di PR #4, jadi saat ini <Scene/> selalu
    // di-mount dan bug-nya tidak aktif. Penanda `StaticHero` sengaja tetap
    // dipakai di sini: komponennya masih ada di berkas, jadi test tetap menjaga
    // untuk saat percabangannya dikembalikan — persis kondisi di mana bug itu
    // hidup lagi.
    const skipsScene = code.includes("StaticHero") || code.includes("reduced ?");
    if (!skipsScene) return;

    expect(
      code.includes("setSceneReady"),
      "Hero.tsx punya cabang yang TIDAK me-mount <Scene/> (reduced-motion), " +
        "tapi tidak menyalakan sceneReady sendiri. Karena satu-satunya pemantik " +
        "sceneReady ada di Office.tsx (di dalam Scene), overlay loader akan " +
        "menutupi situs SELAMANYA di jalur itu. Lihat INVARIANTS.md §3.",
    ).toBe(true);
  });
});
