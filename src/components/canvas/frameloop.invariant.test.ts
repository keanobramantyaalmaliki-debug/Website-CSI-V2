/**
 * PENJAGA INVARIANT — `frameloop="demand"` ↔ `invalidate()`
 *
 * ── Kenapa test ini ada ─────────────────────────────────────────────────────
 * 29 Jul, commit df27f3d menambahkan `frameloop="demand"` ke Scene.tsx. Itu
 * optimasi yang sah dan dikerjakan dengan teliti: `invalidate()` ikut
 * ditambahkan di CameraController & SceneEnvironment, yaitu semua tempat yang
 * MEMANG ADA saat itu.
 *
 * Tujuh menit sebelumnya, cabang feature/screen-content berangkat dari main.
 * Ia membawa tiga `useFrame` baru — Office (sapuan reveal), Waypoints, dan
 * BilliardGame — yang tidak pernah tahu kontrak `demand` ada, karena kontraknya
 * belum lahir saat cabang itu dibuat.
 *
 * Saat digabung di 96df186, git TIDAK melaporkan konflik pada Scene.tsx:
 * `frameloop` ada di baris 41 dan `useFrame` baru ada di file lain, jadi
 * auto-merge sukses secara tekstual. Yang rusak adalah semantiknya:
 *
 *   - reveal sweep terpasang di progress 0 → seluruh kantor di-`discard`
 *   - loop berhenti karena tak ada yang memanggil `invalidate()`
 *   - layar BEKU, tapi navigasi tetap jalan (CameraController punya invalidate)
 *   - `sweep.dispose()` tak pernah tercapai → 233 material menghitung
 *     dither + discard selamanya → lag berat di GPU integrated
 *
 * ── Kenapa berupa test teks, bukan lint rule atau type ──────────────────────
 * Tidak ada yang bisa menangkap ini lewat jalur biasa, dan itu sudah dicek:
 *   - `tsc --noEmit` lolos — semua type-nya benar
 *   - `eslint` lolos — tak ada aturan yang tahu soal frameloop
 *   - render test lolos — R3F butuh WebGL, jsdom tidak punya
 *
 * Yang dilanggar adalah kontrak ANTAR-FILE, dan satu-satunya cara murah
 * memeriksanya adalah membaca sumbernya. Test ini sengaja tidak me-render
 * apa pun.
 *
 * ── Batas yang jujur ────────────────────────────────────────────────────────
 * Ini pemeriksaan teks, jadi ia tahu `invalidate` DISEBUT di sebuah file, bukan
 * bahwa ia dipanggil di tempat yang benar. Sebuah file bisa lolos test ini dan
 * tetap salah. Yang ia jamin: tidak ada file yang lupa TOTAL — dan itu persis
 * kegagalan yang terjadi kemarin.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath, bukan `new URL(".", import.meta.url).pathname`: yang kedua
// mengembalikan path relatif terhadap root vitest ("/src/components/…") dan
// readFileSync mencarinya dari root filesystem.
const CANVAS_DIR = dirname(fileURLToPath(import.meta.url));

/** Semua .ts/.tsx di src/components/canvas, termasuk billiard/. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...sourceFiles(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    // Jangan periksa berkas test itu sendiri — ia menyebut kedua kata ini
    // di komentar dan akan mencocoki polanya sendiri.
    if (entry.name.includes(".test.")) continue;
    out.push(full);
  }
  return out;
}

/**
 * Buang komentar sebelum mencari kata kunci.
 *
 * Wajib: berkas di folder ini komentarnya panjang dan sering MENYEBUT
 * `invalidate` justru saat menjelaskan kenapa sesuatu tidak dipanggil. Tanpa
 * dibuang, komentar semacam itu membuat file lolos padahal kodenya tidak
 * memanggil apa pun — persis kebalikan dari yang ingin dijaga.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

describe("frameloop='demand' mewajibkan invalidate()", () => {
  const scene = readFileSync(join(CANVAS_DIR, "Scene.tsx"), "utf8");
  const sceneUsesDemand = /frameloop\s*=\s*["'{]?\s*["']?demand/.test(
    stripComments(scene),
  );

  it("setiap useFrame di canvas/ ikut memanggil invalidate saat Scene on-demand", () => {
    // Scene 3D utama render tiap frame → tidak ada kontrak yang perlu dijaga.
    // Test ini menjaga diam, dan itu memang jawabannya yang benar.
    if (!sceneUsesDemand) return;

    const offenders = sourceFiles(CANVAS_DIR)
      .map((path) => ({ path, code: stripComments(readFileSync(path, "utf8")) }))
      .filter(({ code }) => code.includes("useFrame"))
      .filter(({ code }) => !code.includes("invalidate"))
      .map(({ path }) => path.slice(path.indexOf("src/")));

    expect(
      offenders,
      `Scene.tsx memakai frameloop="demand", jadi canvas hanya menggambar saat ` +
        `ada yang memanggil invalidate(). Berkas berikut punya useFrame tapi ` +
        `tidak pernah memanggilnya — animasinya akan BEKU di layar:\n\n` +
        offenders.map((f) => `  • ${f}`).join("\n") +
        `\n\nPilih salah satu: tambahkan invalidate() di tiap tick useFrame-nya, ` +
        `atau buang frameloop="demand" dari Scene.tsx.\n` +
        `Lihat INVARIANTS.md §1.\n`,
    ).toEqual([]);
  });
});
