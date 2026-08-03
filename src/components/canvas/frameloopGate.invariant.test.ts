/**
 * PENJAGA INVARIANT — gate frameloop wajib terpasang & wajib menunggu sceneReady
 *
 * ── Kenapa test ini ada ─────────────────────────────────────────────────────
 * 4 Agu: `useGatedFrameloop()` menyetel frameloop "never" saat hero di-scroll
 * lewat, supaya canvas tidak merender 60 fps di balik pembungkus opacity 0
 * (keluhan "laptop panas saat baca konten"). Dua cara kontrak ini bisa rusak
 * diam-diam, dan dua-duanya lolos typecheck + lint + render test:
 *
 *   1. Prop `frameloop={...}` hilang dari <Canvas> di Scene.tsx — mis. saat
 *      resolusi konflik merge, cara persis §3 kehilangan `StaticHero` dan
 *      `.ambient-grid` (INVARIANTS.md). Tidak ada yang error; laptopnya cuma
 *      panas lagi.
 *   2. Kondisinya "disederhanakan" jadi `heroInView` saja, tanpa
 *      `|| !sceneReady`. Terlihat masuk akal — heroInView default true — tapi
 *      reload di posisi scroll tengah halaman membuat observer menyetelnya
 *      false SEBELUM GLB selesai dimuat: loop pause sebelum frame pertama,
 *      `sceneReady` tak pernah dipancarkan Office.tsx, dan overlay loader
 *      menutupi situs SELAMANYA (kegagalan §3, yang terburuk di repo ini).
 *
 * ── Kenapa bentuknya PROP, dan test ini ikut menjaganya ─────────────────────
 * Versi pertama fix ini adalah komponen dalam Canvas yang memanggil
 * setFrameloop() imperatif — terukur GAGAL: tiap re-render <Canvas> (dipicu
 * react-use-measure saat fade scroll men-scale pembungkus) menyinkronkan
 * ulang prop frameloop yang tidak diset = "always", menimpa panggilan
 * imperatif. Kalau seseorang "merapikan" kembali ke bentuk komponen, test #1
 * akan merah karena prop-nya hilang dari Scene.tsx.
 *
 * ── Batas yang jujur ────────────────────────────────────────────────────────
 * Sama seperti frameloop.invariant.test.ts: ini pemeriksaan teks. Ia menjamin
 * prop-nya tersambung dan kedua nama flag DISEBUT di kode gate — bukan bahwa
 * logikanya benar. File bisa lolos test ini dan tetap salah; yang dijaga
 * adalah dua kegagalan "lupa total" di atas, yang persis jenis kerusakan
 * merge yang sudah dua kali terjadi (§1, §3).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CANVAS_DIR = dirname(fileURLToPath(import.meta.url));

/** Buang komentar — file di folder ini menyebut nama flag justru saat
 *  menjelaskan kenapa sesuatu TIDAK dipakai. Pola sama dengan
 *  frameloop.invariant.test.ts. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

describe("gate frameloop (INVARIANTS.md §7)", () => {
  const scene = stripComments(
    readFileSync(join(CANVAS_DIR, "Scene.tsx"), "utf8"),
  );

  it("Scene.tsx memasang hasil useGatedFrameloop ke prop frameloop Canvas", () => {
    const wired =
      scene.includes("useGatedFrameloop") && /frameloop=\{/.test(scene);
    expect(
      wired,
      `Scene.tsx tidak lagi menyambungkan useGatedFrameloop() ke prop ` +
        `frameloop di <Canvas>. Tanpa itu canvas merender 60 fps selamanya — ` +
        `termasuk di balik pembungkus opacity 0 setelah pengunjung scroll ` +
        `melewati hero. Ini penyebab keluhan "laptop panas" 3 Agu.\n\n` +
        `Wajib berupa PROP, bukan setFrameloop() imperatif dari dalam Canvas — ` +
        `bentuk imperatif sudah dicoba dan ditimpa balik oleh sync prop R3F ` +
        `tiap re-render (lihat FrameloopGate.tsx). Kalau gate memang sengaja ` +
        `dicabut, buang juga test ini dan §7 di INVARIANTS.md dalam commit ` +
        `yang sama.\n`,
    ).toBe(true);
  });

  it("kondisi gate menyebut heroInView DAN sceneReady", () => {
    const gate = stripComments(
      readFileSync(join(CANVAS_DIR, "FrameloopGate.tsx"), "utf8"),
    );
    const missing = ["heroInView", "sceneReady"].filter(
      (flag) => !gate.includes(flag),
    );
    expect(
      missing,
      `FrameloopGate.tsx tidak lagi membaca: ${missing.join(", ")}.\n\n` +
        `Dua-duanya wajib. Tanpa sceneReady: reload di posisi scroll tengah ` +
        `halaman mem-pause loop SEBELUM frame pertama, sinyal sceneReady dari ` +
        `Office.tsx tak pernah datang, dan overlay loader menutupi situs ` +
        `SELAMANYA (INVARIANTS.md §3 & §7). Tanpa heroInView: gate tidak ` +
        `pernah pause dan kembali memboroskan GPU.\n`,
    ).toEqual([]);
  });
});
