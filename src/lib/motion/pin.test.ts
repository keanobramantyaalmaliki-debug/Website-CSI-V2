/**
 * Penjaga hitungan pin.
 *
 * Yang diuji di sini cuma satu hal, tapi hal itulah yang sudah dua kali salah
 * di Hero: tinggi track dan titik lepas pin harus tetap satu sama lain. Karena
 * `trackHeight` menurunkan yang satu dari yang lain, satu-satunya cara ia bisa
 * salah adalah kalau rumusnya sendiri melenceng — jadi test ini menutup
 * lingkarannya: hitung track dari rasio, lalu hitung rasio dari track itu.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_UNPIN_AT, trackHeight, unpinRatio } from "./pin";

/** `calc(100dvh * 2)` → 2. */
function factorOf(css: string): number {
  const match = /^calc\(.+ \* ([\d.]+)\)$/.exec(css);
  if (!match) throw new Error(`Bentuk tinggi track tak dikenali: "${css}"`);
  return Number(match[1]);
}

describe("hitungan pin", () => {
  it("bawaannya membuat track dua kali tinggi anak sticky-nya", () => {
    expect(trackHeight("100dvh", DEFAULT_UNPIN_AT)).toBe("calc(100dvh * 2)");
  });

  it("mempertahankan satuan apa pun yang diberikan", () => {
    expect(trackHeight("640px", 0.5)).toBe("calc(640px * 2)");
    expect(trackHeight("70dvh", 0.5)).toBe("calc(70dvh * 2)");
  });

  it("track yang dihasilkan benar-benar lepas pin di rasio yang diminta", () => {
    // Termasuk 0,444 milik Hero, yang justru bukan angka bulat.
    for (const unpinAt of [0.25, 0.4, 0.444, DEFAULT_UNPIN_AT, 0.75, 0.9]) {
      const sticky = 100;
      const track = sticky * factorOf(trackHeight(`${sticky}dvh`, unpinAt));

      expect(
        unpinRatio({ track, sticky }),
        `Track hasil trackHeight(..., ${unpinAt}) lepas pin di rasio yang ` +
          `berbeda dari yang diminta. Gerakan yang dipetakan ke [0, 1] akan ` +
          `selesai di titik yang salah — sebagian berjalan setelah isinya ` +
          `lepas dan ikut menggulir.\n`,
      ).toBeCloseTo(unpinAt, 5);
    }
  });

  it("menolak titik lepas pin yang tidak masuk akal", () => {
    // Diam-diam menerima 0 berarti track setinggi anaknya: tidak ada yang
    // ditahan sama sekali, tapi pemanggilnya tetap memetakan gerak ke [0, 1]
    // dan tidak ada yang terlihat salah sampai dibuka di browser.
    for (const bad of [0, 1, -0.2, 1.5, Number.NaN]) {
      expect(() => trackHeight("100dvh", bad)).toThrow(RangeError);
    }
  });
});
