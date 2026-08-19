/**
 * Cap 30 fps idle (renderPace.ts + IdleFrameCap.tsx) — dua lapis penjagaan:
 *
 * 1. Unit test logika shouldDrawThisTick — terutama daftar kondisi yang
 *    MEMAKSA gambar tiap tick. Yang paling penting pendingRoom: kontrak
 *    frameTick.ts ("markFrame = frame yang tergambar", dipakai GridReveal
 *    untuk mengangkat tirai) hanya sah selama tidak ada tick yang di-skip
 *    ketika pendingRoom aktif. Kalau test itu merah, tirai GridReveal bisa
 *    terangkat di atas frame basi.
 *
 * 2. Pemeriksaan teks — pola yang sama dengan frameloop.invariant.test.ts,
 *    dan alasannya sama: kontraknya ANTAR-FILE. Cap ini hanya benar kalau
 *    penggerak animasi yang tidak terlihat oleh store (tween kamera, sapuan
 *    reveal awal) menandai dirinya lewat markSceneActivity. Panggilan itu
 *    satu baris di file yang panjang — persis jenis baris yang hilang
 *    diam-diam saat resolusi konflik merge (sudah dua kali kejadian, lihat
 *    INVARIANTS.md §1 & §3).
 */
import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  markSceneActivity,
  shouldDrawThisTick,
  resetPace,
} from "./renderPace";
import { useSceneStore } from "@/lib/store/sceneStore";

const CANVAS_DIR = dirname(fileURLToPath(import.meta.url));

/** Buang komentar — file di folder ini menyebut nama fungsi justru saat
 *  menjelaskan kenapa sesuatu TIDAK dipakai. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/** Kondisi idle murni: scene siap, tidak ada transisi, tidak ada billiard. */
function makeIdle() {
  useSceneStore.setState({
    sceneReady: true,
    pendingRoom: null,
    billiardActive: false,
  });
}

describe("shouldDrawThisTick", () => {
  beforeEach(() => {
    resetPace();
    makeIdle();
  });

  it("idle: menggambar tepat 1 dari tiap 2 tick", () => {
    const draws = [1, 2, 3, 4, 5, 6].map((i) => shouldDrawThisTick(100_000 + i));
    expect(draws.filter(Boolean)).toHaveLength(3);
    // Berselang-seling, bukan menumpuk: [skip, draw, skip, draw, ...]
    expect(draws).toEqual([false, true, false, true, false, true]);
  });

  it("aktivitas < grace memaksa gambar tiap tick", () => {
    markSceneActivity(100_000);
    const draws = [1, 2, 3, 4].map((i) => shouldDrawThisTick(100_000 + i));
    expect(draws).toEqual([true, true, true, true]);
  });

  it("aktivitas kedaluwarsa (> grace) kembali ke selang-seling", () => {
    markSceneActivity(100_000);
    const draws = [1, 2, 3, 4].map((i) =>
      shouldDrawThisTick(100_000 + 5_000 + i),
    );
    expect(draws.filter(Boolean)).toHaveLength(2);
  });

  it("pendingRoom memaksa gambar tiap tick — kontrak frameTick/GridReveal", () => {
    useSceneStore.setState({ pendingRoom: "Meeting" });
    const draws = [1, 2, 3, 4].map((i) => shouldDrawThisTick(100_000 + i));
    expect(draws).toEqual([true, true, true, true]);
  });

  it("!sceneReady memaksa gambar tiap tick — sinyal loader (INVARIANTS §3)", () => {
    useSceneStore.setState({ sceneReady: false });
    const draws = [1, 2, 3, 4].map((i) => shouldDrawThisTick(100_000 + i));
    expect(draws).toEqual([true, true, true, true]);
  });

  it("billiardActive memaksa gambar tiap tick — bola tanpa gerakan kamera", () => {
    useSceneStore.setState({ billiardActive: true });
    const draws = [1, 2, 3, 4].map((i) => shouldDrawThisTick(100_000 + i));
    expect(draws).toEqual([true, true, true, true]);
  });
});

describe("penanda aktivitas tetap tersambung (pemeriksaan teks)", () => {
  it.each([
    // Tween & parallax: satu-satunya cara cap tahu kamera sedang bergerak.
    // Tanpa ini perpindahan ruangan 1400 ms turun ke 30 fps di tengah jalan.
    "CameraController.tsx",
    // Sapuan reveal awal berjalan dengan kamera & kursor diam — tanpa
    // penanda sendiri ia tersapu 30 fps, babak pembuka jadi bertangga.
    "Office.tsx",
  ])("%s memanggil markSceneActivity", (file) => {
    const code = stripComments(readFileSync(join(CANVAS_DIR, file), "utf8"));
    expect(
      code.includes("markSceneActivity("),
      `${file} tidak lagi memanggil markSceneActivity(). Cap 30 fps idle ` +
        `(renderPace.ts) menganggap scene diam dan mulai melewati separuh ` +
        `frame justru saat animasinya berjalan. Kalau cap-nya memang sengaja ` +
        `dicabut, buang renderPace.ts + IdleFrameCap.tsx + test ini dalam ` +
        `commit yang sama.\n`,
    ).toBe(true);
  });

  it("Scene.tsx me-mount IdleFrameCap di dalam EffectComposer", () => {
    const scene = stripComments(
      readFileSync(join(CANVAS_DIR, "Scene.tsx"), "utf8"),
    );
    expect(
      scene.includes("<IdleFrameCap"),
      `Scene.tsx tidak lagi me-mount <IdleFrameCap/>. Tanpa itu composer ` +
        `merender tiap tick rAF selamanya dan cap 30 fps idle mati diam-diam ` +
        `— gejalanya kembali persis seperti laporan Safari 19 Agu (fps drop ` +
        `di hero, scene mepet vsync tanpa headroom).\n`,
    ).toBe(true);
  });
});
