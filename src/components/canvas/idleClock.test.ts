/**
 * Penjaga jam idle bersama.
 *
 * Tiga hal yang diuji di sini semuanya rusak DIAM-DIAM kalau salah — tidak ada
 * error, cuma efek idle yang menyala di waktu yang salah, dan cuma pada
 * pengunjung yang kebetulan menunggu cukup lama untuk melihatnya:
 *
 *   1. Listener DOM tetap SATU set berapa pun jumlah pemakainya. Kalau tiap
 *      pemakai memasang set sendiri, ongkosnya jatuh di pointermove — jalur
 *      terpanas yang ada di aplikasi ini.
 *   2. Pemasang KEDUA tidak boleh me-reset jam. Layar tidur di-mount belakangan
 *      (di dalam Office), dan kalau mount-nya nge-bump, hitungan idle milik
 *      glitch karakter mundur ke nol tanpa ada input apa pun.
 *   3. useIdleFlag bangun SEKETIKA, bukan pada polling berikutnya.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { createElement } from "react";

import {
  IDLE_MS,
  bumpIdleClock,
  idleFor,
  useIdleClock,
  useIdleFlag,
} from "./idleClock";

/** Jam palsu supaya "45 detik berlalu" tidak butuh 45 detik. performance.now
 *  di-stub terpisah dari vi.useFakeTimers: kode yang diuji membaca keduanya. */
let now = 0;
const advance = (ms: number) => {
  now += ms;
  vi.advanceTimersByTime(ms);
};

beforeEach(() => {
  vi.useFakeTimers();
  now = 1_000_000; // bukan 0 — supaya inisialisasi module-level ikut teruji
  vi.spyOn(performance, "now").mockImplementation(() => now);
  bumpIdleClock();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function Consumer() {
  useIdleClock();
  return null;
}

/**
 * Nama-nama event yang tercatat di sebuah spy addEventListener.
 *
 * Lewat cast: tsconfig proyek ini ikut memuat lib WebWorker (loader isometrik
 * berjalan di Web Worker), jadi `window.addEventListener` punya overload
 * DedicatedWorkerGlobalScope dan TypeScript memilih yang itu — argumen
 * pertamanya lalu dianggap tidak mungkin bernilai "pointermove".
 */
function typesOf(spy: { mock: { calls: unknown[][] } }): string[] {
  return spy.mock.calls.map((c) => String(c[0]));
}

describe("idleClock", () => {
  it("idleFor tumbuh mengikuti waktu dan kembali nol saat ada input", () => {
    render(createElement(Consumer));
    advance(5000);
    expect(idleFor()).toBe(5000);

    act(() => {
      window.dispatchEvent(new Event("pointermove"));
    });
    expect(idleFor()).toBe(0);
  });

  it("listener DOM cuma satu set meski dipakai beberapa komponen", () => {
    const add = vi.spyOn(window, "addEventListener");
    const view = render(
      createElement("div", null, [
        createElement(Consumer, { key: "a" }),
        createElement(Consumer, { key: "b" }),
        createElement(Consumer, { key: "c" }),
      ]),
    );

    expect(typesOf(add)).toEqual(
      expect.arrayContaining(["pointermove"]),
    );
    expect(typesOf(add).filter((t) => t === "pointermove")).toHaveLength(1);

    // Dan dilepas hanya setelah pemakai TERAKHIR pergi.
    const remove = vi.spyOn(window, "removeEventListener");
    view.unmount();
    expect(typesOf(remove).filter((t) => t === "pointermove")).toHaveLength(1);
  });

  it("pemakai yang mount belakangan TIDAK me-reset jam yang sudah berjalan", () => {
    const first = render(createElement(Consumer));
    advance(6000);
    expect(idleFor()).toBe(6000);

    // Pemakai kedua datang (mis. layar tidur ikut ter-mount).
    render(createElement(Consumer));
    expect(idleFor()).toBe(6000);

    first.unmount();
  });
});

function Flag({ threshold, seen }: { threshold: number; seen: boolean[] }) {
  seen.push(useIdleFlag(threshold));
  return null;
}

describe("useIdleFlag", () => {
  it("menyala setelah ambang terlewat, padam seketika pada input pertama", () => {
    const seen: boolean[] = [];
    render(createElement(Flag, { threshold: IDLE_MS, seen }));
    expect(seen.at(-1)).toBe(false);

    // Belum sampai ambang: masih terjaga meski polling sudah berjalan.
    act(() => advance(IDLE_MS - 1500));
    expect(seen.at(-1)).toBe(false);

    act(() => advance(2000));
    expect(seen.at(-1)).toBe(true);

    // Bangun tanpa menunggu polling berikutnya — nol waktu berlalu.
    act(() => {
      window.dispatchEvent(new Event("pointermove"));
    });
    expect(seen.at(-1)).toBe(false);
  });

  it("ambang yang berbeda tidak saling menyeret", () => {
    const short: boolean[] = [];
    const long: boolean[] = [];
    render(
      createElement("div", null, [
        createElement(Flag, { key: "s", threshold: 8000, seen: short }),
        createElement(Flag, { key: "l", threshold: 45000, seen: long }),
      ]),
    );

    act(() => advance(10000));
    expect(short.at(-1)).toBe(true);
    expect(long.at(-1)).toBe(false);

    act(() => advance(40000));
    expect(long.at(-1)).toBe(true);
  });
});
