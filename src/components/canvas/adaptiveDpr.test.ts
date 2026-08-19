/**
 * Adaptive dpr (adaptiveDpr.ts + AdaptiveDpr.tsx) — yang paling penting
 * dijaga adalah TIGA JEBAKAN yang diminta eksplisit 19 Agu:
 *
 * 1. Cap OS (Low Power Mode Safari, rAF 30 fps): 33,3 ms rata + idle yang
 *    juga 33,3 ms = TAHAN, jangan turunkan dpr. Sebaliknya 33,3 ms rata +
 *    idle yang pulih ke 16,7 ms = GPU jenuh terkunci vsync (persis gejala
 *    Safari yang jadi pemicu semua ini) = TURUNKAN. Dua kasus ini kembar
 *    di jendela aktif dan hanya bisa dibedakan lewat jendela idle.
 * 2. Sampel jujur: keputusan hanya dari sampel fase aktif (diuji lewat
 *    kontrak isSceneActive di renderPace — pemeriksaan teks di bawah).
 * 3. ?dpr= menang: AdaptiveDpr tidak di-mount saat ada override —
 *    pemeriksaan teks di Scene.tsx.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AdaptiveDprController,
  classifyWindows,
  COOLDOWN_TICKS,
  DPR_LADDER,
  loadLadderIndex,
  saveLadderIndex,
  WINDOW,
} from "./adaptiveDpr";

const CANVAS_DIR = dirname(fileURLToPath(import.meta.url));

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

const fill = (n: number, ms: number) => Array.from({ length: n }, () => ms);
/** 60 fps sehat: 16,7 ms rata. */
const healthy = () => fill(WINDOW, 16.7);
/** 30 fps rata sempurna — kembarnya cap OS dan GPU jenuh terkunci vsync. */
const flat30 = (n = WINDOW) => fill(n, 33.3);
/** GPU keteteran yang tidak terkunci vsync: bergetar di sekitar 25 ms. */
const jittery = () =>
  Array.from({ length: WINDOW }, (_, i) => (i % 2 === 0 ? 20 : 30));

describe("classifyWindows — membedakan cap OS dari GPU jenuh", () => {
  it("33,3 ms rata + idle juga 33,3 ms = os-capped (Low Power Mode)", () => {
    expect(classifyWindows(flat30(), flat30(WINDOW / 2))).toBe("os-capped");
  });

  it("33,3 ms rata + idle pulih ke 16,7 ms = gpu-slow (kasus Safari)", () => {
    expect(classifyWindows(flat30(), fill(WINDOW / 2, 16.7))).toBe("gpu-slow");
  });

  it("33,3 ms rata TANPA bukti idle = os-capped (konservatif, tahan posisi)", () => {
    expect(classifyWindows(flat30(), [])).toBe("os-capped");
  });

  it("lambat bergetar = gpu-slow, tak peduli idle", () => {
    expect(classifyWindows(jittery(), [])).toBe("gpu-slow");
  });

  it("16,7 ms = healthy; jendela kurang = inconclusive", () => {
    expect(classifyWindows(healthy(), [])).toBe("healthy");
    expect(classifyWindows(fill(WINDOW - 1, 33.3), [])).toBe("inconclusive");
  });
});

/** Suapkan satu jendela sampel aktif; kembalikan keputusan terakhir. */
function feedWindow(c: AdaptiveDprController, samples: number[]): number | null {
  let out: number | null = null;
  for (const s of samples) out = c.feed(s, true) ?? out;
  return out;
}

function eatCooldown(c: AdaptiveDprController) {
  for (let i = 0; i < COOLDOWN_TICKS; i++) c.feed(16.7, true);
}

