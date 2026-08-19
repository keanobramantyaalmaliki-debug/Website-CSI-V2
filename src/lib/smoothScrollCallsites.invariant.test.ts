/**
 * PENJAGA INVARIANT — pemanggil scroll programatik lewat smoothScroll.ts
 *
 * ── Kenapa test ini ada ─────────────────────────────────────────────────────
 * 6 Agu, Lenis dipasang untuk momentum wheel/trackpad di desktop. Registry di
 * smoothScroll.ts (`scrollToTop`, `scrollToSection`) ada supaya scroll
 * programatik ikut memakai instance Lenis yang sedang aktif — bukan
 * `window.scrollTo`/`el.scrollIntoView` mentah, yang berjalan di jalur
 * berbeda dari rAF milik Lenis dan bikin dua sistem scroll berebut posisi.
 *
 * Berkas yang rawan lupa: siapa pun yang menambah pemanggilan scroll baru di
 * Navbar.tsx atau RoomRouteSync.tsx bisa dengan wajar menulis
 * `scrollIntoView` langsung seperti sebelum Lenis ada — tidak error, tidak
 * gagal typecheck, cuma bikin scroll itu terasa patah karena berebut dengan
 * Lenis di frame yang sama.
 *
 * ── Kenapa berupa test teks ──────────────────────────────────────────────────
 * Sama seperti coarsePointer.invariant.test.ts: yang dijaga kontrak
 * antar-file ("panggil lewat smoothScroll.ts"), bukan hasil scroll sungguhan
 * yang butuh browser nyata untuk dibuktikan.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");

const GUARDED_FILES = [
  "components/GridReveal.tsx",
  "components/Navbar.tsx",
  "routes/RoomRouteSync.tsx",
  "components/sections/DeploymentCta.tsx",
  "components/sections/Office.tsx",
] as const;

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/** Semua sumber di src/, tanpa berkas test — dipakai penjaga terakhir di bawah. */
function sourceFiles(dir = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) return [];
    return [relative(SRC, full)];
  });
}

describe("pemanggil scroll programatik lewat smoothScroll.ts", () => {
  it("tidak ada berkas yang dijaga punya scrollIntoView atau window.scrollTo telanjang", () => {
    const offenders = GUARDED_FILES.filter((path) => {
      const code = stripComments(readFileSync(join(SRC, path), "utf8"));
      return /\.scrollIntoView\s*\(/.test(code) || /window\.scrollTo\s*\(/.test(code);
    });

    expect(
      offenders,
      "Berkas berikut memanggil scroll DOM mentah, bukan lewat " +
        "scrollToTop()/scrollToSection() di src/lib/smoothScroll.ts:\n\n" +
        offenders.map((f) => `  • ${f}`).join("\n") +
        "\n\nScroll mentah berjalan di luar rAF Lenis dan berebut posisi " +
        "dengannya di frame yang sama.\n",
    ).toEqual([]);
  });

  /**
   * Kunci gulir lewat setScrollLocked(), JANGAN `body.style.overflow`.
   *
   * Navbar sempat punya versi sendiri: `document.body.style.overflow =
   * "hidden"` selama menu seluler terbuka. Kelihatan setara, dua-duanya salah:
   *
   *   • TIDAK mengunci apa pun. <html> punya `overflow-x: clip` (index.css),
   *     jadi yang diwariskan ke viewport adalah nilai <html>, bukan <body>.
   *     Terukur 18 Agu: sapuan jari selagi menu terbuka tetap menggeser
   *     halaman 2200 → 2803.
   *   • MELOMPATKAN halaman ke atas. `html, body { height: 100% }` bikin <body>
   *     setinggi satu layar sementara isinya 11.419px; `overflow: hidden`
   *     memotong luapannya, scrollHeight dokumen runtuh ke 852px, dan browser
   *     menjepit posisi gulir ke 0. Itulah bug "buka burger di tengah halaman,
   *     halaman balik ke 3D".
   *
   * `setScrollLocked` mengunci <html> — elemen yang benar-benar menggulir —
   * plus `lenis.stop()`, dan posisi gulirnya bertahan.
   */
  it("tidak ada berkas src yang mengunci gulir lewat body.style.overflow", () => {
    const offenders = sourceFiles().filter((path) => {
      const code = stripComments(readFileSync(join(SRC, path), "utf8"));
      return /document\.body\.style\.overflow/.test(code);
    });

    expect(
      offenders,
      "Berkas berikut mengunci gulir lewat <body>, bukan setScrollLocked() " +
        "di src/lib/smoothScroll.ts:\n\n" +
        offenders.map((f) => `  • ${f}`).join("\n") +
        "\n\n<body> bukan elemen yang menggulir di situs ini: kuncinya tidak " +
        "berlaku, dan efek sampingnya melompatkan halaman ke paling atas.\n",
    ).toEqual([]);
  });

  it("setiap berkas yang dijaga mengimpor helper dari smoothScroll.ts", () => {
    const offenders = GUARDED_FILES.filter((path) => {
      const code = stripComments(readFileSync(join(SRC, path), "utf8"));
      return !/from\s+["']@\/lib\/smoothScroll["']/.test(code);
    });

    expect(
      offenders,
      "Berkas berikut tidak lagi mengimpor dari @/lib/smoothScroll:\n\n" +
        offenders.map((f) => `  • ${f}`).join("\n") + "\n",
    ).toEqual([]);
  });
});
