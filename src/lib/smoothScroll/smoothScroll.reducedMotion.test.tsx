/**
 * PENJAGA A11Y — prefers-reduced-motion tidak boleh dapat Lenis sama sekali.
 *
 * Berkas terpisah dari smoothScroll.test.tsx dengan sengaja: `useReducedMotion`
 * milik motion membaca matchMedia SEKALI lalu menyimpannya di level modul.
 * Kalau kedua kasus tinggal di satu berkas, yang dirender belakangan akan
 * memakai nilai milik yang duluan — dan test-nya lulus tanpa menguji apa pun.
 *
 * Yang dijaga: Lenis tidak dibuat lalu dimatikan, melainkan TIDAK DIBUAT.
 * Instance yang ada tetap memasang listener wheel/touch dan tetap menjalankan
 * loop-nya; "smooth scroll yang dimatikan" bukan hal yang sama dengan scroll
 * milik browser.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import SmoothScrollProvider from "./SmoothScrollProvider";

// Dipasang di scope modul: harus sudah berlaku sebelum render pertama, yaitu
// saat motion pertama kali membaca preferensinya.
window.matchMedia = ((query: string) => ({
  matches: /prefers-reduced-motion/.test(query),
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

const lenisMock = vi.hoisted(() => {
  const constructorOptions: Record<string, unknown>[] = [];
  class MockLenis {
    constructor(options: Record<string, unknown>) {
      constructorOptions.push(options);
    }
    raf() {}
    stop() {}
    start() {}
    destroy() {}
    scrollTo() {}
  }
  return { MockLenis, constructorOptions };
});

vi.mock("lenis", () => ({ default: lenisMock.MockLenis }));

describe("SmoothScrollProvider di bawah prefers-reduced-motion", () => {
  it("tidak menginisialisasi Lenis", () => {
    render(<SmoothScrollProvider>{null}</SmoothScrollProvider>);

    expect(
      lenisMock.constructorOptions,
      "Lenis tetap dibuat walau pengunjung meminta gerak dikurangi. Scroll " +
        "beringersia justru gerak yang paling sering memicu mual/vertigo, dan " +
        "instance yang 'di-stop' masih memasang listener wheel/touch.\n\n" +
        "Yang benar: jangan buat instance-nya, biarkan scroll milik browser.\n",
    ).toHaveLength(0);
  });
});
