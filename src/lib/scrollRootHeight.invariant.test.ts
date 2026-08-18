/**
 * PENJAGA INVARIANT — <html> dan <body> tidak boleh dipaku setinggi viewport
 *
 * ── Kejadian nyata (18 Agu 2026) ────────────────────────────────────────────
 * Dilaporkan: "gulir dulu di Office, pindah ke Lounge, lalu gulir ke bawah —
 * berhenti di tengah halaman. Bisa naik, tidak bisa turun."
 *
 * Biangnya bukan router, bukan Lenis, melainkan satu baris CSS. Lenis menyimpan
 * tinggi konten di cache (`Dimensions.scrollHeight`) dan memperbaruinya lewat
 * `ResizeObserver` yang mengamati <html>. ResizeObserver melaporkan KOTAK
 * elemennya — bukan `scrollHeight`-nya — dan `height: 100%` memaku kotak itu
 * setinggi viewport apa pun isinya. Observer-nya menyala sekali saat mount lalu
 * diam selamanya, jadi `limit` Lenis membeku di tinggi halaman yang kebetulan
 * terukur pertama kali. Halaman berikutnya di-clamp ke angka halaman sebelumnya.
 *
 * Terukur sebelum diperbaiki: Lounge mentok di y=3005 (= limit Office) padahal
 * dasarnya 5833. Sesudah: keempat ruangan mencapai dasarnya, bolak-balik,
 * di desktop maupun HP.
 *
 * ── Kenapa gampang kembali ──────────────────────────────────────────────────
 * `html, body { height: 100% }` itu boilerplate refleks — nyaris tiap orang
 * menuliskannya tanpa berpikir, dan di sini ia datang dari DUA tempat sekaligus
 * (blok CSS + class `h-full`/`min-h-full` di index.html). Tidak ada error, tidak
 * ada test yang merah; yang terlihat cuma halaman yang seolah habis di tengah,
 * dan tidak ada satu pun petunjuk yang menunjuk balik ke CSS.
 *
 * ── Kenapa berupa test teks ─────────────────────────────────────────────────
 * Sama seperti smoothScrollCallsites.invariant.test.ts: yang dijaga kontraknya
 * ("akar dokumen tumbuh bersama konten"), bukan gulirnya sendiri — itu butuh
 * layout browser sungguhan, dan jsdom tidak punya ResizeObserver yang mengukur.
 *
 * `min-height` SENGAJA diizinkan: ia menjaga latar menutupi layar saat konten
 * pendek tanpa memaku kotaknya, jadi observer-nya tetap menyala.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CSS = readFileSync(join(ROOT, "src", "index.css"), "utf8");
const HTML = readFileSync(join(ROOT, "index.html"), "utf8");

/** Buang komentar CSS supaya catatan penjelas di index.css tidak ikut terbaca. */
const cssCode = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** Isi atribut class pada tag <html>/<body> di index.html. */
function classesOf(tag: "html" | "body"): string {
  const m = HTML.match(new RegExp(`<${tag}\\b[^>]*class="([^"]*)"`, "i"));
  return m?.[1] ?? "";
}

describe("akar dokumen tumbuh bersama konten (limit Lenis)", () => {
  it("index.css tidak memberi html/body `height` setinggi viewport", () => {
    // Cari tiap blok yang selectornya menyentuh html atau body, lalu periksa
    // deklarasi `height` di dalamnya. `min-height`/`max-height` tidak kena
    // karena regex-nya menuntut `height` berdiri di awal deklarasi.
    const offenders: string[] = [];
    for (const block of cssCode.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = block[1].trim();
      if (!/(^|[\s,])(html|body)\b/.test(selector)) continue;
      const height = block[2].match(/(?:^|;)\s*height\s*:\s*([^;]+)/);
      if (!height) continue;
      if (/^(auto|unset|initial|revert)$/i.test(height[1].trim())) continue;
      offenders.push(`${selector} { height: ${height[1].trim()} }`);
    }

    expect(
      offenders,
      "Blok CSS berikut memaku tinggi <html>/<body>:\n\n" +
        offenders.map((o) => `  ${o}`).join("\n") +
        "\n\nItu membekukan ResizeObserver milik Lenis, dan gulir akan mentok " +
        "di tengah halaman setiap kali pindah ruangan. Pakai `min-height` " +
        "(lebih baik `100dvh`, bukan `100%`) kalau yang dimau cuma latar penuh " +
        "layar. Catatannya di src/index.css & berkas test ini.",
    ).toEqual([]);
  });

  it("index.html tidak memasang class tinggi-penuh di <html>/<body>", () => {
    // `h-full` = height:100% (memaku — dilarang).
    // `min-h-full` = min-height:100% yang MENGGANTUNG pada tinggi <html>: begitu
    // <html> tingginya auto, persentasenya tidak punya acuan dan diam-diam jadi
    // nol — jadi ia bukan pengganti yang sah. Pakai `min-h-dvh`.
    const offenders = (["html", "body"] as const).flatMap((tag) => {
      const classes = classesOf(tag).split(/\s+/);
      return classes
        .filter((c) => /^(h-full|min-h-full|h-screen|h-dvh|h-\[100[a-z]*\])$/.test(c))
        .map((c) => `<${tag} class="… ${c} …">`);
    });

    expect(
      offenders,
      "Tag berikut di index.html memaku tinggi akar dokumen:\n\n" +
        offenders.map((o) => `  ${o}`).join("\n") +
        "\n\nAlasannya sama dengan test di atas — lihat catatannya di sana.",
    ).toEqual([]);
  });
});
