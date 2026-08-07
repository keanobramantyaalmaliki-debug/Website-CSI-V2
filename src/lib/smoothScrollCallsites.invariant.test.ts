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
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");

const GUARDED_FILES = [
  "components/Navbar.tsx",
  "routes/RoomRouteSync.tsx",
  "components/sections/DeploymentCta.tsx",
] as const;

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
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
