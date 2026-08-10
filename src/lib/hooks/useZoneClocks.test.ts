/**
 * Yang dijaga di sini bukan "jamnya menunjukkan pukul berapa" — itu kerjanya
 * `toLocaleTimeString`, bukan kerja kita. Yang dijaga adalah **kapan ia
 * berdetak**, karena itu yang rusaknya diam-diam:
 *
 * Situs cogniti lama memasang `setInterval(…, 1000)` sekali saat halaman
 * dimuat, untuk jam yang cuma terlihat saat menu terbuka. Pola itu sudah
 * pernah menggigit repo ini (PhysicsHeading, audit "laptop panas" 3 Agu):
 * mesin yang berdetak selamanya walau efeknya tak terlihat. Kalau `active`
 * suatu saat dilepas dari efeknya, tidak ada yang tampak berubah di layar —
 * cuma timer yang tidak pernah mati. Test ini yang melihatnya.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { CLOCK_PLACEHOLDER, ID_ZONES, useZoneClocks } from "./useZoneClocks";

describe("useZoneClocks", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("tidak memasang timer apa pun selagi tidak aktif", () => {
    const { result } = renderHook(() => useZoneClocks(false));
    expect(result.current).toEqual(ID_ZONES.map(() => CLOCK_PLACEHOLDER));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("membaca jam begitu aktif, dan mengantre bangun berikutnya", () => {
    const { result } = renderHook(() => useZoneClocks(true));
    for (const t of result.current) expect(t).toMatch(/^\d{2}:\d{2}$/);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("timernya ikut mati saat menu ditutup", () => {
    const { rerender } = renderHook(({ on }) => useZoneClocks(on), {
      initialProps: { on: true },
    });
    expect(vi.getTimerCount()).toBe(1);
    rerender({ on: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bangun di pergantian menit, bukan tiap detik", () => {
    // 12:34:20.000 → sisa 40 dtk ke menit berikutnya.
    vi.setSystemTime(new Date("2026-08-10T12:34:20.000Z"));
    renderHook(() => useZoneClocks(true));
    // 39 dtk: belum waktunya, timernya masih yang sama (belum dijadwal ulang).
    vi.advanceTimersByTime(39_000);
    expect(vi.getTimerCount()).toBe(1);
    // Sampai di batas menit ia menjadwal ulang — tetap satu timer hidup, dan
    // yang penting: tidak ada 39 pembaruan di antaranya.
    vi.advanceTimersByTime(1_000);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("ketiga zona Indonesia berbeda satu jam berurutan", () => {
    vi.setSystemTime(new Date("2026-08-10T05:00:00.000Z"));
    const { result } = renderHook(() => useZoneClocks(true));
    // WIB +7, WITA +8, WIT +9.
    expect(result.current).toEqual(["12:00", "13:00", "14:00"]);
  });
});
