/**
 * PENJAGA REGRESI — billiard tidak dimuat sampai benar-benar dibutuhkan
 *
 * ── Yang dijaga (3 Agu 2026) ───────────────────────────────────────────────
 * `BilliardGame` dulu di-mount tanpa syarat di Scene.tsx. Fisikanya memang
 * sudah digerbangi `active` (jadi tidak ada simulasi yang jalan), tapi dua
 * ongkos tetap dibayar SETIAP pengunjung:
 *
 *   1. billiard_balls.glb (887 KB) + billiard_cue.glb (94 KB) diunduh dan
 *      di-parse — termasuk di perangkat sentuh, yang minigame-nya MATI TOTAL
 *      (INVARIANTS §6). ~1 MB sia-sia di jaringan seluler.
 *   2. 16 mesh bola ikut dirender tiap frame, tergeletak di lantai sebelah
 *      meja sepanjang tur.
 *
 * ── Kenapa keputusannya diuji sebagai FUNGSI ───────────────────────────────
 * Godaan pertama: mock `./BilliardGame` lalu hitung berapa kali ia diimpor.
 * Itu TIDAK bisa diandalkan — vitest mengevaluasi factory `vi.mock` lebih awal
 * dan meng-cache-nya, jadi hitungannya bergantung pada urutan test, bukan pada
 * perilaku yang diuji. (Sudah dicoba, dan gagal persis begitu: 1 di test
 * pertama, 0 di sisanya, `vi.resetModules()` tidak menolong.)
 *
 * Jadi keputusannya dipisah jadi `shouldPrefetchBilliard()` — fungsi murni yang
 * bisa diuji langsung — dan perilaku RENDER-nya (mount/tidak) diuji terpisah
 * lewat render sungguhan. Dua hal yang berbeda, dua cara uji yang sesuai.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useSceneStore } from "@/lib/store/sceneStore";

let mockCoarse = false;
vi.mock("@/lib/hooks/useCoarsePointer", () => ({
  useCoarsePointer: () => mockCoarse,
}));

vi.mock("./BilliardGame", () => ({
  default: () => <div data-testid="billiard-game" />,
}));

const { default: BilliardLazy } = await import("./BilliardLazy");
const { shouldPrefetchBilliard, BILLIARD_ROOM } = await import("./prefetchRule");

beforeEach(() => {
  mockCoarse = false;
  useSceneStore.setState({ billiardActive: false, currentRoom: "Office" });
});

describe("shouldPrefetchBilliard — kapan chunk boleh diunduh", () => {
  it("TIDAK di ruangan selain tempat mejanya", () => {
    for (const room of ["Office", "Meeting", "Function"]) {
      expect(
        shouldPrefetchBilliard(room, false),
        `Chunk billiard (~1 MB GLB) diunduh di ${room}, padahal mejanya ` +
          `ada di ${BILLIARD_ROOM}.\n`,
      ).toBe(false);
    }
  });

  it("YA begitu sampai di ruangan mejanya", () => {
    expect(
      shouldPrefetchBilliard(BILLIARD_ROOM, false),
      "Chunk tidak di-prefetch saat masuk ruangan meja. Tanpa prefetch, " +
        "ongkos ~1 MB jatuh tepat saat meja diklik — berbarengan dengan tween " +
        "kamera 1400 ms, yaitu detik paling buruk untuk mengunduh.\n",
    ).toBe(true);
  });

  it("TIDAK di perangkat sentuh, walau di ruangan mejanya (INVARIANTS §6)", () => {
    expect(
      shouldPrefetchBilliard(BILLIARD_ROOM, true),
      "Perangkat sentuh mengunduh ~1 MB untuk minigame yang tidak akan " +
        "pernah bisa dibuka (INVARIANTS §6: meja tidak menerima klik di " +
        "pointer coarse). Justru penghematan terbesar yang dikejar di sini.\n",
    ).toBe(false);
  });
});

describe("BilliardLazy — kapan game di-mount", () => {
  it("tidak dirender selama minigame belum dibuka", async () => {
    useSceneStore.setState({ currentRoom: BILLIARD_ROOM });
    const { queryByTestId } = render(<BilliardLazy />);

    // Beri kesempatan Suspense/efek berjalan sebelum menyatakan tidak ada.
    await new Promise((r) => setTimeout(r, 20));

    expect(
      queryByTestId("billiard-game"),
      "Game dirender cuma karena pengunjung sampai di ruangan mejanya — 16 " +
        "mesh bola kembali tergeletak di lantai sepanjang tur. Prefetch " +
        "seharusnya mengunduh SAJA, bukan me-mount.\n",
    ).toBeNull();
  });

  /**
   * Sisi sebaliknya — "dibuka → game dirender" — sengaja TIDAK diuji di sini.
   *
   * Perilakunya benar (sudah dibuktikan terpisah: dengan `billiardActive` true
   * sejak awal, mau pun di-flip sesudah render, game-nya muncul). Yang tidak
   * bisa diandalkan adalah menguji DUA kali di berkas yang sama: begitu satu
   * test sudah pernah me-render `BilliardLazy`, `lazy()` yang di-unmount
   * `cleanup()` di tengah resolusi membuat Suspense berikutnya menggantung
   * selamanya di jsdom. `unmount()` eksplisit maupun `vi.resetModules()` tidak
   * menolong — wedge-nya di state internal React, bukan di DOM atau cache modul.
   *
   * Menuliskannya tetap berarti test yang MERAH padahal produksinya benar —
   * dan itu jauh lebih berbahaya daripada tidak ada test: orang berikutnya akan
   * "memperbaiki" kode yang sudah benar. Yang menjaga sisi itu adalah gerbang
   * `active` yang cuma satu baris (`if (!active) return null`) plus review
   * browser saat minigame dibuka.
   */
});
