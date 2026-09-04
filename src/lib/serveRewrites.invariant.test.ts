/**
 * PENJAGA INVARIANT — aturan SPA situs tidak boleh menelan `/admin`
 *
 * ── Kenapa ada berkas ini ───────────────────────────────────────────────────
 * Produksi menyajikan satu folder: pm2 menjalankan `serve dist/`, dan panel CMS
 * ikut tinggal di dalamnya (`dist/admin/`). Yang memisahkan keduanya cuma
 * `public/serve.json`, dan bentuk aturan situsnya di sana kelihatan aneh:
 *
 *     { "source": "/!(admin)",    "destination": "/index.html" }
 *     { "source": "/!(admin)/**", "destination": "/index.html" }
 *
 * Refleks siapa pun adalah "menyederhanakannya" jadi satu baris `**` — dan itu
 * merusak panel tanpa satu pun galat.
 *
 * ── Sebabnya, yang tidak kelihatan ──────────────────────────────────────────
 * `applyRewrites()` di serve-handler REKURSIF: begitu satu aturan cocok, aturan
 * itu dicoret lalu SISA aturannya diterapkan lagi pada hasilnya. Jadi dengan
 * `**` sebagai penutup, urutannya:
 *
 *     /admin/crew  →  /admin/index.html   (aturan panel, benar)
 *                  →  /index.html         (`**` menyambar hasilnya, rusak)
 *
 * Yang terlihat editor: membuka `csi2.wibudev.com/admin` malah dapat halaman
 * depan situs. Tidak ada 404, tidak ada log galat, tidak ada yang menunjuk
 * balik ke berkas ini.
 *
 * ── Kenapa extglob, bukan regex ─────────────────────────────────────────────
 * `serve` mencocokkan `source` dengan minimatch ATAU path-to-regexp 3.3.0.
 * Versi itu tidak mengenal negative lookahead: `"/:sisa((?!admin).*)"` bukan
 * cuma tidak jalan, ia MEMATIKAN prosesnya saat start dengan
 * "Invalid regular expression … Invalid group". Jadi penolakannya harus lewat
 * extglob minimatch, `!(admin)`.
 *
 * Dijaga sebagai test teks karena yang dijaga bentuk aturannya, bukan
 * perilaku server; perilakunya sendiri sudah dijalani
 * `scripts/probe-admin-path.mjs` di peramban sungguhan.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const KONFIG = JSON.parse(
  readFileSync(join(ROOT, "public", "serve.json"), "utf8"),
) as { rewrites?: { source: string; destination: string }[] };

const rewrites = KONFIG.rewrites ?? [];
const kePanel = rewrites.filter((r) => r.destination.startsWith("/admin/"));
const keSitus = rewrites.filter((r) => !r.destination.startsWith("/admin/"));

const PESAN =
  "\n\nLihat catatan panjang di atas berkas test ini: `serve` menerapkan sisa " +
  "aturan sekali lagi pada hasil rewrite, jadi penutup `**` akan membelokkan " +
  "`/admin/index.html` yang baru saja benar itu balik ke situs, dan panel CMS " +
  "hilang di produksi tanpa galat apa pun.";

describe("public/serve.json memisahkan situs dari panel admin", () => {
  it("`/admin` dan `/admin/**` diarahkan ke index panel", () => {
    const sumber = kePanel.map((r) => r.source);
    expect(sumber, `Aturan panel hilang.${PESAN}`).toEqual(
      expect.arrayContaining(["/admin", "/admin/**"]),
    );
    for (const r of kePanel) {
      expect(r.destination).toBe("/admin/index.html");
    }
  });

  it("aturan panel berdiri SEBELUM aturan situs", () => {
    const panelTerakhir = rewrites.findLastIndex((r) => kePanel.includes(r));
    const situsPertama = rewrites.findIndex((r) => keSitus.includes(r));
    expect(
      panelTerakhir,
      `Aturan situs mendahului aturan panel, jadi \`/admin\` tidak pernah ` +
        `sampai ke panelnya.${PESAN}`,
    ).toBeLessThan(situsPertama);
  });

  it("aturan situs mengecualikan /admin lewat extglob `!(admin)`", () => {
    const nakal = keSitus.filter((r) => !r.source.includes("!(admin)"));
    expect(
      nakal.map((r) => `${r.source} → ${r.destination}`),
      `Aturan situs berikut menyambar semua alamat, termasuk hasil rewrite ` +
        `panel:${PESAN}`,
    ).toEqual([]);
  });

  it("tidak ada `source` bergaya regex yang mematikan path-to-regexp 3.x", () => {
    const nakal = rewrites
      .map((r) => r.source)
      .filter((s) => s.includes("(?") || s.includes(":"));
    expect(
      nakal,
      "`source` berikut memakai sintaks path-to-regexp. Versi yang dipakai " +
        "`serve` (3.3.0) tidak mengenal lookahead dan MEMATIKAN proses saat " +
        "start. Pakai extglob minimatch.",
    ).toEqual([]);
  });
});
