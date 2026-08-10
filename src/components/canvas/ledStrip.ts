/**
 * Identitas material LED strip lantai — satu tempat, dipakai bersama.
 *
 * Berkas sekecil ini punya alasan yang cukup besar. Dua tempat perlu mengenali
 * material yang sama (Office.tsx menyetel emissive-nya, LedBreath.tsx
 * menganimasikannya), dan sepanjang keduanya menyimpan aturan pencocokannya
 * sendiri, keduanya bisa menyimpang tanpa ada yang tahu.
 */

/** Nama material di Blender. Bukan nama yang sampai ke three — lihat di bawah. */
export const LED_MATERIAL = "M_LEDStrip";

/**
 * Apakah material ini LED strip lantai — TAHAN akhiran exporter.
 *
 * ⚠️ Jangan pernah membandingkan `mat.name === LED_MATERIAL`. Nama material di
 * GLB bukan nama Blender-nya: exporter glTF menempelkan nama mesh pemakainya,
 * jadi yang benar-benar sampai ke three adalah
 *
 *     "M_LEDStrip__MG_Office_M_LEDStrip"
 *
 * Perbandingan sama-dengan karenanya SELALU meleset, dan melesetnya tanpa suara
 * — tidak ada error, materialnya cuma tidak pernah tersentuh. Itu yang terjadi
 * pada FIX 4 di Office.tsx: emissive override-nya tidak pernah kena sasaran dan
 * strip berjalan pada nilai GLB, bukan nilai yang tertulis di konstanta.
 * (Terukur 10 Agu 2026 lewat traverse di halaman hidup: emissiveIntensity = 8.)
 *
 * Kenapa prefix + "__" dan bukan /LED/i: di GLB yang sama ada
 * `MR_MicPod_LED__MG_MeetingWest_MR_MicPod_LED` — LED mic pod meeting room.
 * Pencocokan longgar akan ikut menyeretnya bernapas bersama lantai office.
 */
export function isLedStripMaterial(m: { name: string }): boolean {
  return m.name === LED_MATERIAL || m.name.startsWith(`${LED_MATERIAL}__`);
}