describe("AdaptiveDprController", () => {
  it("dua jendela gpu-slow beruntun → turun satu tangga", () => {
    const c = new AdaptiveDprController(0);
    expect(feedWindow(c, jittery())).toBeNull(); // satu jendela belum cukup
    expect(feedWindow(c, jittery())).toBe(DPR_LADDER[1]);
  });

  it("os-capped selamanya → tidak pernah turun", () => {
    const c = new AdaptiveDprController(0);
    // Selang-seling aktif & idle sama-sama 33,3 ms rata — pola Low Power Mode.
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < WINDOW; j++) {
        expect(c.feed(33.3, true)).toBeNull();
        expect(c.feed(33.3, false)).toBeNull();
      }
    }
    expect(c.index).toBe(0);
  });

  it("stall membuang jendela berjalan, bukan menghitungnya", () => {
    const c = new AdaptiveDprController(0);
    feedWindow(c, jittery());
    for (const s of jittery().slice(0, WINDOW - 1)) c.feed(s, true);
    c.feed(400, true); // kompilasi shader / pindah tab / pause FrameloopGate
    // Jendela kedua harus mulai dari nol lagi — satu sampel tidak memutuskan.
    expect(c.feed(30, true)).toBeNull();
    expect(c.index).toBe(0);
  });

  it("naik butuh streak healthy lebih panjang, dan bolak-balik kedua mengunci di tangga bawah", () => {
    const c = new AdaptiveDprController(0);
    // Turun: 2 jendela lambat.
    feedWindow(c, jittery());
    expect(feedWindow(c, jittery())).toBe(DPR_LADDER[1]);
    eatCooldown(c);
    // Naik: 4 jendela sehat (bolak-balik pertama).
    let up: number | null = null;
    for (let i = 0; i < 4; i++) up = feedWindow(c, healthy()) ?? up;
    expect(up).toBe(DPR_LADDER[0]);
    eatCooldown(c);
    // Turun lagi (bolak-balik kedua) → kunci di tangga BAWAH pasangan.
    feedWindow(c, jittery());
    expect(feedWindow(c, jittery())).toBe(DPR_LADDER[1]);
    expect(c.locked).toBe(true);
    // Terkunci: jendela sehat sebanyak apa pun tidak menaikkan lagi.
    eatCooldown(c);
    for (let i = 0; i < 8; i++) feedWindow(c, healthy());
    expect(c.index).toBe(1);
  });

  it("tidak turun melewati lantai tangga", () => {
    const c = new AdaptiveDprController(DPR_LADDER.length - 1);
    feedWindow(c, jittery());
    expect(feedWindow(c, jittery())).toBeNull();
    expect(c.index).toBe(DPR_LADDER.length - 1);
  });
});

describe("sessionStorage", () => {
  it("roundtrip; nilai rusak jatuh ke 0", () => {
    saveLadderIndex(2);
    expect(loadLadderIndex()).toBe(2);
    sessionStorage.setItem("csi-adaptive-dpr-index", "banyak");
    expect(loadLadderIndex()).toBe(0);
    sessionStorage.removeItem("csi-adaptive-dpr-index");
  });
});

describe("penyambungan tetap utuh (pemeriksaan teks)", () => {
  const scene = stripComments(
    readFileSync(join(CANVAS_DIR, "Scene.tsx"), "utf8"),
  );

  it("Scene.tsx me-mount AdaptiveDpr HANYA saat tidak ada override ?dpr=", () => {
    expect(
      /DPR_OVERRIDE === null && <AdaptiveDprDriver/.test(scene),
      `Scene.tsx tidak lagi menggerbangi <AdaptiveDprDriver/> dengan ` +
        `DPR_OVERRIDE === null (jebakan #3). Tanpa gerbang itu, A/B look ` +
        `lewat ?dpr= dilawan termostat dan angkanya tidak pernah bisa ` +
        `dipercaya; tanpa mount-nya sama sekali, perangkat lemah kembali ` +
        `lag permanen seperti laporan Safari 19 Agu.\n`,
    ).toBe(true);
  });

  it("prop dpr Canvas datang dari state React, bukan konstanta", () => {
    expect(
      scene.includes("dpr={dpr}") && scene.includes("useState"),
      `Prop dpr di <Canvas> Scene.tsx tidak lagi dikemudikan state React. ` +
        `setDpr() imperatif akan ditimpa sync prop R3F tiap re-render — ` +
        `pelajaran yang sama dengan FrameloopGate (terukur gagal 4 Agu).\n`,
    ).toBe(true);
  });

  it("AdaptiveDprDriver.tsx memakai isSceneActive dari renderPace (jebakan #2)", () => {
    const cmp = stripComments(
      readFileSync(join(CANVAS_DIR, "AdaptiveDprDriver.tsx"), "utf8"),
    );
    expect(
      cmp.includes("isSceneActive"),
      `AdaptiveDprDriver.tsx tidak lagi membedakan sampel aktif/idle lewat ` +
        `isSceneActive (renderPace.ts). Tanpa itu tick idle yang setengah ` +
        `nganggur mencemari pengukuran DAN pembanding cap-OS-vs-GPU-jenuh ` +
        `kehilangan datanya.\n`,
    ).toBe(true);
  });
});
