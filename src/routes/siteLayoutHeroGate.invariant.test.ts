/**
 * PENJAGA INVARIANT — loader dan Hero digerbangi flag yang SAMA
 *
 * ── Kegagalan yang dijaga ───────────────────────────────────────────────────
 * LoadingScreen adalah overlay z-[60] yang menutupi SELURUH situs, dan
 * satu-satunya pintu keluarnya `sceneReady` — flag yang cuma dinyalakan
 * useFrame di dalam <Scene/>, yang hidup di dalam <Hero/> (INVARIANTS §3).
 *
 * Halaman lowongan sengaja TIDAK me-mount Hero pada deep-link dingin: pelamar
 * yang membuka tautan lowongan tidak perlu membayar unduhan office.glb. Tapi
 * kalau LoadingScreen tetap dirender tanpa syarat di sana, <Scene/> tidak
 * pernah ada → sceneReady selamanya false → layar putih permanen menutupi
 * halaman lowongan. Kegagalan total, dari satu baris JSX yang kelihatan
 * sepenuhnya wajar.
 *
 * Jadi keduanya harus digerbangi flag yang sama: kalau Hero tidak mount,
 * loader-nya juga tidak.
 *
 * ── Kenapa membaca teks, bukan me-render ───────────────────────────────────
 * Me-render SiteLayout menyeret Hero → Scene → three + postprocessing ke jsdom
 * yang tidak punya WebGL. Yang perlu dijaga jauh lebih sederhana dan memang
 * bisa dibaca: kedua komponen itu berdiri di belakang gerbang yang sama.
 * Pola yang sama dipakai loaderGate.invariant.test.tsx dan RoomRouteSync.test.tsx.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "SiteLayout.tsx"),
  "utf8",
);

/** Komentar dibuang — prosa yang menjelaskan gerbangnya tidak menjaga apa pun. */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/** Nama flag gerbangnya. Kalau diganti, ganti juga di sini — sengaja. */
const GATE = "heroMounted";

describe("SiteLayout: loader & Hero berbagi satu gerbang", () => {
  it("<LoadingScreen /> berada di belakang gerbang", () => {
    expect(
      CODE.includes(`{${GATE} && <LoadingScreen />}`),
      "<LoadingScreen /> dirender tanpa syarat di SiteLayout.tsx.\n\n" +
        "Di halaman lowongan Hero sengaja tidak di-mount, jadi <Scene/> tidak " +
        "pernah ada dan sceneReady tidak pernah menyala — overlay putih z-[60] " +
        "menutupi halaman itu SELAMANYA.\n\n" +
        `Gerbangi dengan flag yang sama seperti Hero: {${GATE} && <LoadingScreen />}. ` +
        "Lihat INVARIANTS.md §3.\n",
    ).toBe(true);
  });

  it("<Hero /> berada di belakang gerbang yang sama", () => {
    const hero = CODE.indexOf("<Hero />");
    const gate = CODE.indexOf(`{${GATE} && (`);

    expect(
      hero !== -1 && gate !== -1 && gate < hero,
      `<Hero /> di SiteLayout.tsx tidak lagi digerbangi \`${GATE}\`.\n\n` +
        "Kalau Hero dirender tanpa syarat, deep-link ke halaman lowongan ikut " +
        "mengunduh & mengompilasi office.glb untuk halaman yang isinya teks.\n",
    ).toBe(true);
  });

  /*
   * Gerbangnya SATU ARAH. `heroMounted` boleh berubah false→true, tidak pernah
   * sebaliknya — kalau ia bisa kembali false, keluar dari halaman lowongan akan
   * meng-unmount <Canvas> dan mengunduh ulang GLB-nya, persis yang dihindari
   * seluruh berkas ini.
   */
  it("gerbangnya tidak pernah dimatikan lagi", () => {
    expect(
      /setHeroMounted\(\s*false\s*\)/.test(CODE),
      "Ada `setHeroMounted(false)` di SiteLayout.tsx. Itu meng-unmount " +
        "<Canvas> milik Hero — office.glb diunduh & dikompilasi ulang tiap " +
        "pengunjung keluar-masuk halaman lowongan.\n\n" +
        "Sembunyikan Hero lewat className pembungkusnya, jangan dilepas.\n",
    ).toBe(false);
  });

  /*
   * ⚠️ Pembungkusnya WAJIB memotong tanpa mengubah UKURAN canvas.
   * `hidden`/display:none membuat canvas 0×0, dan R3F menyusul layout ~58 ms di
   * belakang DOM — kembali ke ruangan jadi berkedip (memory
   * r3f-canvas-resize-lag). `h-0 overflow-hidden` memotong habis sementara
   * <section> di dalamnya tetap h-dvh (relatif viewport, bukan induk).
   */
  it("Hero disembunyikan dengan clip, bukan display:none", () => {
    expect(
      CODE.includes("h-0 overflow-hidden"),
      "Pembungkus Hero di SiteLayout.tsx tidak lagi memakai " +
        "`h-0 overflow-hidden`. Kalau diganti `hidden` (display:none), canvas " +
        "jadi 0×0 dan R3F menyusul layout ~58 ms di belakang DOM — kembali ke " +
        "ruangan akan berkedip.\n",
    ).toBe(true);
  });
});
