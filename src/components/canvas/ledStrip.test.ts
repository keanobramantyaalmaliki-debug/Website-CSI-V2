/**
 * Penjaga pencocokan nama material LED strip.
 *
 * Ada karena bug yang persis begini sudah pernah terjadi dan bertahan lama:
 * FIX 4 di Office.tsx membandingkan `mat.name === "M_LEDStrip"` sementara nama
 * yang benar-benar ada di GLB adalah "M_LEDStrip__MG_Office_M_LEDStrip"
 * (exporter glTF menempelkan nama mesh pemakainya). Perbandingannya meleset
 * setiap kali, override emissive-nya tidak pernah jalan, dan tidak ada satu pun
 * gejala — tidak ada error, tidak ada layar hitam, cuma angka di kode yang tidak
 * ada hubungannya dengan angka di layar.
 *
 * Dua sisi yang dijaga di sini, dan keduanya penting:
 *   1. Nama BERAKHIRAN exporter harus kena. Ini yang dulu meleset.
 *   2. `MR_MicPod_LED__…` (LED mic pod meeting room) TIDAK boleh kena. Godaan
 *      "ya sudah pakai /LED/i saja" akan menyeret benda itu ikut bernapas
 *      bersama lantai office, di ruangan yang berbeda.
 */
import { describe, it, expect } from "vitest";
import { LED_MATERIAL, isLedStripMaterial } from "./ledStrip";

describe("isLedStripMaterial", () => {
  it("kena pada nama polos maupun nama berakhiran mesh dari exporter", () => {
    expect(isLedStripMaterial({ name: LED_MATERIAL })).toBe(true);
    // Nama sebenarnya di GLB per 10 Agu 2026 — dibaca dari scene yang hidup.
    expect(
      isLedStripMaterial({ name: "M_LEDStrip__MG_Office_M_LEDStrip" }),
    ).toBe(true);
  });

  it("tidak menyeret LED lain yang kebetulan sekamar di GLB", () => {
    expect(
      isLedStripMaterial({
        name: "MR_MicPod_LED__MG_MeetingWest_MR_MicPod_LED",
      }),
    ).toBe(false);
    // Awalan yang mirip tapi bukan material yang sama: dipisah oleh "__",
    // jadi "M_LEDStripB" bukan varian mesh dari "M_LEDStrip".
    expect(isLedStripMaterial({ name: "M_LEDStripB" })).toBe(false);
    expect(isLedStripMaterial({ name: "M_Glass" })).toBe(false);
  });
});
