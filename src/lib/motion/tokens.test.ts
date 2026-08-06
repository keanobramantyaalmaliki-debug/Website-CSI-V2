/**
 * Penjaga kurva tunggal.
 *
 * Menyatukan EASE ke satu modul hanya menghapus duplikat yang SUDAH ada; ia
 * tidak mencegah yang berikutnya. Menulis `const EASE = [0.16, 1, 0.3, 1]` di
 * berkas baru tetap kompilasi, tetap lolos test, dan tetap terlihat benar saat
 * ditinjau — persis begitu 22 salinan kemarin terbentuk. Test ini yang
 * menghentikannya, dengan memindai sumbernya langsung.
 *
 * Sekaligus menjaga sisi CSS-nya: `--ease-out` di index.css adalah angka yang
 * sama untuk transisi yang ditulis sebagai CSS. Dua tempat, satu angka — dan
 * tidak ada apa pun selain test ini yang memaksa keduanya sepakat.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EASE } from "./tokens";

const ROOT = resolve(process.cwd(), "src");

/** Berkas sumber yang BOLEH memuat kurvanya sebagai angka. */
const ALLOWED = new Set(["lib/motion/tokens.ts", "lib/motion/tokens.test.ts"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const FILES = sourceFiles(ROOT)
  .map((path) => ({ path: relative(ROOT, path), body: readFileSync(path, "utf8") }))
  .filter(({ path }) => !ALLOWED.has(path));

describe("token gerak", () => {
  it("sepakat dengan --ease-out di index.css", () => {
    const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
    const declared = /--ease-out:\s*cubic-bezier\(([^)]*)\)/.exec(css);

    expect(
      declared,
      "Tidak ada `--ease-out: cubic-bezier(...)` di index.css. Transisi yang " +
        "ditulis sebagai CSS kehilangan kurvanya.",
    ).not.toBeNull();
    expect(
      declared![1].split(",").map((n) => Number(n.trim())),
      "Kurva CSS dan kurva motion sudah berbeda. Section yang beranimasi " +
        "lewat motion dan yang lewat transisi CSS akan bergerak dengan " +
        "bentuk yang tidak sama, dan bedanya terlalu halus untuk terlihat " +
        "saat ditinjau.\n",
    ).toEqual(EASE);
  });

  it("tidak ada berkas lain yang mendeklarasikan EASE sendiri", () => {
    const offenders = FILES.filter(({ body }) => /\bconst\s+EASE\b/.test(body));

    expect(
      offenders.map((f) => f.path),
      "Ada berkas yang mendeklarasikan EASE-nya sendiri lagi. Nilainya " +
        'mungkin masih sama hari ini, tapi tidak ada yang menjaganya tetap ' +
        "sama besok — satu suntingan di satu berkas akan lolos tanpa jejak. " +
        'Impor dari "@/lib/motion/tokens".\n',
    ).toEqual([]);
  });

  it("tidak ada kurva yang sama ditulis ulang sebagai angka", () => {
    // Mencari bentuk tuple maupun bentuk CSS-nya. Menyalin angkanya lolos dari
    // penjaga di atas (namanya bisa apa saja) tapi akibatnya sama saja.
    const curve = /\[\s*0\.16\s*,\s*1\s*,\s*0\.3\s*,\s*1\s*\]|cubic-bezier\(\s*0\.16\s*,/;
    const offenders = FILES.filter(({ body }) => curve.test(body));

    expect(
      offenders.map((f) => f.path),
      "Kurvanya ditulis ulang sebagai angka. Untuk motion, impor EASE dari " +
        '"@/lib/motion/tokens"; untuk transisi yang ditulis sebagai CSS, ' +
        "pakai `var(--ease-out)`.\n",
    ).toEqual([]);
  });
});
