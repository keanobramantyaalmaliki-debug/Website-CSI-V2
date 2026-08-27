import { describe, expect, it } from "vitest";
import { SHELL_BASE_PX, computeShellMax, initShellMax } from "./shellMax";

describe("computeShellMax", () => {
  it("monitor ≤1920 memakai lantai 1920 (perilaku plafon statis §4bg)", () => {
    expect(computeShellMax(1280)).toBe(1920); // MacBook looks-like
    expect(computeShellMax(1920)).toBe(1920); // AOC looks-like-1080
  });

  it("monitor >1920 full-bleed: plafon = lebar monitor", () => {
    expect(computeShellMax(2560)).toBe(2560); // QHD
    expect(computeShellMax(3440)).toBe(3440); // ultrawide
  });

  it("nilai tak waras (0/NaN/negatif) jatuh ke lantai 1920", () => {
    expect(computeShellMax(0)).toBe(SHELL_BASE_PX);
    expect(computeShellMax(NaN)).toBe(SHELL_BASE_PX);
    expect(computeShellMax(-1)).toBe(SHELL_BASE_PX);
  });
});

describe("initShellMax — capture-and-freeze", () => {
  /* Angka-angka skenario diambil dari PENGUKURAN Brave sungguhan 27 Agu:
     zoom mengubah screen.width & dpr secara resiprokal (1280×2 ↔ 2560×1),
     produknya (piksel fisik panel) konstan. */
  const makeWin = (screenW: number, screenH: number, dpr: number) => {
    const listeners = new Map<string, () => void>();
    const style = new Map<string, string>();
    const win = {
      screen: { width: screenW, height: screenH },
      devicePixelRatio: dpr,
      document: {
        documentElement: {
          style: { setProperty: (k: string, v: string) => style.set(k, v) },
        },
      },
      addEventListener: (ev: string, fn: () => void) => listeners.set(ev, fn),
      removeEventListener: (ev: string) => listeners.delete(ev),
    };
    return {
      win: win as unknown as Window,
      style,
      // simulasi: mutasi metrik lalu picu resize (urutan kejadian browser)
      resizeTo(w: number, h: number, d: number) {
        win.screen.width = w;
        win.screen.height = h;
        win.devicePixelRatio = d;
        listeners.get("resize")!();
      },
      listeners,
    };
  };

  it("capture saat init: QHD 100% → 2560px, monitor kecil → lantai 1920", () => {
    const qhd = makeWin(2560, 1440, 1);
    initShellMax(qhd.win);
    expect(qhd.style.get("--shell-max")).toBe("2560px");

    const mbp = makeWin(1280, 832, 2);
    initShellMax(mbp.win);
    expect(mbp.style.get("--shell-max")).toBe("1920px");
  });

  it("zoom-out MEMBEKUKAN plafon: screen membengkak tapi fisik konstan", () => {
    // QHD load 100% lalu Cmd±ke 50%: screen 2560→5120, dpr 1→0.5.
    const t = makeWin(2560, 1440, 1);
    initShellMax(t.win);
    t.resizeTo(5120, 2880, 0.5);
    expect(t.style.get("--shell-max")).toBe("2560px"); // beku, BUKAN 5120
  });

  it("zoom-in juga beku (tidak meracuni capture yang benar)", () => {
    // QHD lalu zoom 200%: screen 2560→1280, dpr 1→2. Tanpa freeze,
    // capture ulang di sini menurunkan plafon → gap balik saat ke 100%.
    const t = makeWin(2560, 1440, 1);
    initShellMax(t.win);
    t.resizeTo(1280, 720, 2);
    expect(t.style.get("--shell-max")).toBe("2560px");
  });

  it("drift pembulatan dpr pecahan (zoom 67%) tetap terbaca 'monitor sama'", () => {
    // AOC 100% (1920×2=3840 fisik) → zoom 67%: dpr 1,333, screen ~2883
    // → fisik 3843,7 (drift <1%) — jangan dianggap pindah monitor.
    const t = makeWin(1920, 1080, 2);
    initShellMax(t.win);
    t.resizeTo(2883, 1621, 1.3333);
    expect(t.style.get("--shell-max")).toBe("1920px");
  });

  it("pindah monitor (fisik berubah >2%) → capture ulang", () => {
    // MacBook (2560 fisik) → QHD 27\" (2560… beda TINGGI 1664 vs 1440).
    const t = makeWin(1280, 832, 2);
    initShellMax(t.win);
    expect(t.style.get("--shell-max")).toBe("1920px");
    t.resizeTo(2560, 1440, 1);
    expect(t.style.get("--shell-max")).toBe("2560px");
  });

  it("degradasi sadar: load SAAT sudah zoom-out → plafon menggembung sesi itu", () => {
    // QHD dengan zoom per-origin 50% sejak sebelum load: capture melihat
    // 5120. Terdokumentasi §4bh — sembuh saat load berikutnya di 100%.
    const t = makeWin(5120, 2880, 0.5);
    initShellMax(t.win);
    expect(t.style.get("--shell-max")).toBe("5120px");
  });

  it("pembersihnya melepas listener resize", () => {
    const t = makeWin(1280, 832, 2);
    const cleanup = initShellMax(t.win);
    expect(t.listeners.has("resize")).toBe(true);
    cleanup();
    expect(t.listeners.has("resize")).toBe(false);
  });
});
